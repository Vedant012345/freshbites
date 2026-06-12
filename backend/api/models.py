"""
BiteStreak – Database Models
All core models: User, DailyQR, Visit, Reward, MenuItem, ShopSettings
"""
import uuid
import random
import string
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


# ─── User Manager ────────────────────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, mobile_number, password=None, **extra_fields):
        if not mobile_number:
            raise ValueError("Mobile number is required")
        user = self.model(mobile_number=mobile_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, mobile_number, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        return self.create_user(mobile_number, password, **extra_fields)


# ─── User ─────────────────────────────────────────────────────────────────────

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [("customer", "Customer"), ("admin", "Admin")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    mobile_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="customer")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "mobile_number"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User"

    def __str__(self):
        return f"{self.name} ({self.mobile_number})"

    @property
    def current_cycle_visits(self):
        """Count visits in the current reward cycle (after last claimed reward)."""
        last_reward = self.rewards.filter(status="claimed").order_by("-claimed_date").first()
        cutoff = last_reward.claimed_date if last_reward else None
        qs = self.visits.all()
        if cutoff:
            qs = qs.filter(created_at__gt=cutoff)
        return qs.count()

    @property
    def visits_needed(self):
        return max(0, 7 - self.current_cycle_visits)


# ─── Daily QR ─────────────────────────────────────────────────────────────────

class DailyQR(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=64, unique=True)
    qr_date = models.DateField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_qrs"
    )

    class Meta:
        ordering = ["-qr_date"]
        verbose_name = "Daily QR Code"

    def __str__(self):
        return f"QR {self.qr_date} – {'Active' if self.is_active else 'Expired'}"

    @classmethod
    def get_today(cls):
        today = timezone.localdate()
        return cls.objects.filter(qr_date=today, is_active=True).first()

    @classmethod
    def generate_for_today(cls, created_by=None):
        today = timezone.localdate()
        # Deactivate old QRs
        cls.objects.filter(is_active=True).exclude(qr_date=today).update(is_active=False)
        # Generate token: date + uuid fragment
        token = f"{today.isoformat()}-{uuid.uuid4().hex[:16]}"
        obj, created = cls.objects.get_or_create(
            qr_date=today,
            defaults={"token": token, "is_active": True, "created_by": created_by},
        )
        return obj, created


# ─── Visit ────────────────────────────────────────────────────────────────────

class Visit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="visits")
    visit_date = models.DateField()
    qr_reference = models.ForeignKey(
        DailyQR, on_delete=models.SET_NULL, null=True, related_name="scans"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-visit_date"]
        # Enforce one scan per user per day
        unique_together = [("user", "visit_date")]
        verbose_name = "Visit"

    def __str__(self):
        return f"{self.user.name} – {self.visit_date}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._check_reward()

    def _check_reward(self):
        """Auto-generate reward after 7 visits in current cycle."""
        cycle_count = self.user.current_cycle_visits
        if cycle_count >= 7:
            # Only create if no pending reward already exists
            if not self.user.rewards.filter(status="pending").exists():
                Reward.objects.create(user=self.user)


# ─── Reward ───────────────────────────────────────────────────────────────────

def _generate_code():
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=8))
    return f"BITE-{suffix}"


class Reward(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("claimed", "Claimed"), ("expired", "Expired")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rewards")
    reward_code = models.CharField(max_length=20, unique=True, default=_generate_code)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    earned_date = models.DateField(auto_now_add=True)
    claimed_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-earned_date"]
        verbose_name = "Reward"

    def __str__(self):
        return f"{self.reward_code} – {self.user.name} [{self.status}]"

    def claim(self):
        if self.status != "pending":
            raise ValueError("Reward is not pending")
        self.status = "claimed"
        self.claimed_date = timezone.now()
        self.save()


# ─── Menu Item ────────────────────────────────────────────────────────────────

class MenuItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to="menu/", blank=True, null=True)
    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Menu Item"

    def __str__(self):
        return f"{self.name} – ${self.price}"


# ─── Shop Settings ────────────────────────────────────────────────────────────

class ShopSettings(models.Model):
    """Singleton model – only one record should exist."""
    shop_name = models.CharField(max_length=120, default="Streak Bites")
    tagline = models.CharField(max_length=200, blank=True)
    logo = models.ImageField(upload_to="shop/", blank=True, null=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    open_time = models.TimeField(default="10:00")
    close_time = models.TimeField(default="22:00")
    is_open = models.BooleanField(default=True)
    instagram = models.URLField(blank=True)
    facebook = models.URLField(blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Shop Settings"

    def __str__(self):
        return self.shop_name

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @property
    def is_currently_open(self):
        from datetime import datetime
        now = datetime.now().time()
        return self.is_open and self.open_time <= now <= self.close_time
