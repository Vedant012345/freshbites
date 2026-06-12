# ============================================================
#  BiteStreak – Windows Celery Worker (solo pool)
#  File: backend\start_celery.ps1
#  Run: PowerShell -ExecutionPolicy Bypass -File start_celery.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BiteStreak Celery Worker (solo pool)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  --pool=solo: no gevent, no C compiler, Windows native" -ForegroundColor Gray
Write-Host ""

$env:DJANGO_SETTINGS_MODULE = "bitestreak.settings.local"
$python = "venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "[ERROR] venv not found." -ForegroundColor Red
    exit 1
}

& $python -m celery -A bitestreak worker `
    --pool=solo `
    --loglevel=info `
    --concurrency=1
