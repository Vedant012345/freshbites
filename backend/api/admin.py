"""BiteStreak – Django Admin"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, DailyQR, Visit, Reward, MenuItem, ShopSettings


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["name", "mobile_number", "role", "current_cycle_visits", "created_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["name", "mobile_number"]
    ordering = ["-created_at"]
    fieldsets = (
        (None, {"fields": ("mobile_number", "password")}),
        ("Personal", {"fields": ("name",)}),
        ("Permissions", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"fields": ("mobile_number", "name", "password1", "password2", "role")}),
    )


@admin.register(DailyQR)
class DailyQRAdmin(admin.ModelAdmin):
    list_display = ["qr_date", "token", "is_active", "created_at"]
    list_filter = ["is_active"]
    actions = ["deactivate_selected"]

    def deactivate_selected(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_selected.short_description = "Deactivate selected QR codes"


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ["user", "visit_date", "created_at"]
    list_filter = ["visit_date"]
    search_fields = ["user__name", "user__mobile_number"]
    date_hierarchy = "visit_date"


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ["reward_code", "user", "status", "earned_date", "claimed_date"]
    list_filter = ["status"]
    search_fields = ["reward_code", "user__name"]
    actions = ["mark_claimed"]

    def mark_claimed(self, request, queryset):
        for reward in queryset.filter(status="pending"):
            reward.claim()
    mark_claimed.short_description = "Mark selected rewards as claimed"


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ["name", "price", "available", "updated_at"]
    list_filter = ["available"]
    search_fields = ["name"]


@admin.register(ShopSettings)
class ShopSettingsAdmin(admin.ModelAdmin):
    list_display = ["shop_name", "phone", "open_time", "close_time", "is_open"]
