# 1) Playwright があらかじめ入った公式イメージ
#    Chromium / Firefox / WebKit などブラウザが同梱されたPythonイメージ
FROM mcr.microsoft.com/playwright/python:latest

# 2) アプリの作業ディレクトリを /app として定義
WORKDIR /app

# 3) ソースコードをコピー
#    ('.' は Dockerfileが置いてあるカレントディレクトリ、'/app' はコンテナの作業DIR)
COPY . /app

# 4) 依存ライブラリ (Django, whitenoise, playwright等) をインストール
RUN pip install --no-cache-dir -r requirements.txt

# 5) Gunicorn で Django を起動
#    ポート8000で待機 (Azure はデフォルトで 8000 をヘルスチェック)
CMD ["gunicorn", "jiujitsuInfo.wsgi", "--bind=0.0.0.0:8000"]
