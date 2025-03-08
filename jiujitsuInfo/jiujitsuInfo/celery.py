from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Djangoの設定モジュールを指定
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jiujitsuInfo.settings')

app = Celery('jiujitsuInfo')

# Djangoの設定からCeleryの設定を読み込む
app.config_from_object('django.conf:settings', namespace='CELERY')

# Djangoアプリケーションのタスクを自動検出
app.autodiscover_tasks()
