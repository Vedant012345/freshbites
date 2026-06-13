"""
BiteStreak – API Views
All business logic: auth, scanning, rewards, admin operations.
"""
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, DailyQR, Visit, Reward, MenuItem, ShopSettings
from .serializers import (
    RegisterSerializer, CustomTokenSerializer, DashboardSerializer,
    VisitSerializer, RewardSerializer, ScanSerializer, DailyQRSerializer,
    CustomerSummarySerializer, MenuItemSerializer, ShopSettingsSerializer,
    UserSerializer,
)
from .permissions import IsAdmin


# ─── Throttle for scan endpoint (strict) ─────────────────────────────────────

class ScanThrottle(UserRateThrottle):
    rate = "10/minute"


# ─── AUTH ─────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """POST /api/register – Create customer account."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Save user instance
        user = serializer.save()

        # Capture and store plain text password on registration for admin lookup
        raw_password = request.data.get("password")
        if raw_password:
            user.password_plain = raw_password
            user.save(update_fields=["password_plain"])

        # Return tokens immediately on registration
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/login – JWT login by mobile number + password."""
    serializer_class = CustomTokenSerializer
    permission_classes = [permissions.AllowAny]


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """POST /api/logout – Blacklist refresh token."""
    try:
        refresh_token = request.data.get("refresh")
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"detail": "Logged out successfully."})
    except Exception:
        return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


# ─── CUSTOMER ─────────────────────────────────────────────────────────────────

@api_view(["GET"])
def dashboard_view(request):
    """GET /api/dashboard – Full customer dashboard data."""
    serializer = DashboardSerializer(request.user)
    return Response(serializer.data)


@api_view(["GET"])
def visits_view(request):
    """GET /api/visits – Paginated visit history."""
    visits = request.user.visits.all()
    serializer = VisitSerializer(visits, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def rewards_view(request):
    """GET /api/rewards – All rewards for current user."""
    rewards = request.user.rewards.all()
    serializer = RewardSerializer(rewards, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@throttle_classes([ScanThrottle])
def scan_view(request):
    """
    POST /api/scan – Validate QR token and record today's visit.
    Rules enforced:
      - One scan per user per calendar day
      - Token must match today's active QR
      - Auto-generates reward on 7th visit
    """
    serializer = ScanSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    qr = serializer.get_qr()
    today = timezone.localdate()

    try:
        visit = Visit.objects.create(
            user=request.user,
            visit_date=today,
            qr_reference=qr,
        )
    except IntegrityError:
        # unique_together (user, visit_date) violated → already scanned today
        return Response(
            {
                "detail": "Today's visit already marked. Try again tomorrow!",
                "already_scanned": True,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user
    cycle_visits = user.current_cycle_visits
    reward_earned = user.rewards.filter(
        earned_date=today, status="pending"
    ).first()

    response_data = {
        "visit": VisitSerializer(visit).data,
        "cycle_visits": cycle_visits,
        "visits_needed": user.visits_needed,
        "reward_earned": RewardSerializer(reward_earned).data if reward_earned else None,
    }
    return Response(response_data, status=status.HTTP_201_CREATED)


# ─── ADMIN ────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_stats_view(request):
    """GET /api/admin/stats – Overview statistics."""
    from django.db.models import Count
    today = timezone.localdate()

    data = {
        "total_customers": User.objects.filter(role="customer").count(),
        "total_visits": Visit.objects.count(),
        "today_visitors": Visit.objects.filter(visit_date=today).count(),
        "pending_rewards": Reward.objects.filter(status="pending").count(),
        "claimed_rewards": Reward.objects.filter(status="claimed").count(),
        "today_qr_active": DailyQR.objects.filter(qr_date=today, is_active=True).exists(),
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_customers_view(request):
    """GET /api/admin/customers – Customer list with stats."""
    search = request.query_params.get("search", "")
    customers = User.objects.filter(role="customer")
    if search:
        customers = customers.filter(name__icontains=search) | customers.filter(
            mobile_number__icontains=search
        )
    serializer = CustomerSummarySerializer(customers, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAdmin])
def generate_qr_view(request):
    """POST /api/admin/generate-qr – Generate today's QR code."""
    today = timezone.localdate()
    
    # Check if active QR for the local target date already exists to prevent duplicates
    qr = DailyQR.objects.filter(qr_date=today, is_active=True).first()
    created = False
    
    if not qr:
        qr, created = DailyQR.generate_for_today(created_by=request.user)
        if qr and qr.qr_date != today:
            qr.qr_date = today
            qr.save(update_fields=["qr_date"])
            
    serializer = DailyQRSerializer(qr)
    return Response(
        {**serializer.data, "created": created},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAdmin])
def today_qr_view(request):
    """
    GET /api/admin/today-qr – Retrieve today's QR.
    Automatically handles midnight transition refresh if old QR is stale.
    """
    today = timezone.localdate()
    qr = DailyQR.objects.filter(qr_date=today, is_active=True).first()
    
    if not qr:
        qr, created = DailyQR.generate_for_today(created_by=request.user)
        if qr and qr.qr_date != today:
            qr.qr_date = today
            qr.save(update_fields=["qr_date"])
            
    if not qr or not qr.is_active:
        return Response({"detail": "No active QR generated for today."}, status=status.HTTP_404_NOT_FOUND)
        
    return Response(DailyQRSerializer(qr).data)


@api_view(["POST"])
@permission_classes([IsAdmin])
def claim_reward_view(request):
    """POST /api/admin/claim-reward – Mark a reward as claimed."""
    reward_code = request.data.get("reward_code")
    try:
        reward = Reward.objects.get(reward_code=reward_code)
        reward.claim()
        return Response(RewardSerializer(reward).data)
    except Reward.DoesNotExist:
        return Response({"detail": "Reward not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─── CUSTOMER REWARD CLAIM ────────────────────────────────────────────────────

@api_view(["POST"])
def customer_claim_reward_view(request):
    """POST /api/rewards/{id}/claim – Customer marks reward as claimed at counter."""
    reward_id = request.data.get("reward_id")
    try:
        reward = Reward.objects.get(id=reward_id, user=request.user)
        reward.claim()
        return Response(RewardSerializer(reward).data)
    except Reward.DoesNotExist:
        return Response({"detail": "Reward not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─── MENU ─────────────────────────────────────────────────────────────────────

class MenuListView(generics.ListCreateAPIView):
    """
    GET  /api/menu – Public menu listing
    POST /api/menu – Admin: add menu item
    """
    serializer_class = MenuItemSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = MenuItem.objects.all()
        if self.request.method == "GET":
            qs = qs.filter(available=True)
        return qs


class MenuDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PUT/DELETE /api/menu/{id} – Admin: edit or delete menu item."""
    serializer_class = MenuItemSerializer
    queryset = MenuItem.objects.all()
    permission_classes = [IsAdmin]


# ─── SHOP SETTINGS ────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def shop_view(request):
    """GET /api/shop – Public shop info."""
    shop = ShopSettings.get()
    return Response(ShopSettingsSerializer(shop).data)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAdmin])
def shop_update_view(request):
    """Admin: update shop settings."""
    shop = ShopSettings.get()
    serializer = ShopSettingsSerializer(shop, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)