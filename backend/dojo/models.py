from django.db import models
from django.utils.timezone import now
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import JSONField

User = get_user_model()

# ───────────────────────────────
# オープンマット
# ───────────────────────────────
class OpenMat(models.Model):
    """
    オープンマット情報
    """
    name     = models.CharField(max_length=255, default="Vancouver")
    location = models.CharField(max_length=255, default="Vancouver")
    date     = models.DateTimeField(default=now)

    def __str__(self):
        return f"{self.name} at {self.location} on {self.date}"


# ───────────────────────────────
# 道場
# ───────────────────────────────
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


# ───────────────────────────────
# フィードバック & レビュー
# ───────────────────────────────
class Feedback(models.Model):
    place_id   = models.CharField(max_length=255)
    has_open_mat = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.place_id} - {'Yes' if self.has_open_mat else 'No'}"


class Review(models.Model):
    user     = models.ForeignKey(User,  on_delete=models.CASCADE, related_name="reviews")
    dojo     = models.ForeignKey(Dojo,  on_delete=models.CASCADE, related_name="dojo_reviews")
    rating   = models.IntegerField(default=5)
    comment  = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

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


# ───────────────────────────────
# Stripe 課金モデル
# ───────────────────────────────
class StripeCustomer(models.Model):
    """
    Django ユーザー ↔︎ Stripe Customer を 1:1 で保持
    """
    user      = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stripe_id = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return f"{self.user.email} / {self.stripe_id}"


class Subscription(models.Model):
    """
    Stripe Subscription をローカルにキャッシュ
    """
    STATUS_CHOICES = [
        ("active", "Active"),
        ("trialing", "Trialing"),
        ("past_due", "Past Due"),
        ("canceled", "Canceled"),
        ("unpaid", "Unpaid"),
    ]

    customer           = models.ForeignKey(StripeCustomer, on_delete=models.CASCADE)
    stripe_sub_id      = models.CharField(max_length=255, unique=True)
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES)
    current_period_end = models.DateTimeField()

    def __str__(self):
        return f"{self.customer.user.email} ({self.status})"
