# dojo/models.py

from django.db import models
from django.utils.timezone import now
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import JSONField

User = get_user_model()

class OpenMat(models.Model):
    """
    オープンマット情報
    """
    name = models.CharField(max_length=255, default="Vancouver")
    location = models.CharField(max_length=255, default='Vancouver')
    date = models.DateTimeField(default=now)  # 現在の日時をデフォルト値に設定

    def __str__(self):
        return f"{self.name} at {self.location} on {self.date}"

class Dojo(models.Model):
    """
    道場の基本情報
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default=1)
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500)
    latitude = models.FloatField(blank=True, null=True)  # ← null=True に
    longitude = models.FloatField(blank=True, null=True) # ← null=True に
    website = models.URLField(null=True, blank=True)
    hours = models.JSONField(null=True, blank=True)  # 追加
    instagram = models.URLField(null=True, blank=True)
    place_id = models.CharField(max_length=255, unique=True)
    is_visitor_friendly = models.BooleanField(default=False)
    open_mats = models.ManyToManyField(OpenMat, blank=True)
    rating = models.FloatField(null=True, blank=True)
    reviews = JSONField(default=list, blank=True)  # Django 3.2 以降は models.JSONField でもOK
    user_ratings_total = models.IntegerField(blank=True, null=True)  # ← 追加例
    def __str__(self):
        return self.name

class Feedback(models.Model):
    """
    道場に関するユーザーからのフィードバック
    """
    place_id = models.CharField(max_length=255)
    has_open_mat = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)  # フィードバック作成日時を追加

    def __str__(self):
        return f"{self.place_id} - {'Yes' if self.has_open_mat else 'No'}"

class Review(models.Model):
    """
    道場へのレビュー
    - 1ユーザーにつき1道場へのレビューは1回だけ(=重複投稿しない)想定
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    dojo = models.ForeignKey(Dojo, on_delete=models.CASCADE, related_name='dojo_reviews')
    rating = models.IntegerField(default=5)  # ★の数 (1～5など)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'dojo')  # 同じユーザーが同じ道場に複数回投稿を防ぐ

    def __str__(self):
        return f"Review by {self.user.username} on {self.dojo.name} - rating {self.rating}"

class Favorite(models.Model):
    """
    お気に入り管理
    - 1ユーザーが複数の道場をお気に入り登録可能
    - 1道場も複数ユーザーにお気に入り登録される可能性がある（多対多）
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    dojo = models.ForeignKey(Dojo, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'dojo')  # 1ユーザーが同じ道場を重複登録しない

    def __str__(self):
        return f"{self.user.username} - {self.dojo.name}"

# ★ 新規追加: 練習日を記録するモデル

class PracticeDay(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user} practiced on {self.date}"
