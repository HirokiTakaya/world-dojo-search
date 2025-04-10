"""
Django settings for jiujitsuInfo project.

Generated by 'django-admin startproject' using Django 4.2.16.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/topics/settings/
For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.2/ref/settings/
"""

import os
from pathlib import Path
from decouple import config
from datetime import timedelta
from corsheaders.defaults import default_headers

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# 独自キーや API キーの読み込み（.env に設定済み）
SECRET_KEY = config(
    'SECRET_KEY',
    default='django-insecure-^!*os!0(^)=u8*-3qn0snd9kk5%+mqymonxx(3oj3@nagt+5y!'
)
DOJO_API_SECRET_KEY = config('DOJO_API_SECRET_KEY', default='')
GOOGLE_API_KEY = config('GOOGLE_API_KEY', default=None)
PROJECT_ID = config('PROJECT_ID', default='jiujitsu-api')
GOOGLE_CUSTOM_SEARCH_API_KEY = config('GOOGLE_CUSTOM_SEARCH_API_KEY', default=None)
GOOGLE_CUSTOM_SEARCH_ENGINE_ID = config('GOOGLE_CUSTOM_SEARCH_ENGINE_ID', default=None)
GOOGLE_VISION_API_KEY = config('GOOGLE_VISION_API_KEY', default=None)
SERVICE_ACCOUNT_CREDENTIALS_PATH = config('SERVICE_ACCOUNT_CREDENTIALS_PATH', default='')
CHROME_DRIVER_PATH = config('CHROME_DRIVER_PATH', default='')
GOOGLE_APPLICATION_CREDENTIALS = config('GOOGLE_APPLICATION_CREDENTIALS', default='')
REACT_APP_CHATBOT_API_URL = config('REACT_APP_CHATBOT_API_URL', default='https://jiujitsu-samurai.com/api/chat/')

# ===================================
#   本番/開発環境の切り替え (例)
# ===================================
ENVIRONMENT = config('ENVIRONMENT', default='development')
DEBUG = config('DEBUG', default=True, cast=bool)
if ENVIRONMENT.lower() == 'production':
    DEBUG = False

# ホスト設定（本番環境用に Azure のホスト名などを含む）
ALLOWED_HOSTS = ['hiroki-jiujitsu.azurewebsites.net', 'jiujitsu-samurai.com', 'localhost', '127.0.0.1']

# ===================================
#       Application definition
# ===================================
INSTALLED_APPS = [
    'corsheaders',  # corsheaders を最初に追加
    'dojo.apps.DojoConfig',  # 自作アプリ "dojo"
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',   # セッション関連
    'django.contrib.messages',   # メッセージ関連
    'django.contrib.staticfiles',
    'django_extensions',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 最上位に配置
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Cross-Origin-Opener-Policy の設定（必要に応じて調整）
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

ROOT_URLCONF = 'jiujitsuInfo.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],  # 必要に応じてテンプレートディレクトリを追加
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',  # request コンテキスト
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'jiujitsuInfo.wsgi.application'

# ===================================
#              Database
# ===================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ===================================
#       Password Validation
# ===================================
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ===================================
#         Internationalization
# ===================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ===================================
#          Static Files
# ===================================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ===================================
#             CORS設定
# ===================================
CORS_ALLOW_ALL_ORIGINS = True
# 必要に応じてホワイトリストで制限する場合は以下を有効化
# CORS_ALLOW_ALL_ORIGINS = False
# CORS_ALLOWED_ORIGINS = [
#     "https://hiroki-jiujitsu-frontend.azurewebsites.net",
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
# ]

# CSRF_TRUSTED_ORIGINS はスキーム付きで記述する必要があります
CSRF_TRUSTED_ORIGINS = [
    "https://jiujitsu-samurai.com",
    "https://hiroki-jiujitsu.azurewebsites.net",
]

CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
]
CORS_ALLOW_CREDENTIALS = True

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# ===================================
#       Django REST Framework
# ===================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# ===================================
#              JWT設定
# ===================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ===================================
#            Logging
# ===================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
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

# ※プロキシを利用している場合は、以下の設定を追加することも検討してください
# USE_X_FORWARDED_HOST = True
# SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ===================================
#      その他の環境変数
# ===================================
REACT_APP_CHATBOT_API_URL = config('REACT_APP_CHATBOT_API_URL', default='https://jiujitsu-samurai.com/api/chat/')
