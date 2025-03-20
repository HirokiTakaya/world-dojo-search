# dojo/services.py

import requests
from django.conf import settings
import logging
from bs4 import BeautifulSoup  # HTML解析のためにBeautifulSoupを使用

logger = logging.getLogger(__name__)

def fetch_dojo_data(query):
    """
    Google Places API を使用して道場データを取得します。
    環境設定から直接 API キーを取得します。
    
    Args:
        query (str): 検索クエリ（例: "Vancouver"）
    
    Returns:
        dict: 道場の位置情報とリスト
              {
                  "location": {"latitude": float, "longitude": float},
                  "dojos": [
                      {
                          "name": str,
                          "address": str,
                          "latitude": float,
                          "longitude": float,
                          "website": str,
                          "place_id": str,
                      },
                      ...
                  ]
              }
    
    Raises:
        ValueError: API キーが設定されていない場合
        requests.RequestException: Google Places API リクエストが失敗した場合
        Exception: その他の予期しないエラー
    """
    api_key = settings.GOOGLE_API_KEY
    if not api_key:
        logger.error("Google API key is missing in settings.")
        raise ValueError("Google API key is missing.")

    try:
        url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
        params = {
            'query': f"{query} dojo",  # 検索クエリに "dojo" を追加
            'key': api_key,
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # 必要なデータを解析して返す
        dojos = []
        location = {}
        
        for result in data.get('results', []):
            dojo = {
                'name': result.get('name'),
                'address': result.get('formatted_address'),
                'latitude': result['geometry']['location']['lat'],
                'longitude': result['geometry']['location']['lng'],
                'website': result.get('website', ''),
                'place_id': result.get('place_id'),
            }
            dojos.append(dojo)
        
        if dojos:
            location = {
                'latitude': dojos[0]['latitude'],
                'longitude': dojos[0]['longitude'],
            }
        
        return {
            'location': location,
            'dojos': dojos,
        }
    except requests.RequestException as e:
        logger.error(f"Error fetching dojo data from Google Places API: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in fetch_dojo_data: {e}")
        raise

def fetch_instagram_link(website):
    """
    道場のウェブサイトからInstagramリンクを取得します。
    BeautifulSoupを使用して正確にリンクを抽出します。
    
    Args:
        website (str): 道場のウェブサイトURL
    
    Returns:
        str or None: Instagramリンクまたは存在しない場合はNone
    """
    if not website:
        logger.error("Website URL is missing for fetching Instagram link.")
        return None

    try:
        response = requests.get(website, timeout=10)
        response.raise_for_status()
        html = response.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # 全てのリンクを検索してInstagramリンクを探す
        for link in soup.find_all('a', href=True):
            href = link['href']
            if 'instagram.com' in href:
                # URLが相対パスの場合は絶対パスに変換
                if not href.startswith('http'):
                    href = f"https://{href.lstrip('/')}"
                return href
        return None
    except requests.RequestException as e:
        logger.error(f"Error fetching Instagram link from {website}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in fetch_instagram_link: {e}")
        return None

def get_open_mat_info(name, website):
    """
    道場のオープンマット情報を取得します。
    名前やウェブサイトに 'open mat' が含まれているかをチェックします。
    
    Args:
        name (str): 道場の名前
        website (str): 道場のウェブサイトURL
    
    Returns:
        bool: オープンマットが存在する場合はTrue、存在しない場合はFalse
    """
    if name and 'open mat' in name.lower():
        return True
    if website and 'open mat' in website.lower():
        return True
    return False
