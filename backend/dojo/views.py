# views.py  (2025-05-28  修正版)
# -------------------------------------------------------------
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

import stripe
from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.utils.timezone import localtime
from django.views.decorators.csrf import csrf_exempt
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

# ─────────────── Stripe 初期化 ───────────────
stripe.api_key = settings.STRIPE_SECRET_KEY


# ─────────────── ロガー設定 ───────────────
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    h = logging.StreamHandler()
    h.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
    logger.addHandler(h)

# ─────────────── Local imports ───────────────
from .models import (
    Dojo,
    Feedback,
    Favorite,
    PracticeDay,
    StripeCustomer,
    Subscription,
)
from .serializers import (
    DojoSerializer,
    FeedbackSerializer,
    LoginSerializer,
    UserSerializer,
    FavoriteSerializer,
    PracticeDaySerializer,
)
from .utils import (
    fetch_dojo_data_async,
    fetch_place_details_async,
    fetch_instagram_link_async,
    fetch_place_details,
    fetch_instagram_link,
    fetch_dojo_data_nearby_async,
)
from .services import get_open_mat_info

User = get_user_model()
stripe.api_key = settings.STRIPE_SECRET_KEY

# --------------------------------------------
# Elements 決済 → サブスク作成 API
# --------------------------------------------
# dojo/views.py  ── Stripe Elements 版 ───────────────────────────
# ───────────────────────────────────────────────
#  Elements で受け取った PaymentMethod で
#  サブスクリプションを作成し、必要なら
#  client_secret を返すエンドポイント
# ───────────────────────────────────────────────
@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_subscription_with_elements(request):
    """
    Body 例:
      {
        "payment_method": "pm_xxx",   # Elements で生成した PM
        "plan": "monthly"            # "monthly" / "yearly" (任意, デフォルト monthly)
      }
    戻り値:
      {
        "client_secret": "... または null ...",
        "status": "active" | "incomplete" | ...
      }
    """

    # -------------------------
    # 1. 受け取り & バリデーション
    # -------------------------
    pm   = request.data.get("payment_method")
    plan = request.data.get("plan", "monthly")

    if not pm:
        return Response({"error": "payment_method is required"}, status=400)

    price_id = (
        settings.STRIPE_PRICE_YEARLY
        if plan == "yearly"
        else settings.STRIPE_PRICE_MONTHLY
    )

    # Price が「定期課金 (recurring)」でなければ 400
    price = stripe.Price.retrieve(price_id)
    if price.type != "recurring":
        return Response(
            {"error": "指定された Price は one_time です。recurring を設定してください。"},
            status=400,
        )

    # -------------------------
    # 2. 顧客を用意
    # -------------------------
    sc, _ = StripeCustomer.objects.get_or_create(
        user=request.user,
        defaults={"stripe_id": stripe.Customer.create(email=request.user.email).id},
    )

    # PaymentMethod を顧客にひもづけ & デフォルトに設定
    stripe.PaymentMethod.attach(pm, customer=sc.stripe_id)
    stripe.Customer.modify(
        sc.stripe_id,
        invoice_settings={"default_payment_method": pm},
    )

    # -------------------------
    # 3. サブスクリプション作成
    #    latest_invoice.payment_intent が返らない
    #    ケースにも対応する
    # -------------------------
    sub = stripe.Subscription.create(
        customer=sc.stripe_id,
        items=[{"price": price_id}],
        expand=["latest_invoice.payment_intent"],
    )

    # 追加認証(client_secret) を安全に取り出す
    client_secret = None

    # 3-1) 今すぐ支払いが走り payment_intent が付くケース
    if getattr(sub, "latest_invoice", None) and getattr(sub.latest_invoice, "payment_intent", None):
        client_secret = sub.latest_invoice.payment_intent.client_secret

    # 3-2) Card Setup → pending_setup_intent が返るケース
    elif getattr(sub, "pending_setup_intent", None):
        setup_intent  = stripe.SetupIntent.retrieve(sub.pending_setup_intent)
        client_secret = setup_intent.client_secret

    # -------------------------
    # 4. レスポンス
    # -------------------------
    return Response(
        {
            "client_secret": client_secret,  # 追加認証不要なら None
            "status":        sub.status,     # active / incomplete など
        },
        status=200,
    )

# =============================================================
#   検索回数制限ロジック
# =============================================================
FREE_THROTTLE_DAYS = 3  # 無料ユーザーは 3 日に 1 回

def _user_can_search(user: User) -> bool:
    """
    - 未ログイン → True
    - 有料 or トライアル中 → True
    - 無料 → last_search_at から 3 日経過していれば True
    """
    if not user.is_authenticated:
        return True

    try:
        sc = user.stripecustomer
    except StripeCustomer.DoesNotExist:
        return True  # まだ課金していない純無料ユーザー（検索制限無しならここを変更）

    # アクティブなサブスクがあれば無制限
    if Subscription.objects.filter(
        customer=sc,
        status__in=("active", "trialing"),
        current_period_end__gt=localtime(),
    ).exists():
        return True

    if sc.last_search_at is None:
        return True

    return localtime() - sc.last_search_at >= timedelta(days=FREE_THROTTLE_DAYS)

def _mark_search_performed(user: User):
    """検索成功後に最終検索日時を更新"""
    if not user.is_authenticated:
        return
    StripeCustomer.objects.update_or_create(
        user=user,
        defaults={"last_search_at": localtime()},
    )

# =============================================================
#   チャットボット（簡易エコー）
# =============================================================
class ChatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        msg = request.data.get("message", "")
        return Response({"reply": f"あなたのメッセージは「{msg}」ですね。"}, status=200)

# =============================================================
#   認証 (register / login など)  ※省略部分はそのまま
# =============================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    # ... (既存ロジックを保持)
    ...

# =============================================================
#   Stripe Billing Endpoints  (checkout, portal, webhook)
#   ※ create_checkout_session はほぼそのまま。重複回避のため1定義のみ
# =============================================================
# dojo/views.py  ── Stripe Hosted Checkout 版 ───────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    plan = request.data.get("plan", "monthly")
    price_id = settings.STRIPE_PRICE_YEARLY if plan == "yearly" else settings.STRIPE_PRICE_MONTHLY

    # ✅ Price 型チェック
    price_obj = stripe.Price.retrieve(price_id)
    if price_obj.type != "recurring":
        return Response(
            {"error": "指定された Price は one_time です。recurring を設定してください。"},
            status=400,
        )

    sc, _ = StripeCustomer.objects.get_or_create(user=request.user)
    if not sc.stripe_id:
        sc.stripe_id = stripe.Customer.create(email=request.user.email).id
        sc.save(update_fields=["stripe_id"])

    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        customer=sc.stripe_id,
        success_url=request.build_absolute_uri(
            "/billing/success?session_id={CHECKOUT_SESSION_ID}"
        ),
        cancel_url=request.build_absolute_uri("/billing/cancel"),
        line_items=[{"price": price_id, "quantity": 1}],
    )
    return Response({"sessionId": session.id})

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])  # Webhook
def stripe_webhook(request):
    payload = request.body
    sig = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        return Response(status=400)

    if event["type"] in ("checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"):
        _sync_subscription_from_event(event["data"]["object"])
    return Response(status=200)

def _sync_subscription_from_event(obj):
    """
    Checkout / Subscription イベント → ローカル DB を同期
    """
    # checkout.session.completed なら obj["subscription"] に ID が入っている
    if obj.get("object") == "checkout.session":
        sub_id = obj.get("subscription")
        customer_id = obj.get("customer")
        status = "active"
        current_period_end = None  # API 呼び出しで取得
    else:  # subscription.*
        sub_id = obj["id"]
        customer_id = obj["customer"]
        status = obj["status"]
        current_period_end = obj["current_period_end"]

    # local user
    sc, _ = StripeCustomer.objects.get_or_create(
        stripe_id=customer_id,
        defaults={"user": User.objects.filter(email=obj.get("customer_email")).first()},
    )
    if current_period_end is None:
        sub = stripe.Subscription.retrieve(sub_id)
        current_period_end = sub.current_period_end
        status = sub.status

    Subscription.objects.update_or_create(
        stripe_sub_id=sub_id,
        defaults={
            "customer": sc,
            "status": status,
            "current_period_end": datetime.fromtimestamp(current_period_end),
        },
    )
# ────────────────────────────────────────────────────
# ヘルパー: 制限メッセージの出し分け
# ────────────────────────────────────────────────────
def _throttle_message(days: int, lang: str = "en") -> str:
    """
    無料プランの制限メッセージを返す
    lang が 'ja' で始まれば日本語、そうでなければ英語
    """
    if lang.startswith("ja"):
        return f"無料プランでは検索は {days} 日に 1 回までです。"
    return f"Free plan: you can search once every {days} day(s)."

# =============================================================
#   検索系ビュー (回数制限を追加)
# =============================================================

# ────────────────────────────────────────────────────
# FetchDojoDataView.get （修正版）
# ────────────────────────────────────────────────────
class FetchDojoDataView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("query", "").strip()
        if not query:
            return Response({"error": "Query 'query' is required."}, status=400)

        lang = request.query_params.get("lang", "en")
        if not _user_can_search(request.user):
            return Response(
                {"error": _throttle_message(FREE_THROTTLE_DAYS, lang)},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        api_key = settings.GOOGLE_API_KEY
        dojo_data = async_to_sync(fetch_dojo_data_async)(query, api_key, max_pages=5)
        if dojo_data and "dojos" in dojo_data:
            self._save_dojos(dojo_data["dojos"])
        _mark_search_performed(request.user)
        return Response(dojo_data, status=200)

    # ★必ず定義しておく
    def _save_dojos(self, dojos):
        for d in dojos:
            Dojo.objects.update_or_create(
                place_id=d["place_id"],
                defaults={
                    "name": d.get("name", "Unknown"),
                    "address": d.get("address", ""),
                    "latitude": d.get("latitude"),
                    "longitude": d.get("longitude"),
                    "website": d.get("website", ""),
                    "hours": d.get("hours", []),
                    "rating": d.get("rating"),
                    "user_ratings_total": d.get("user_ratings_total"),
                },
            )


# ────────────────────────────────────────────────────
# FetchDojoDataNearbyView.get （修正版）
# ────────────────────────────────────────────────────
class FetchDojoDataNearbyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # 言語コードを毎回取る
        lang = request.query_params.get("lang", "en")

        if not _user_can_search(request.user):
            return Response(
                {"error": _throttle_message(FREE_THROTTLE_DAYS, lang)},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # あとは従来どおりの nearby 検索処理
        lat = float(request.query_params.get("lat", 49.2827))
        lng = float(request.query_params.get("lng", -123.1207))
        radius = int(request.query_params.get("radius", 30000))
        api_key = settings.GOOGLE_API_KEY

        dojos_data = async_to_sync(fetch_dojo_data_nearby_async)(
            lat=lat, lng=lng, radius=radius, api_key=api_key, max_pages=3
        )
        if dojos_data and "dojos" in dojos_data:
            self._save_dojos(dojos_data["dojos"])
        _mark_search_performed(request.user)
        return Response(dojos_data, status=200)

    def _save_dojos(self, dojos):
        for d in dojos:
            Dojo.objects.update_or_create(
                place_id=d["place_id"],
                defaults={
                    "name": d.get("name", "Unknown"),
                    "address": d.get("address", ""),
                    "latitude": d.get("latitude"),
                    "longitude": d.get("longitude"),
                    "website": d.get("website", ""),
                    "hours": d.get("hours", []),
                    "rating": d.get("rating"),
                    "user_ratings_total": d.get("user_ratings_total"),
                },
            )

class FetchPlaceDetailsView(APIView):
    permission_classes = [AllowAny]

    async def get(self, request, *args, **kwargs):
        place_id = request.query_params.get('place_id')
        if not place_id:
            return Response({"error": "place_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            return Response({"error": "Google API key is not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            detail = await fetch_place_details_async(place_id, api_key)
            if not detail:
                return Response({"error": "Failed to fetch place details."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response(detail, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in FetchPlaceDetailsView: {e}", exc_info=True)
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FetchInstagramLinkView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        website = request.data.get('website', "").strip()
        place_id = request.data.get('place_id', "").strip()
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            return Response({"error": "Google API key is not configured."}, status=500)

        if not website and place_id:
            detail = fetch_place_details(place_id, api_key)
            if detail and detail.get("website"):
                website = detail["website"]

        if not website:
            return Response({"error": "No website or place_id/website found."}, status=400)

        cache_key = f"instagram_link_{website.lower()}"
        cached_link = cache.get(cache_key)
        if cached_link is not None:
            return Response({'instagram': cached_link}, status=200)

        try:
            instagram_link = fetch_instagram_link(website)
            cache.set(cache_key, instagram_link, timeout=60 * 60 * 24)
            return Response({'instagram': instagram_link}, status=200)
        except Exception as e:
            logger.error(f"Error fetching Instagram link: {e}", exc_info=True)
            return Response({'error': 'Failed to fetch Instagram link.'}, status=500)


class SubmitFeedbackView(APIView):
    def post(self, request):
        serializer = FeedbackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info("Feedback submitted successfully.")
            return Response({'message': 'Feedback submitted successfully.'}, status=status.HTTP_201_CREATED)
        logger.error(f"Feedback submission failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TestSyncView(APIView):
    def get(self, request, *args, **kwargs):
        return Response({"message": "Sync test successful"}, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"detail": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token

            client_id = os.environ.get('GOOGLE_CLIENT_ID')
            id_info = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id
            )
            email = id_info.get('email')
            if not email:
                return Response({"detail": "Email not found in token"}, status=status.HTTP_400_BAD_REQUEST)
            
            user, created = User.objects.get_or_create(email=email, defaults={'username': email})
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            }, status=status.HTTP_200_OK)
        except ValueError:
            return Response({"detail": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


def get_tokens_for_user(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class LoginView(APIView):
    permission_classes = [AllowAny]  # 追加：未認証ユーザーからのアクセスを許可

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data
            tokens = get_tokens_for_user(user)
            return Response(tokens, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(APIView):
    permission_classes = [AllowAny]  # 未認証でもアクセス可能

    def post(self, request):
        data = request.data.copy()  # リクエストデータのコピー
        # usernameが提供されていなければ、emailをusernameとして利用する
        if not data.get('username'):
            data['username'] = data.get('email')
        # 既に同じ username (メールアドレス) のユーザーが存在する場合はエラーを返す
        if User.objects.filter(username=data['username']).exists():
            return Response(
                {'detail': 'A user with that email already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response(tokens, status=status.HTTP_201_CREATED)
        else:
            print('Serializer errors:', serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def test_view(request):
    return JsonResponse({"message": "Test successful"})


def simple_view(request):
    return JsonResponse({"message": "Simple view successful"})


class DojoViewSet(viewsets.ModelViewSet):
    queryset = Dojo.objects.all()
    serializer_class = DojoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['address', 'name']


class FavoriteViewSet(viewsets.ModelViewSet):
    queryset = Favorite.objects.all()
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        place_id = request.data.get("place_id")
        if not place_id:
            return Response({"error": "place_id is required"}, status=400)
        try:
            with transaction.atomic():
                api_key = settings.GOOGLE_API_KEY
                dojo_obj, created = Dojo.objects.get_or_create(
                    place_id=place_id,
                    defaults={
                        "name": request.data.get("name", "Unknown Dojo"),
                        "address": request.data.get("address", ""),
                        "latitude": request.data.get("latitude"),
                        "longitude": request.data.get("longitude"),
                        "website": request.data.get("website", ""),
                        "hours": request.data.get("hours", []),
                    }
                )
                if created or not dojo_obj.reviews:
                    detail_data = fetch_place_details(place_id, api_key)
                    if detail_data:
                        dojo_obj.rating = detail_data.get("rating")
                        dojo_obj.reviews = detail_data.get("reviews", [])
                        if detail_data.get("hours"):
                            dojo_obj.hours = detail_data["hours"]
                        if detail_data.get("website"):
                            dojo_obj.website = detail_data["website"]
                        if dojo_obj.website:
                            instagram_link = fetch_instagram_link(dojo_obj.website)
                            dojo_obj.instagram = instagram_link
                        dojo_obj.save()
                favorite, fav_created = Favorite.objects.get_or_create(user=request.user, dojo=dojo_obj)
                if not fav_created:
                    return Response({"error": "Favorite already exists."}, status=400)
                serializer = self.get_serializer(favorite)
                return Response(serializer.data, status=201)
        except Exception as e:
            logger.error(f"Error creating Favorite with place_id={place_id}: {e}", exc_info=True)
            return Response({"error": "Failed to create Favorite"}, status=500)


class PracticeDayViewSet(viewsets.ModelViewSet):
    queryset = PracticeDay.objects.all()
    serializer_class = PracticeDaySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PracticeDay.objects.filter(user=self.request.user).order_by('-date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        practice_day = serializer.save(user=request.user)
        return Response(self.get_serializer(practice_day).data, status=201)

# ─── Stripe Billing Endpoints ───────────────────────────────────
import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view

stripe.api_key = settings.STRIPE_SECRET_KEY



# --------------------------------------------
# Checkout セッション作成 API
# --------------------------------------------
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_checkout_session(request):
    """
    plan = monthly | yearly を受け取り、Stripe Checkout のサブスクセッションを返す。
    """
    plan = request.data.get("plan", "monthly")
    price_id = (
        settings.STRIPE_PRICE_YEARLY if plan == "yearly"
        else settings.STRIPE_PRICE_MONTHLY
    )

    # ---- 追加 : Price が recurring か確認 ---------------------------
    price_obj = stripe.Price.retrieve(price_id)
    if price_obj.type != "recurring":
        return Response(
            {"error": "指定された Price は one_time です。recurring を設定してください。"},
            status=400,
        )
    # ----------------------------------------------------------------

    # 顧客取得 or 作成
    customer_obj, _ = StripeCustomer.objects.get_or_create(
        user=request.user,
        defaults={
            "stripe_id": stripe.Customer.create(email=request.user.email).id
        },
    )

    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        customer=customer_obj.stripe_id,
        success_url=request.build_absolute_uri(
            "/billing/success?session_id={CHECKOUT_SESSION_ID}"
        ),
        cancel_url=request.build_absolute_uri("/billing/cancel"),
        line_items=[{"price": price_id, "quantity": 1}],
    )
    return Response({"sessionId": session.id})


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])  # Stripe からの Webhook は未認証
def stripe_webhook(request):
    payload = request.body
    sig = request.META.get("HTTP_STRIPE_SIGNATURE")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        return Response(status=400)

    if event["type"] in (
        "checkout.session.completed",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        data = event["data"]["object"]
        _sync_subscription_from_event(data)
    return Response(status=200)


def _sync_subscription_from_event(data):
    """
    Checkout/Subscription イベントからローカル DB を更新
    """
    sub = stripe.Subscription.retrieve(data["subscription"]) if "subscription" in data else data
    customer_id = sub["customer"]
    cust_obj, _ = StripeCustomer.objects.get_or_create(
        stripe_id=customer_id,
        defaults={"user": User.objects.filter(email=sub["customer_email"]).first()},
    )
    Subscription.objects.update_or_create(
        stripe_sub_id=sub["id"],
        defaults={
            "customer": cust_obj,
            "status": sub["status"],
            "current_period_end": datetime.fromtimestamp(sub["current_period_end"]),
        },
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def create_customer_portal(request):
    """
    ユーザー自身で解約・支払方法変更できる Customer Portal
    """
    try:
        customer = request.user.stripecustomer
    except StripeCustomer.DoesNotExist:
        return Response({"error": "No Stripe customer"}, status=400)

    portal = stripe.billing_portal.Session.create(
        customer=customer.stripe_id,
        return_url=request.build_absolute_uri("/dashboard/billing"),
    )
    return Response({"url": portal.url})
# ──────────────────────────────────────────────────────────────
