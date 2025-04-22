# utils.py
import asyncio
import hashlib
import logging
from typing import Dict, List, Optional, Set

from aiohttp import ClientSession, ClientTimeout
from asgiref.sync import async_to_sync, sync_to_async
from bs4 import BeautifulSoup
from django.core.cache import cache
from django.db import transaction
from django.conf import settings

from dojo.models import Dojo
from playwright.async_api import async_playwright  # Playwright（不要なら削除）

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)
import time
RATE_LIMIT_MS = 400            # Google 推奨：QPS ≒ 2.5
SHORT_CACHE_SEC = 30           # TextSearch / NearbySearch の URL を 30 秒キャッシュ
DETAIL_CACHE_SEC = 60 * 60 * 24  # PlaceDetails は既存 24h のまま

# ----------------------------------------------------------------------------
# 1. 通常の複数キーワードリスト (TextSearch 用)
# ----------------------------------------------------------------------------
KEYWORDS_LIST = [
    "brazilian jiu jitsu",
    "bjj",
    "grappling",
    "jiujitsu",
    "柔術",
]

# ----------------------------------------------------------------------------
# 2. 「強制的に追加したい」キーワード（インチキ用：TextSearch用）
# ----------------------------------------------------------------------------
FORCE_KEYWORDS = [
    "Spartacus Gym",
    "Advantage Fitness",
    "West Vancouver Martial Arts",
   
]

# ----------------------------------------------------------------------------
# 3. NearbySearch 用の複数キーワード (並列検索したいキーワード)
#    (もし強制キーワードも nearbysearch で使いたいなら別に定義する)
# ----------------------------------------------------------------------------
NEARBY_KEYWORDS = [
    "bjj",
    "jiu jitsu",
    "柔術",
    "grappling",
    
]

# ★ 必要なら強制用キーワードを追加してもOK
FORCE_NEARBY_KEYWORDS = [
    "Spartacus Gym",
    
]

# ----------------------------------------------------------------------------
# 4. Playwright 初期化 (不要なら削除)
# ----------------------------------------------------------------------------
playwright_instance = None

async def initialize_playwright():
    global playwright_instance
    logger.debug("Starting Playwright...")

    playwright_instance = await async_playwright().start()
    browser = await playwright_instance.chromium.launch(headless=True)
    context = await browser.new_context()
    page = await context.new_page()

    await page.goto("http://example.com")
    title = await page.title()
    logger.debug(f"Page title: {title}")

    await browser.close()
    logger.debug("Playwright: Browser closed.")
    logger.debug("Playwright initialization complete.")

async def close_playwright():
    global playwright_instance
    if playwright_instance:
        await playwright_instance.stop()
        playwright_instance = None
        logger.debug("Playwright instance stopped.")

def async_initialize():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(initialize_playwright())
    except Exception as e:
        logger.error(f"Error during initialize_playwright: {e}", exc_info=True)
    finally:
        loop.close()

# ----------------------------------------------------------------------------
# 5. TextSearch 関連のヘルパー
# ----------------------------------------------------------------------------

def generate_cache_key(prefix: str, key: str) -> str:
    hashed_key = hashlib.md5(key.encode('utf-8')).hexdigest()
    return f"{prefix}_{hashed_key}"

async def fetch_textsearch_place_ids(
    keyword: str,
    location_name: str,
    api_key: str,
    session: ClientSession,
    max_pages: int = 5,
    lat: float = None,
    lng: float = None,
    radius: int = 30000,
) -> Set[str]:
    """
    Google Places API の TextSearch を使い、"keyword in location_name" + (location+radius) で検索。
    """
    place_ids: Set[str] = set()
    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"

    query_str = f"{keyword} in {location_name}"
    params = {
        "query": query_str,
        "key": api_key,
    }
    # location + radius があれば追加
    if lat is not None and lng is not None:
        params["location"] = f"{lat},{lng}"
        params["radius"] = radius

    page_count = 0
   
                seen_urls: Set[str] = set()
   while page_count < max_pages:
        url = str(session._build_url(base_url, params=params))
        if cache.get(url):                             # ← 30 秒キャッシュで二重発射防止
            break
        cache.set(url, True, SHORT_CACHE_SEC)

      async with session.get(base_url, params=params) as resp:
            data = await resp.json()
            status = data.get("status")
            if status not in ("OK", "ZERO_RESULTS"):
                logger.error(f"Textsearch API error: status={status}, query={query_str}")
                break

            results = data.get("results", [])
            for r in results:
                pid = r.get("place_id")
                if pid:
                    place_ids.add(pid)

            next_page_token = data.get("next_page_token")
            if not next_page_token:
                break

              params = {"pagetoken": next_page_token, "key": api_key}
           await asyncio.sleep(2)        # token 有効化待ち
            page_count += 1
            await asyncio.sleep(RATE_LIMIT_MS / 1000)  # ← レートリミット

    return place_ids

async def fetch_place_details_async(place_id: str, api_key: str) -> Optional[Dict]:
    """
    非同期で Place ID から詳細情報を取得し、キャッシュに保存。
    """
    cache_key = generate_cache_key("place_details", place_id)
    cached_detail = cache.get(cache_key)
    if cached_detail:
        return cached_detail

    fields = "name,formatted_address,geometry/location,opening_hours,website,rating,user_ratings_total,reviews"
    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
    url = f"{details_url}?place_id={place_id}&fields={fields}&key={api_key}"

    timeout = ClientTimeout(total=10)
    async with ClientSession(timeout=timeout) as detail_session:
        try:
            async with detail_session.get(url) as response:
                data = await response.json()
                if data.get("status") != "OK":
                    logger.error(f"Place details API error: place_id={place_id}, status={data.get('status')}")
                    return None

                result = data.get("result", {})
                if not result:
                    return None

                geometry = result.get("geometry", {})
                loc = geometry.get("location", {})

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

                cache.set(cache_key, detail, 60 * 60 * 24)
                return detail

        except Exception as e:
            logger.error(f"Error fetching details for place_id={place_id}: {e}", exc_info=True)
            return None

async def fetch_instagram_link_async(website: str) -> Optional[str]:
    """
    非同期で道場のウェブサイトからInstagramリンクを探す。
    """
    if not website:
        return None

    cache_key = generate_cache_key("instagram_link", website.lower())
    cached_link = cache.get(cache_key)
    if cached_link is not None:
        return cached_link

    timeout = ClientTimeout(total=10)
    async with ClientSession(timeout=timeout) as link_session:
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            async with link_session.get(website, headers=headers) as resp:
                if resp.status != 200:
                    return None
                text = await resp.text()
                soup = BeautifulSoup(text, 'html.parser')

                for link in soup.find_all('a', href=True):
                    href = link['href']
                    if 'instagram.com' in href:
                        cache.set(cache_key, href, 60 * 60 * 24)
                        return href

            cache.set(cache_key, None, 60 * 60 * 24)
            return None
        except Exception as e:
            logger.error(f"Error fetching Instagram link from {website}: {e}", exc_info=True)
            return None

# ----------------------------------------------------------------------------
# 6. 既存 TextSearch ロジック (複数キーワード + 強制キーワード)
# ----------------------------------------------------------------------------

async def fetch_dojo_data_async(query: str, api_key: str, max_pages: int = 5) -> Dict[str, List[Dict]]:
    """
    既存の TextSearch ロジック（複数キーワード並列 + 強制キーワード）。
    """
    logger.debug(f"Fetching dojo data (textsearch) for: {query}")
    if not api_key:
        logger.error("Google API key is missing.")
        return {"dojos": []}

    all_place_ids: Set[str] = set()

    timeout = ClientTimeout(total=15)
    async with ClientSession(timeout=timeout) as session:
        # 1. 通常キーワードを並列検索
        normal_tasks = [
            fetch_textsearch_place_ids(kw, query, api_key, session, max_pages=max_pages)
            for kw in KEYWORDS_LIST
        ]
        normal_results = await asyncio.gather(*normal_tasks, return_exceptions=True)
        for r in normal_results:
            if isinstance(r, set):
                all_place_ids.update(r)
            elif isinstance(r, Exception):
                logger.error(f"TextSearch error (normal keywords): {r}")

        # 2. 強制キーワードを並列検索
        force_tasks = [
            fetch_textsearch_place_ids(force_kw, query, api_key, session, max_pages=max_pages)
            for force_kw in FORCE_KEYWORDS
        ]
        force_results = await asyncio.gather(*force_tasks, return_exceptions=True)
        for r in force_results:
            if isinstance(r, set):
                all_place_ids.update(r)
            elif isinstance(r, Exception):
                logger.error(f"TextSearch error (force keywords): {r}")

    logger.debug(f"Total unique place_ids found: {len(all_place_ids)}")

    # 3. Place Details 取得
    detail_tasks = []
     fetched_today = cache.get("fetched_detail_pids", set())
 for pid in all_place_ids:
     if pid in fetched_today:
         continue
     await asyncio.sleep(RATE_LIMIT_MS / 1000)
     detail_tasks.append(fetch_place_details_async(pid, api_key))
     fetched_today.add(pid)
 cache.set("fetched_detail_pids", fetched_today, DETAIL_CACHE_SEC)

    detail_results = await asyncio.gather(*detail_tasks, return_exceptions=True)
    dojos = []
    for dr in detail_results:
        if isinstance(dr, dict) and dr.get("place_id"):
            dojos.append(dr)

    return {"dojos": dojos}

# ----------------------------------------------------------------------------
# 7. 新規: “nearbysearch” + 大きめ radius 用の複数キーワード並列ロジック
# ----------------------------------------------------------------------------

NEARBY_BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

async def fetch_nearby_place_ids(
    keyword: str,
    lat: float,
    lng: float,
    radius: int,
    api_key: str,
    session: ClientSession,
    max_pages: int = 3
) -> Set[str]:
    """
    Google Places API の nearbysearch を使い、
    (lat,lng,radius,keyword) で検索 → 最大3ページ(60件)を取得。
    """
    place_ids: Set[str] = set()

    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "keyword": keyword,
        "key": api_key,
    }

    page_count = 0
    while page_count < max_pages:
        async with session.get(NEARBY_BASE_URL, params=params) as resp:
            data = await resp.json()
            status = data.get("status")
            if status not in ("OK", "ZERO_RESULTS"):
                logger.error(f"Nearbysearch error: {status}, keyword={keyword}")
                break

            results = data.get("results", [])
            for r in results:
                pid = r.get("place_id")
                if pid:
                    place_ids.add(pid)

            next_page_token = data.get("next_page_token")
            if not next_page_token:
                break

            params = {
                "pagetoken": next_page_token,
                "key": api_key
            }
            page_count += 1
            # token 有効化のため少し待機
            await asyncio.sleep(2)

    return place_ids

async def fetch_dojo_data_nearby_async(
    lat: float,
    lng: float,
    radius: int,
    api_key: str,
    max_pages: int = 3
) -> Dict[str, List[Dict]]:
    """
    新規ロジック: “nearbysearch” + 大きめ radius + 並列キーワード検索。
    1. 複数キーワードを並列で nearbysearch
    2. 強制キーワードを並列で nearbysearch
    3. Place Details を並列で取得 → 返却
    """
    if not api_key:
        logger.error("Google API key is missing.")
        return {"dojos": []}

    logger.debug(f"Nearbysearch lat={lat}, lng={lng}, radius={radius}")

    all_place_ids: Set[str] = set()

    timeout = ClientTimeout(total=15)
    async with ClientSession(timeout=timeout) as session:
        # 1. 通常 near キーワード並列検索
        tasks_normal = [
            fetch_nearby_place_ids(kw, lat, lng, radius, api_key, session, max_pages=max_pages)
            for kw in KEYWORDS_LIST
        ]
        normal_results = await asyncio.gather(*tasks_normal, return_exceptions=True)
        for r in normal_results:
            if isinstance(r, set):
                all_place_ids.update(r)
            elif isinstance(r, Exception):
                logger.error(f"Nearby search error (normal keywords): {r}")

        # 2. 強制キーワードも並列検索
        tasks_force = [
            fetch_nearby_place_ids(fkw, lat, lng, radius, api_key, session, max_pages=max_pages)
            for fkw in FORCE_KEYWORDS
        ]
        force_results = await asyncio.gather(*tasks_force, return_exceptions=True)
        for r in force_results:
            if isinstance(r, set):
                all_place_ids.update(r)
            elif isinstance(r, Exception):
                logger.error(f"Nearby search error (force keywords): {r}")

    logger.debug(f"Total unique place_ids found (nearby): {len(all_place_ids)}")

    # 3. Place Details 取得
    tasks_detail = []
    async with ClientSession(timeout=ClientTimeout(total=10)) as detail_session:
        for pid in all_place_ids:
            tasks_detail.append(fetch_place_details_async(pid, api_key))

        detail_results = await asyncio.gather(*tasks_detail, return_exceptions=True)

    dojos = []
    for dr in detail_results:
        if isinstance(dr, dict) and dr.get("place_id"):
            dojos.append(dr)

    return {"dojos": dojos}

# ----------------------------------------------------------------------------
# 8. 同期ラッパ関数 (既存)
# ----------------------------------------------------------------------------

def fetch_place_details(place_id: str, api_key: str) -> Optional[Dict]:
    async def _runner():
        return await fetch_place_details_async(place_id, api_key)
    try:
        return async_to_sync(_runner)()
    except Exception as e:
        logger.error(f"Error in fetch_place_details (sync wrapper): {e}")
        return None

def fetch_instagram_link(website: str) -> Optional[str]:
    async def _runner():
        return await fetch_instagram_link_async(website)
    try:
        return async_to_sync(_runner)()
    except Exception as e:
        logger.error(f"Error in fetch_instagram_link (sync wrapper): {e}")
        return None
