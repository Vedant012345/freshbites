"""
BiteStreak – Celery Tasks
Background jobs: QR expiry, reward expiry, daily QR auto-generation.
"""
from celery import shared_task
from django.utils import timezone


@shared_task
def expire_daily_qr():
    """
    Deactivate QR codes from previous days.
    Runs every minute via Celery Beat; actual expiry logic is date-based.
    """
    from .models import DailyQR
    today = timezone.localdate()
    expired = DailyQR.objects.filter(is_active=True).exclude(qr_date=today)
    count = expired.update(is_active=False)
    if count:
        return f"Expired {count} QR code(s)"
    return "No QR codes to expire"


@shared_task
def auto_generate_daily_qr():
    """
    Auto-generate a QR code for today at midnight.
    Schedule this via Celery Beat with a cron at 00:00 UTC.
    """
    from .models import DailyQR
    qr, created = DailyQR.generate_for_today()
    return f"QR {'created' if created else 'already exists'} for {qr.qr_date}"


@shared_task
def expire_old_rewards():
    """
    Expire pending rewards older than 30 days.
    Run daily.
    """
    from .models import Reward
    from datetime import timedelta
    cutoff = timezone.localdate() - timedelta(days=30)
    count = Reward.objects.filter(
        status="pending", earned_date__lt=cutoff
    ).update(status="expired")
    return f"Expired {count} reward(s)"
