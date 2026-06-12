# ============================================================
#  BiteStreak – Windows Backend Startup Script
#  File: backend\start_dev.ps1
#
#  Run from the backend\ folder:
#    PowerShell -ExecutionPolicy Bypass -File start_dev.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BiteStreak Backend – Dev Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Point Django at the local (Windows-safe) settings ────────────────────────
$env:DJANGO_SETTINGS_MODULE = "bitestreak.settings.local"
Write-Host "[1/4] Settings module: $env:DJANGO_SETTINGS_MODULE" -ForegroundColor Green

# ── Verify venv is active ─────────────────────────────────────────────────────
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host ""
    Write-Host "[ERROR] Virtual environment not found at .\venv\" -ForegroundColor Red
    Write-Host "  Run: python -m venv venv" -ForegroundColor Yellow
    Write-Host "  Then: venv\Scripts\activate" -ForegroundColor Yellow
    Write-Host "  Then: pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}
$python = "venv\Scripts\python.exe"
Write-Host "[2/4] Python: $python" -ForegroundColor Green

# ── Run migrations ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Running migrations..." -ForegroundColor Yellow
& $python manage.py makemigrations --settings=bitestreak.settings.local
& $python manage.py migrate --settings=bitestreak.settings.local

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Migrations failed. Check output above." -ForegroundColor Red
    exit 1
}
Write-Host "Migrations OK" -ForegroundColor Green

# ── Start dev server ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Starting Django dev server at http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
& $python manage.py runserver 127.0.0.1:8000 --settings=bitestreak.settings.local
