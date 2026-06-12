"""BiteStreak – Celery Application"""
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bitestreak.settings.base")

app = Celery("bitestreak")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
