"""
BiteStreak – Serializers
Input validation and output shaping for all API endpoints.
"""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, DailyQR, Visit, Reward, MenuItem, ShopSettings


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["id", "name", "mobile_number", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CustomTokenSerializer(TokenObtainPairSerializer):
    """Include user info alongside JWT tokens."""
    username_field = "mobile_number"

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "name": self.user.name,
            "mobile_number": self.user.mobile_number,
            "role": self.user.role,
        }
        return data


# ─── User ─────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    current_cycle_visits = serializers.ReadOnlyField()
    visits_needed = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id", "name", "mobile_number", "role",
            "current_cycle_visits", "visits_needed", "created_at",
        ]
        read_only_fields = ["id", "role", "created_at"]


# ─── QR ───────────────────────────────────────────────────────────────────────

class DailyQRSerializer(serializers.ModelSerializer):
    scan_count = serializers.SerializerMethodField()

    class Meta:
        model = DailyQR
        fields = ["id", "token", "qr_date", "is_active", "scan_count", "created_at"]

    def get_scan_count(self, obj):
        return obj.scans.count()


# ─── Visit ────────────────────────────────────────────────────────────────────

class VisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visit
        fields = ["id", "visit_date", "created_at"]


class ScanSerializer(serializers.Serializer):
    """Validates incoming QR scan token."""
    token = serializers.CharField()

    def validate_token(self, value):
        qr = DailyQR.get_today()
        if qr is None:
            raise serializers.ValidationError("No active QR code for today.")
        if qr.token != value:
            raise serializers.ValidationError("Invalid QR code.")
        self._qr = qr
        return value

    def get_qr(self):
        return getattr(self, "_qr", None)


# ─── Reward ───────────────────────────────────────────────────────────────────

class RewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = ["id", "reward_code", "status", "earned_date", "claimed_date"]


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardSerializer(serializers.ModelSerializer):
    current_cycle_visits = serializers.ReadOnlyField()
    visits_needed = serializers.ReadOnlyField()
    total_visits = serializers.SerializerMethodField()
    rewards = RewardSerializer(many=True, read_only=True)
    recent_visits = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "mobile_number",
            "current_cycle_visits", "visits_needed",
            "total_visits", "rewards", "recent_visits",
        ]

    def get_total_visits(self, obj):
        return obj.visits.count()

    def get_recent_visits(self, obj):
        qs = obj.visits.order_by("-visit_date")[:10]
        return VisitSerializer(qs, many=True).data


# ─── Admin: Customer summary ──────────────────────────────────────────────────

class CustomerSummarySerializer(serializers.ModelSerializer):
    current_cycle_visits = serializers.ReadOnlyField()
    total_visits = serializers.SerializerMethodField()
    rewards_earned = serializers.SerializerMethodField()
    last_visit = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "mobile_number",
            "current_cycle_visits", "total_visits",
            "rewards_earned", "last_visit", "created_at",
        ]

    def get_total_visits(self, obj):
        return obj.visits.count()

    def get_rewards_earned(self, obj):
        return obj.rewards.count()

    def get_last_visit(self, obj):
        v = obj.visits.order_by("-visit_date").first()
        return str(v.visit_date) if v else None


# ─── Menu ─────────────────────────────────────────────────────────────────────

class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ["id", "name", "description", "price", "image", "available", "updated_at"]
        read_only_fields = ["id", "updated_at"]


# ─── Shop ─────────────────────────────────────────────────────────────────────

class ShopSettingsSerializer(serializers.ModelSerializer):
    is_currently_open = serializers.ReadOnlyField()

    class Meta:
        model = ShopSettings
        fields = [
            "shop_name", "tagline", "logo", "address", "phone",
            "open_time", "close_time", "is_open", "is_currently_open",
            "instagram", "facebook", "whatsapp",
        ]
