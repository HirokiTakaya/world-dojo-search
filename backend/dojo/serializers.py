# dojo/serializers.py

from rest_framework import serializers
from django.core.cache import cache
from django.contrib.auth import get_user_model, authenticate

from .models import Dojo, OpenMat, Feedback, Review, Favorite, PracticeDay
from .services import get_open_mat_info  # サービス層のインポート

User = get_user_model()


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['place_id', 'has_open_mat', 'created_at']
        read_only_fields = ['created_at']


class OpenMatSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpenMat
        fields = '__all__'


class DojoSerializer(serializers.ModelSerializer):
    open_mats = OpenMatSerializer(many=True, read_only=True)
    has_open_mat = serializers.SerializerMethodField()

    class Meta:
        model = Dojo
        fields = [
            'id',
            'name',
            'address',
            'latitude',
            'longitude',
            'website',
            'hours',
            'instagram',
            'place_id',
            'is_visitor_friendly',
            'open_mats',
            'has_open_mat',
            'rating',
            'reviews',
        ]

    def get_has_open_mat(self, obj):
        """
        Open Mat の有無を取得するメソッド
        """
        cache_key = f"open_mat_info_{obj.name.lower() if obj.name else obj.website.lower()}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return cached_result

        has_open_mat = get_open_mat_info(obj.name, obj.website)
        cache.set(cache_key, has_open_mat, timeout=86400)  # 24時間キャッシュ
        return has_open_mat


class FavoriteSerializer(serializers.ModelSerializer):
    dojo_id = serializers.PrimaryKeyRelatedField(
        source='dojo',
        queryset=Dojo.objects.all(),
        write_only=True
    )
    dojo = DojoSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'user', 'dojo_id', 'dojo']
        read_only_fields = ['user', 'dojo']


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)  # ユーザー名を表示

    class Meta:
        model = Review
        fields = ['id', 'user', 'dojo', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at', 'user']


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],  # username を email に設定
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")

        user = authenticate(username=user.username, password=password)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid credentials")
class PracticeDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeDay
        fields = ['id', 'user', 'date']
        read_only_fields = ['user']

# --- チャットボット用シリアライザーの追加 ---

class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1024)
    session = serializers.CharField(max_length=256, required=False)


class ChatResponseSerializer(serializers.Serializer):
    reply = serializers.CharField(max_length=2048)
