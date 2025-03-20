from django.apps import AppConfig
import logging
import threading
import atexit  # 終了時の処理を登録するため
import shutil
import os

logger = logging.getLogger(__name__)

class DojoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dojo'
    label = 'dojo'  # アプリの一意のラベル

    def ready(self):
        """
        Django 起動時に呼ばれる。Playwright の初期化を別スレッドで行い、
        イベントループのブロッキングを防止する。また、utils.py に shutdown 関数があれば
        atexit を使って登録する。
        """
        logger.debug("DojoConfig ready() called. Initializing Playwright in separate thread.")

        # utils から非同期初期化関数をインポートして別スレッドで実行
        try:
            from .utils import async_initialize
            thread = threading.Thread(target=async_initialize)
            thread.daemon = True  # Django 停止時にスレッドも停止
            thread.start()
            logger.debug("Playwright initialization thread started.")
        except ImportError as e:
            logger.error(f"Error importing async_initialize: {e}")

        # オプション： shutdown 関数の登録
        try:
            from .utils import shutdown  # shutdown 関数がある場合のみインポート
            atexit.register(shutdown)
            logger.debug("Shutdown function registered with atexit.")
        except ImportError:
            logger.warning("No shutdown function found in utils.py. Skipping.")

def cleanup_tmp():
    """
    アプリケーション専用の一時ディレクトリ（この例では、apps.py のあるディレクトリ内の 'tmp'）を
    削除・再作成する。システムの /tmp/ ではなく、プロジェクト内のディレクトリを使用する。
    """
    # 現在のファイルのディレクトリを基準に 'tmp' フォルダを作成
    tmp_path = os.path.join(os.path.dirname(__file__), 'tmp')
    if os.path.exists(tmp_path):
        try:
            shutil.rmtree(tmp_path)
            logger.debug(f"Removed temporary directory {tmp_path}")
        except Exception as e:
            logger.warning(f"Unable to remove {tmp_path}: {e}")
    try:
        os.makedirs(tmp_path, exist_ok=True)
        logger.debug(f"Created temporary directory {tmp_path}")
    except Exception as e:
        logger.error(f"Failed to create temporary directory {tmp_path}: {e}")

# Django 起動時に cleanup_tmp() を実行
cleanup_tmp()
