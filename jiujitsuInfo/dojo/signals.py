from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Dojo
from .tasks import update_open_mat_info_task
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Dojo)
def update_open_mat_info(sender, instance, created, **kwargs):
    if created:
        logger.info(f"新しい Dojo インスタンスが作成されました: {instance.name}")
        # タスクを非同期で実行
        update_open_mat_info_task.delay(instance.id)
