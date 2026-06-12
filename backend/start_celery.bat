@echo off
REM ============================================================
REM  BiteStreak – Windows Celery Worker (solo pool)
REM  File: backend\start_celery.bat
REM
REM  WHY --pool=solo:
REM  Windows does not support the default "prefork" pool (uses
REM  os.fork which doesn't exist on Windows).  "gevent" and
REM  "eventlet" require C extensions that need Visual C++ 14+.
REM  "solo" runs tasks in the same thread with zero extra deps.
REM  It is single-threaded but perfectly fine for local dev.
REM
REM  Run from backend\ folder:   start_celery.bat
REM ============================================================

echo.
echo ========================================
echo   BiteStreak Celery Worker (solo pool)
echo ========================================
echo.

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] venv not found at .\venv\
    echo Run:  python -m venv venv  ^&^&  venv\Scripts\activate  ^&^&  pip install -r requirements.txt
    pause
    exit /b 1
)

set DJANGO_SETTINGS_MODULE=bitestreak.settings.local
set PYTHON=venv\Scripts\python.exe

echo Settings : %DJANGO_SETTINGS_MODULE%
echo Worker   : solo pool  (no gevent / no C compiler required)
echo.

REM ── Start Celery worker with solo pool ───────────────────────────────────
%PYTHON% -m celery -A bitestreak worker ^
    --pool=solo ^
    --loglevel=info ^
    --concurrency=1

pause
