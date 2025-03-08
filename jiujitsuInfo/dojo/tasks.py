from celery import shared_task
from .models import Dojo
#from .services import get_open_mat_info
import logging

logger = logging.getLogger(__name__)

@shared_task
def update_open_mat_info_task():
    """
    Open Mat情報を更新するタスク。
    """
    dojos = Dojo.objects.all()
    for dojo in dojos:
        try:
            has_open_mat = get_open_mat_info(dojo.name, dojo.website)
            dojo.has_open_mat = has_open_mat  # モデルにフィールドがあれば更新
            dojo.save()
            logger.info(f"Updated Open Mat info for dojo: {dojo.name}")
        except Exception as e:
            logger.error(f"Failed to update Open Mat info for dojo: {dojo.name}. Error: {e}")
