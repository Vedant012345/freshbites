"""
BiteStreak – URL Configuration
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path("register", views.RegisterView.as_view(), name="register"),
    path("login", views.LoginView.as_view(), name="login"),
    path("refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout", views.logout_view, name="logout"),

    # ── Customer ──────────────────────────────────────────────────────────────
    path("dashboard", views.dashboard_view, name="dashboard"),
    path("visits", views.visits_view, name="visits"),
    path("rewards", views.rewards_view, name="rewards"),
    path("rewards/claim", views.customer_claim_reward_view, name="claim_reward"),
    path("scan", views.scan_view, name="scan"),

    # ── Admin ──────────────────────────────────────────────────────────────────
    path("admin/stats", views.admin_stats_view, name="admin_stats"),
    path("admin/customers", views.admin_customers_view, name="admin_customers"),
    path("admin/generate-qr", views.generate_qr_view, name="generate_qr"),
    path("admin/today-qr", views.today_qr_view, name="today_qr"),
    path("admin/claim-reward", views.claim_reward_view, name="admin_claim_reward"),

    # ── Menu ──────────────────────────────────────────────────────────────────
    path("menu", views.MenuListView.as_view(), name="menu_list"),
    path("menu/<uuid:pk>", views.MenuDetailView.as_view(), name="menu_detail"),

    # ── Shop ──────────────────────────────────────────────────────────────────
    path("shop", views.shop_view, name="shop"),
    path("shop/update", views.shop_update_view, name="shop_update"),
]
