#!/bin/bash
# 例: startup.sh の内容
# 1) Pythonパッケージをインストール（requirements.txt に playwright がある想定）
pip install -r requirements.txt

# 2) Playwright のブラウザをダウンロード
playwright install --with-deps chromium

# 3) Gunicorn で Django を起動
gunicorn jiujitsuInfo.wsgi --bind=0.0.0.0:8000