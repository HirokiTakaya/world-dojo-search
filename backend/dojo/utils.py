"""
utils.py – Refactored on 2025-04-23 to prevent duplicate Google API calls, share sessions,
remove unnecessary Playwright, and ensure backend search works correctly.
"""
import asyncio
import hashlib
import logging
import time
from typing import Dict, List, Optional, Set

from aiohttp import ClientSession, ClientTimeout
from asgiref.sync import async_to_sync
from bs4 import BeautifulSoup
from django.core.cache import cache
from django.conf import settings
from playwright.async_api import async_playwright

GOOGLE_API_KEY = settings.GOOGLE_API_KEY
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)
logger.debug(f"Loaded GOOGLE_API_KEY: {GOOGLE_API_KEY}")

# Rate limiting and cache durations
RATE_LIMIT_MS = 400            # Google recommends ~2.5 QPS
SHORT_CACHE_SEC = 30           # TextSearch/NearbySearch caching window
DETAIL_CACHE_SEC = 60 * 60 * 24  # 24h for PlaceDetails

# ----------------------------------------------------------------------------
# Keyword lists
# ----------------------------------------------------------------------------
KEYWORDS_LIST = [
    "brazilian jiu jitsu",
    "bjj",
    "grappling",
    "jiujitsu",
    "柔術",
]
FORCE_KEYWORDS = [
    "Spartacus Gym",
    "Advantage Fitness",
    "West Vancouver Martial Arts",
]

# ----------------------------------------------------------------------------
# Helper for cache keys: include HTTP method to avoid collisions (#1)
# ----------------------------------------------------------------------------
def generate_cache_key(prefix: str, method: str, url: str) -> str:
    hashed = hashlib.md5(f"{method}:{url}".encode('utf-8')).hexdigest()
    return f"{prefix}_{hashed}"

# ----------------------------------------------------------------------------
# TextSearch: fetch place_ids, dedupe via cache (#3)
# ----------------------------------------------------------------------------
async def fetch_textsearch_place_ids(
    keyword: str,
    location_name: str,
    api_key: str,
    session: ClientSession,
    max_pages: int = 5,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: int = 30000,
) -> Set[str]:
    place_ids: Set[str] = set()
    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {"query": f"{keyword} in {location_name}", "key": api_key}
    if lat is not None and lng is not None:
        params.update({"location": f"{lat},{lng}", "radius": radius})

    page = 0
    while page < max_pages:
        async with session.get(base_url, params=params) as resp:
            url = str(resp.url)
            data = await resp.json()
            status = data.get("status")
            # ← ここで飛んだ URL とステータス、結果数をログに出す
            logger.debug(f"[TextSearch] URL={url}")
            logger.debug(f"[TextSearch] status={status}, results={len(data.get('results', []))}")

            if status not in ("OK", "ZERO_RESULTS"):
                logger.error(f"TextSearch API error: status={status}, url={url}")
                break

            for r in data.get("results", []):
                pid = r.get("place_id")
                if pid:
                    place_ids.add(pid)

            token = data.get("next_page_token")
            if not token:
                break

            params = {"pagetoken": token, "key": api_key}
            page += 1
            await asyncio.sleep(2)
            await asyncio.sleep(RATE_LIMIT_MS / 1000)

    logger.debug(f"[TextSearch] キーワード『{keyword}』→ 見つかった place_ids: {place_ids}")
    return place_ids

# ----------------------------------------------------------------------------
# Place Details: reuse a shared session (#2)
# ----------------------------------------------------------------------------
async def fetch_place_details_async(
    place_id: str,
    api_key: str,
    session: ClientSession,
) -> Optional[Dict]:
    cache_key = generate_cache_key("details", "GET", place_id)
    cached = cache.get(cache_key)
    if cached:
        return cached
    fields = \
        "name,formatted_address,geometry/location,opening_hours,website,rating,user_ratings_total,reviews"
    url = (
        f"https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={place_id}&fields={fields}&key={api_key}"
    )
    async with session.get(url) as resp:
        data = await resp.json()
        if data.get("status") != "OK":
            logger.error(f"PlaceDetails error: {data.get('status')} for {place_id}")
            return None
        result = data.get("result", {})
        loc = result.get("geometry", {}).get("location", {})
        detail = {
            "name": result.get("name"),
            "address": result.get("formatted_address"),
            "latitude": loc.get("lat"),
            "longitude": loc.get("lng"),
            "hours": result.get("opening_hours", {}).get("weekday_text", []),
            "website": result.get("website"),
            "place_id": place_id,
            "rating": result.get("rating"),
            "user_ratings_total": result.get("user_ratings_total"),
            "reviews": result.get("reviews", []),
        }
        cache.set(cache_key, detail, DETAIL_CACHE_SEC)
        return detail

# ----------------------------------------------------------------------------
# Instagram Link: support both static fetch and Playwright dynamic fetch (#2)
# ----------------------------------------------------------------------------
async def fetch_instagram_link_async(
    website: str,
    session: ClientSession,
) -> Optional[str]:
    if not website:
        return None
    cache_key = generate_cache_key("insta", "GET", website)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # 1) Try static fetch via aiohttp + BeautifulSoup
    try:
        async with session.get(website, headers={"User-Agent": "Mozilla/5.0"}) as resp:
            if resp.status == 200:
                text = await resp.text()
                soup = BeautifulSoup(text, 'html.parser')
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if 'instagram.com' in href:
                        cache.set(cache_key, href, DETAIL_CACHE_SEC)
                        return href
    except Exception as e:
        logger.debug(f"Static fetch failed, will try Playwright: {e}")

    # 2) Fallback to Playwright for dynamic pages
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(website, timeout=10000)
            content = await page.content()
            await browser.close()
            soup = BeautifulSoup(content, 'html.parser')
            for a in soup.find_all('a', href=True):
                href = a['href']
                if 'instagram.com' in href:
                    cache.set(cache_key, href, DETAIL_CACHE_SEC)
                    return href
    except Exception as e:
        logger.error(f"Playwright dynamic fetch failed for {website}: {e}")

    # No link found
    cache.set(cache_key, None, DETAIL_CACHE_SEC)
    return None

# ----------------------------------------------------------------------------
# Main TextSearch to fetch dojo data
# ----------------------------------------------------------------------------
async def fetch_dojo_data_async(
    query: str,
    api_key: str,
    max_pages: int = 5,
) -> Dict[str, List[Dict]]:
    # 検索開始時のクエリをログ
    logger.debug(f"[fetch_dojo_data_async] 検索クエリ = {query!r}")

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is missing")

    place_ids: Set[str] = set()
    timeout = ClientTimeout(total=15)

    async with ClientSession(timeout=timeout) as session:
        # 1. 通常キーワードでの TextSearch
        tasks = [
            fetch_textsearch_place_ids(kw, query, api_key, session, max_pages)
            for kw in KEYWORDS_LIST
        ]
        normal_results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in normal_results:
            if isinstance(r, set):
                place_ids.update(r)
            else:
                logger.error(f"[fetch_dojo_data_async] TextSearch error (normal): {r}")

        # 2. 強制キーワードでの TextSearch
        tasks = [
            fetch_textsearch_place_ids(fkw, query, api_key, session, max_pages)
            for fkw in FORCE_KEYWORDS
        ]
        force_results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in force_results:
            if isinstance(r, set):
                place_ids.update(r)
            else:
                logger.error(f"[fetch_dojo_data_async] TextSearch error (force): {r}")

        # 集まった place_ids をログ
        logger.debug(f"[fetch_dojo_data_async] 全キーワードで集まった place_ids = {place_ids!r}")

        # 3. Place Details を非同期で取得
        details: List[Dict] = []
        fetched = cache.get("fetched_pids", set())
        detail_tasks = []

        for pid in place_ids:
            if pid not in fetched:
                detail_tasks.append(fetch_place_details_async(pid, api_key, session))
                fetched.add(pid)

        cache.set("fetched_pids", fetched, DETAIL_CACHE_SEC)
        detail_results = await asyncio.gather(*detail_tasks, return_exceptions=True)

        # 取得した詳細オブジェクト数をログ
        logger.debug(f"[fetch_dojo_data_async] 取得した詳細オブジェクト数 = {len(detail_results)}")

        for d in detail_results:
            if isinstance(d, dict):
                details.append(d)
            else:
                logger.error(f"[fetch_dojo_data_async] PlaceDetails error: {d}")

    return {"dojos": details}

# ----------------------------------------------------------------------------
# NearbySearch variant
# ----------------------------------------------------------------------------
async def fetch_dojo_data_nearby_async(
    lat: float,
    lng: float,
    radius: int,
    api_key: str,
    max_pages: int = 3,
) -> Dict[str, List[Dict]]:
    logger.debug(f"NearbySearch fetch for: {lat},{lng} r={radius}")
    if not api_key:
        return {"dojos": []}
    place_ids: Set[str] = set()
    timeout = ClientTimeout(total=15)
    async with ClientSession(timeout=timeout) as session:
        # all keywords
        tasks = [
            session.get(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                params={"location":f"{lat},{lng}","radius":radius,"keyword":kw,"key":api_key}
            ) for kw in KEYWORDS_LIST + FORCE_KEYWORDS
        ]
        page = 0
        while page < max_pages:
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            tasks = []
            for resp in responses:
                if isinstance(resp, Exception):
                    continue
                data = await resp.json()
                if data.get("status") != "OK":
                    continue
                for r in data.get("results", []):
                    pid = r.get("place_id")
                    if pid:
                        place_ids.add(pid)
                token = data.get("next_page_token")
                if token:
                    tasks.append(
                        session.get(
                            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                            params={"pagetoken":token,"key":api_key}
                        )
                    )
            if not tasks:
                break
            page += 1
            await asyncio.sleep(2)

        # details
        details: List[Dict] = []
        detail_tasks = [fetch_place_details_async(pid, api_key, session) for pid in place_ids]
        detail_results = await asyncio.gather(*detail_tasks, return_exceptions=True)
        for d in detail_results:
            if isinstance(d, dict):
                details.append(d)
    return {"dojos": details}

# ----------------------------------------------------------------------------
# Sync wrappers
# ----------------------------------------------------------------------------
def fetch_dojo_data(query: str, api_key: str) -> Dict[str, List[Dict]]:
    try:
        return async_to_sync(fetch_dojo_data_async)(query, api_key)
    except Exception as e:
        logger.error(f"Error in fetch_dojo_data sync: {e}")
        return {"dojos": []}

def fetch_dojo_data_nearby(lat: float, lng: float, radius: int, api_key: str) -> Dict[str, List[Dict]]:
    try:
        return async_to_sync(fetch_dojo_data_nearby_async)(lat, lng, radius, api_key)
    except Exception as e:
        logger.error(f"Error in fetch_dojo_data_nearby sync: {e}")
        return {"dojos": []}

async def fetch_instagram_link(website: str) -> Optional[str]:
    async with ClientSession(timeout=ClientTimeout(total=10)) as session:
        return await fetch_instagram_link_async(website, session)

from asgiref.sync import async_to_sync

def fetch_place_details(place_id: str, api_key: str) -> Optional[Dict]:
    """
    同期コンテキストから呼び出せるラッパー。
    """
    return async_to_sync(fetch_place_details_async)(place_id, api_key)
