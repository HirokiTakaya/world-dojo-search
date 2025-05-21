# views.py — FULL VERSION (Stripe Subscription integrated)
# -------------------------------------------------------------
# Django REST views for jiujitsuInfo project
# Updated: 2025‑04‑18
# -------------------------------------------------------------
"""Full views.py including original dojo logic + Stripe $5 CAD subscription endpoints."""

import logging
import os
import time
from datetime import datetime

import stripe
from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

# ─────────────── Stripe 初期化 ───────────────
stripe.api_key = settings.STRIPE_SECRET_KEY
if hasattr(settings, "STRIPE_API_VERSION"):
    stripe.api_version = settings.STRIPE_API_VERSION

# ─────────────── ロガー設定 ───────────────
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# ─────────────── Imports after logger ───────────────
from .models import Dojo, Feedback, Favorite, PracticeDay, StripeCustomer, Subscription
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

# ─── チャットボット用エンドポイント ─────────────────────────────
class ChatView(APIView):
    """
    チャットボット用エンドポイント。
    フロントエンドから送信されたメッセージに対し、シンプルなエコー応答を返します。
    必要に応じて、ここに実際のAI処理などを実装してください。
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # フロントエンドからは { "message": "...", "session": "..." } が送信される想定
        message = request.data.get("message", "")
        session = request.data.get("session", "")
        reply = f"あなたのメッセージは「{message}」ですね。"
        return Response({"reply": reply}, status=200)
# ──────────────────────────────────────────────────────────────


# =============================================================
#   認証まわり（Login / Register / Google）
# =============================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
# views.py — FULL VERSION (Stripe Subscription integrated)
# -------------------------------------------------------------
# Django REST views for jiujitsuInfo project
# Updated: 2025‑04‑18
# -------------------------------------------------------------
"""Full views.py including original dojo logic + Stripe $5 CAD subscription endpoints."""

import logging
import os
import time
from datetime import datetime

import stripe
from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

# ─────────────── Stripe 初期化 ───────────────
stripe.api_key = settings.STRIPE_SECRET_KEY
if hasattr(settings, "STRIPE_API_VERSION"):
    stripe.api_version = settings.STRIPE_API_VERSION

# ─────────────── ロガー設定 ───────────────
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# ─────────────── Imports after logger ───────────────
from .models import Dojo, Feedback, Favorite, PracticeDay, StripeCustomer, Subscription
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

# =============================================================
#   チャットボット（簡易エコー）
# =============================================================
class ChatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        message = request.data.get("message", "")
        session = request.data.get("session", "")
        reply = f"あなたのメッセージは「{message}」ですね。"
        return Response({"reply": reply}, status=200)

# =============================================================
#   認証まわり（Login / Register / Google）
# =============================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ... (GoogleLoginView, LoginView, RegisterView definitions remain unchanged)

# =============================================================
#   Stripe Billing Endpoints
# =============================================================
class CreateCheckoutSessionView(APIView):
    """POST /api/stripe/create-checkout-session/
    Body: {"plan": "monthly" | "yearly"}
    Returns: {"sessionId": "cs_..."}
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan", "monthly")
        price_id = (
            settings.STRIPE_PRICE_YEARLY
            if plan == "yearly"
            else settings.STRIPE_PRICE_MONTHLY
        )
        # Stripe customer を用意
        sc, _ = StripeCustomer.objects.get_or_create(
            user=request.user,
            defaults={"stripe_id": None},
        )
        customer_kwargs = {}
        if sc.stripe_id:
            customer_kwargs["customer"] = sc.stripe_id
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=request.build_absolute_uri(
                "/billing/success?session_id={CHECKOUT_SESSION_ID}"
            ),
            cancel_url=request.build_absolute_uri("/billing/cancel"),
            customer_email=request.user.email,
            **customer_kwargs,
        )
        if not sc.stripe_id:
            sc.stripe_id = session.customer
            sc.save(update_fields=["stripe_id"])
        return Response({"sessionId": session.id})

@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"Webhook error: {e}")
        return HttpResponse(status=400)

    # ------ ハンドラ ------
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data)
    elif event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        _handle_subscription_event(data)

    return HttpResponse(status=200)


def _handle_checkout_completed(session):
    logger.debug("Checkout completed: %s", session.get("id"))
    customer_id = session.get("customer")
    sub_id = session.get("subscription")
    _sync_subscription(customer_id, sub_id)


def _handle_subscription_event(subscription):
    customer_id = subscription.get("customer")
    sub_id = subscription.get("id")
    _sync_subscription(customer_id, sub_id, payload=subscription)


def _sync_subscription(customer_id, sub_id, payload=None):
    if not customer_id or not sub_id:
        return
    # Fetch local user
    try:
        sc = StripeCustomer.objects.get(stripe_id=customer_id)
    except StripeCustomer.DoesNotExist:
        logger.warning("StripeCustomer not found for %s", customer_id)
        return
    sub_obj, _ = Subscription.objects.update_or_create(
        stripe_sub_id=sub_id,
        defaults={
            "customer": sc,
            "status": payload.get("status") if payload else "active",
            "current_period_end": datetime.fromtimestamp(
                payload.get("current_period_end")
                if payload else stripe.Subscription.retrieve(sub_id).current_period_end
            ),
        },
    )
    logger.debug("Subscription synced: %s", sub_obj.id)


class CustomerPortalView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            sc = StripeCustomer.objects.get(user=request.user)
        except StripeCustomer.DoesNotExist:
            return Response({"error": "Stripe customer not found"}, status=404)
        portal = stripe.billing_portal.Session.create(
            customer=sc.stripe_id,
            return_url=request.build_absolute_uri("/dashboard/billing"),
        )
        return Response({"url": portal.url})


class FetchDojoDataView(APIView):
    """
    TextSearch ロジックで複数キーワード検索 → DB保存
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        query = request.query_params.get("query", "").strip()
        if not query:
            return Response({"error": "Query parameter 'query' is required."}, status=400)

        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            logger.error("Google API key is missing in settings.")
            return Response({"error": "Google API key is not configured."}, status=500)

        try:
            dojo_data = async_to_sync(fetch_dojo_data_async)(query, api_key, max_pages=5)
            if dojo_data and "dojos" in dojo_data:
                self.save_dojos_to_db(dojo_data["dojos"])
            else:
                logger.debug("No dojo data to save.")
            return Response(dojo_data, status=200)
        except Exception as e:
            logger.error(f"Unexpected error in FetchDojoDataView: {e}", exc_info=True)
            return Response({"error": "An unexpected error occurred."}, status=500)

    def save_dojos_to_db(self, dojos):
        for dojo in dojos:
            defaults = {
                "name": dojo.get("name", "Unknown Dojo"),
                "address": dojo.get("address", ""),
                "latitude": dojo.get("latitude"),
                "longitude": dojo.get("longitude"),
                "website": dojo.get("website", ""),
                "hours": dojo.get("hours", []),
                "rating": dojo.get("rating"),
                "user_ratings_total": dojo.get("user_ratings_total"),
            }
            Dojo.objects.update_or_create(place_id=dojo["place_id"], defaults=defaults)


class FetchDojoDataNearbyView(APIView):
    """
    nearbysearch + 並列キーワード検索（例: GET /api/fetch_dojo_data_nearby/?lat=49.2827&lng=-123.1207&radius=30000）
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        try:
            lat = float(request.query_params.get("lat", 49.2827))
            lng = float(request.query_params.get("lng", -123.1207))
            radius = int(request.query_params.get("radius", 30000))
            api_key = settings.GOOGLE_API_KEY
            if not api_key:
                return Response({"error": "Google API key not configured."}, status=500)

            dojos_data = async_to_sync(fetch_dojo_data_nearby_async)(
                lat=lat,
                lng=lng,
                radius=radius,
                api_key=api_key,
                max_pages=3,
            )
            if dojos_data and "dojos" in dojos_data:
                self.save_dojos_to_db(dojos_data["dojos"])
            return Response(dojos_data, status=200)
        except Exception as e:
            logger.error(f"Error in FetchDojoDataNearbyView: {e}", exc_info=True)
            return Response({"error": "An unexpected error occurred."}, status=500)

    def save_dojos_to_db(self, dojos):
        for dojo in dojos:
            defaults = {
                "name": dojo.get("name", "Unknown Dojo"),
                "address": dojo.get("address", ""),
                "latitude": dojo.get("latitude"),
                "longitude": dojo.get("longitude"),
                "website": dojo.get("website", ""),
                "hours": dojo.get("hours", []),
                "rating": dojo.get("rating"),
                "user_ratings_total": dojo.get("user_ratings_total"),
            }
            Dojo.objects.update_or_create(place_id=dojo["place_id"], defaults=defaults)


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


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_checkout_session(request):
    """
    フロントエンド → POST plan=monthly|yearly
    Stripe Checkout セッションを返す
    """
    plan = request.data.get("plan", "monthly")
    price_id = (
        settings.STRIPE_PRICE_MONTHLY
        if plan == "monthly"
        else settings.STRIPE_PRICE_YEARLY
    )

    # 既存 StripeCustomer があれば再利用
    customer_obj, _ = StripeCustomer.objects.get_or_create(
        user=request.user,
        defaults={"stripe_id": stripe.Customer.create(email=request.user.email).id},
    )

    session = stripe.checkout.Session.create(
        mode="subscription",
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
