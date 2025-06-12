from datetime import timedelta

from django.db import models
from django.utils.timezone import now, localtime
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import JSONField

User = get_user_model()

# ------------------------------------------------------------------
# オープンマット
# ------------------------------------------------------------------
class OpenMat(models.Model):
    """
    オープンマット情報
    """
    name     = models.CharField(max_length=255, default="Vancouver")
    location = models.CharField(max_length=255, default="Vancouver")
    date     = models.DateTimeField(default=now)

    def __str__(self):
        return f"{self.name} at {self.location} on {self.date}"


# ------------------------------------------------------------------
# 道場
# ------------------------------------------------------------------
class Dojo(models.Model):
    user               = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default=1)
    name               = models.CharField(max_length=255)
    address            = models.CharField(max_length=500)
    latitude           = models.FloatField(blank=True, null=True)
    longitude          = models.FloatField(blank=True, null=True)
    website            = models.URLField(null=True, blank=True)
    hours              = models.JSONField(null=True, blank=True)
    instagram          = models.URLField(null=True, blank=True)
    place_id           = models.CharField(max_length=255, unique=True)
    is_visitor_friendly= models.BooleanField(default=False)
    open_mats          = models.ManyToManyField(OpenMat, blank=True)
    rating             = models.FloatField(null=True, blank=True)
    reviews            = JSONField(default=list, blank=True)
    user_ratings_total = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return self.name


# ------------------------------------------------------------------
# フィードバック & レビュー
# ------------------------------------------------------------------
class Feedback(models.Model):
    place_id      = models.CharField(max_length=255)
    has_open_mat  = models.BooleanField()
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.place_id} - {'Yes' if self.has_open_mat else 'No'}"


class Review(models.Model):
    user        = models.ForeignKey(User,  on_delete=models.CASCADE, related_name="reviews")
    dojo        = models.ForeignKey(Dojo,  on_delete=models.CASCADE, related_name="dojo_reviews")
    rating      = models.IntegerField(default=5)
    comment     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "dojo")

    def __str__(self):
        return f"Review by {self.user.username} on {self.dojo.name} - rating {self.rating}"


class Favorite(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    dojo       = models.ForeignKey(Dojo, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "dojo")

    def __str__(self):
        return f"{self.user.username} - {self.dojo.name}"


class PracticeDay(models.Model):
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date       = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "date")

    def __str__(self):
        return f"{self.user} practiced on {self.date}"


# ------------------------------------------------------------------
# Stripe 課金モデル
# ------------------------------------------------------------------
class StripeCustomer(models.Model):
    """
    Django ユーザー ↔︎ Stripe Customer を 1:1 で保持
    """
    user            = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stripe_id       = models.CharField(max_length=255, unique=True)
    last_search_at  = models.DateTimeField(null=True, blank=True)  # 🔹 追加: 最終検索日時

    def __str__(self):
        return f"{self.user.email} / {self.stripe_id}"


class Subscription(models.Model):
    """
    Stripe Subscription をローカルにキャッシュ
    """
    STATUS_CHOICES = [
        ("active", "Active"),
        ("trialing", "Trialing"),
        ("past_due", "Past Due"),
        ("canceled", "Canceled"),
        ("unpaid", "Unpaid"),
    ]

    customer           = models.ForeignKey(StripeCustomer, on_delete=models.CASCADE)
    stripe_sub_id      = models.CharField(max_length=255, unique=True)
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES)
    current_period_end = models.DateTimeField()

    def __str__(self):
        return f"{self.customer.user.email} ({self.status})"

    # 🔹 プロパティ: アクティブかどうか
    @property
    def is_active(self):
        return self.status in ("active", "trialing") and self.current_period_end > localtime()


# ------------------------------------------------------------------
# User 便利メソッド（Monkey-patch）
# ------------------------------------------------------------------
FREE_THROTTLE_DAYS = 3  # 無料プランは 3 日に 1 回検索可能


def can_search(self) -> bool:
    """
    無料ユーザーの場合:
      - last_search_at が無い → OK
      - last_search_at + 3 日 < now → OK
    プレミアム(有料)の場合は常に OK
    """
    try:
        sc = self.stripecustomer
    except StripeCustomer.DoesNotExist:
        return True  # Stripe 未登録ユーザーは全部無料扱い

    # 有料サブスクを持っていれば無制限
    has_active_sub = Subscription.objects.filter(
        customer=sc, status__in=("active", "trialing")
    ).exists()
    if has_active_sub:
        return True

    # 無料の場合はレート制限
    if not sc.last_search_at:
        return True
    return localtime() - sc.last_search_at >= timedelta(days=FREE_THROTTLE_DAYS)


User.add_to_class("can_search", can_search)  # User.can_search() で呼べるようになる
