@echo off
REM ============================================================
REM  BiteStreak – Windows CMD Backend Startup
REM  File: backend\start_dev.bat
REM  Run from backend\ folder:   start_dev.bat
REM ============================================================

echo.
echo ========================================
echo   BiteStreak Backend – Dev Server
echo ========================================
echo.

REM ── Set Django settings to local (Windows-safe) ──────────────────────────
set DJANGO_SETTINGS_MODULE=bitestreak.settings.local
echo [1/4] DJANGO_SETTINGS_MODULE=%DJANGO_SETTINGS_MODULE%

REM ── Check venv exists ────────────────────────────────────────────────────
if not exist "venv\Scripts\python.exe" (
    echo.
    echo [ERROR] venv not found. Create it first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

set PYTHON=venv\Scripts\python.exe
echo [2/4] Using: %PYTHON%

REM ── Migrations ───────────────────────────────────────────────────────────
echo.
echo [3/4] Running migrations...
%PYTHON% manage.py makemigrations
%PYTHON% manage.py migrate

if errorlevel 1 (
    echo [ERROR] Migration failed.
    pause
    exit /b 1
)
echo Migrations OK.

REM ── Start server ─────────────────────────────────────────────────────────
echo.
echo [4/4] Starting server at http://127.0.0.1:8000
echo Press Ctrl+C to stop.
echo.
%PYTHON% manage.py runserver 127.0.0.1:8000
pause
