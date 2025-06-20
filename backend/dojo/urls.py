# dojo/urls.py

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    FetchDojoDataView,
    DojoViewSet,
    FetchInstagramLinkView,
    SubmitFeedbackView,
    TestSyncView,
    LoginView,
    RegisterView,
    GoogleLoginView,
    test_view,
    simple_view,
    PracticeDayViewSet,
    FavoriteViewSet,
    FetchPlaceDetailsView,
    ChatView,
     create_checkout_session,
    stripe_webhook,
    create_customer_portal,
   create_subscription_with_elements, 
)

router = DefaultRouter()
router.register(r'dojos', DojoViewSet, basename='dojo')
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'practice_days', PracticeDayViewSet, basename='practice_day')

urlpatterns = [
   
   
     path("stripe/create-subscription-with-elements/", create_subscription_with_elements, name="create_subscription_with_elements" ),
    path('fetch_dojo_data/', FetchDojoDataView.as_view(), name='fetch_dojo_data'),
    path('fetch_instagram_link/', FetchInstagramLinkView.as_view(), name='fetch_instagram_link'),
    path('submit_feedback/', SubmitFeedbackView.as_view(), name='submit_feedback'),
    path('test_sync/', TestSyncView.as_view(), name='test_sync'),
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('google-login/', GoogleLoginView.as_view(), name='google_login'),
    path('test/', test_view, name='test'),
    path('simple/', simple_view, name='simple'),
    path('fetch_place_details/', FetchPlaceDetailsView.as_view(), name='fetch_place_details'),
    path('chat/', ChatView.as_view(), name='chat'),
    path('stripe/create-checkout-session/', create_checkout_session, name='stripe_checkout'),
    path('stripe/webhook/', stripe_webhook, name='stripe_webhook'),
    path('stripe/customer-portal/', create_customer_portal, name='stripe_portal'),
  
]

urlpatterns += router.urls
