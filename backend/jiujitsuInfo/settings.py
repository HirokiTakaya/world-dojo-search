# ===============================================
#  settings.py  —  Stripe Subscription (CAD $5) 対応版
#  
# ===============================================

import os
from pathlib import Path
from datetime import timedelta
from corsheaders.defaults import default_headers
from decouple import config

# ---------------------------------------------------
#  基本パス / 環境切替
# ---------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENT = config('ENVIRONMENT', default='development')
DEBUG = config('DEBUG', default=ENVIRONMENT.lower() != 'production', cast=bool)

# ---------------------------------------------------
#  セキュリティキー類
# ---------------------------------------------------
SECRET_KEY = config(
    'SECRET_KEY',
    default='django-insecure-^!*os!0(^)=u8*-3qn0snd9kk5%+mqymonxx(3oj3@nagt+5y!'
)

# 既存 API / Service キー（一部省略）
DOJO_API_SECRET_KEY          = config('DOJO_API_SECRET_KEY', default='')
GOOGLE_API_KEY               = config('GOOGLE_API_KEY', default=None)
PROJECT_ID                   = config('PROJECT_ID', default='jiujitsu-api')
GOOGLE_CUSTOM_SEARCH_API_KEY = config('GOOGLE_CUSTOM_SEARCH_API_KEY', default=None)
GOOGLE_CUSTOM_SEARCH_ENGINE_ID = config('GOOGLE_CUSTOM_SEARCH_ENGINE_ID', default=None)
GOOGLE_VISION_API_KEY        = config('GOOGLE_VISION_API_KEY', default=None)
SERVICE_ACCOUNT_CREDENTIALS_PATH = config('SERVICE_ACCOUNT_CREDENTIALS_PATH', default='')
CHROME_DRIVER_PATH           = config('CHROME_DRIVER_PATH', default='')
GOOGLE_APPLICATION_CREDENTIALS = config('GOOGLE_APPLICATION_CREDENTIALS', default='')
REACT_APP_CHATBOT_API_URL    = config('REACT_APP_CHATBOT_API_URL', default='https://jiujitsu-samurai.com/api/chat/')

# ---------------------------------------------------
#  Stripe サブスクリプション設定  ★追加★
# ---------------------------------------------------
STRIPE_PUBLIC_KEY     = config('STRIPE_PUBLIC_KEY', default='')  # pk_live_...
STRIPE_SECRET_KEY     = config('STRIPE_SECRET_KEY', default='')  # sk_live_...
STRIPE_PRICE_MONTHLY  = config('STRIPE_PRICE_MONTHLY', default='')  # price_...
STRIPE_PRICE_YEARLY   = config('STRIPE_PRICE_YEARLY', default='')   # price_...
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='') # whsec_...
STRIPE_API_VERSION    = config('STRIPE_API_VERSION', default='2025-03-31')

# ---------------------------------------------------
#  ホスト / アプリケーション
# ---------------------------------------------------
ALLOWED_HOSTS = [
    'hiroki-jiujitsu.azurewebsites.net',
    'jiujitsu-samurai.com',
    'localhost',
    '127.0.0.1',
]

INSTALLED_APPS = [
    'corsheaders',
    'dojo.apps.DojoConfig',  # 自作アプリ "dojo"
    # 'subscriptions.apps.SubscriptionsConfig',  # ← 後ほど作成したら有効化

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'django_extensions',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'
ROOT_URLCONF = 'jiujitsuInfo.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ],
    },
}]

WSGI_APPLICATION = 'jiujitsuInfo.wsgi.application'

# ---------------------------------------------------
#  Database (SQLite → 後で Postgres へ移行可)
# ---------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ---------------------------------------------------
#  Auth / i18n / static  ※変更なし
# ---------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'
USE_I18N      = True
USE_TZ        = True

STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------
#  CORS / CSRF  ※変更なし
# ---------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = [
    'https://jiujitsu-samurai.com',
    'https://hiroki-jiujitsu.azurewebsites.net',
    'http://localhost:3000',
]
CORS_ALLOW_HEADERS = list(default_headers) + ['authorization']
CORS_ALLOW_CREDENTIALS = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# ---------------------------------------------------
#  DRF / JWT  ※変更なし
# ---------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ---------------------------------------------------
#  Logging  ※変更なし
# ---------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'dojo': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ---------------------------------------------------
#  ここまで設定ファイル
# ---------------------------------------------------
