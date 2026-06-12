# BiteStreak – Windows Local Development Setup
## Complete fix for all three issues: manage.py, Celery, and Vite 404

---

## What Was Missing / Broken

| Problem | Root Cause | Fix Applied |
|---|---|---|
| `manage.py` missing | File never generated | Added `backend/manage.py` |
| `DEBUG=False` crash | `.env` had wrong value | New `settings/local.py` forces `DEBUG=True` |
| `ALLOWED_HOSTS` error | Production settings used locally | `local.py` sets `ALLOWED_HOSTS = ["*"]` |
| Celery gevent crash | gevent needs C++ compiler | Use `--pool=solo` (zero extra deps) |
| Vite HTTP 404 | `index.html` + `main.jsx` missing | Both files added to correct locations |
| `VITE_API_URL` undefined | `.env.local` missing | Added `frontend/.env.local` |

---

## Final File Structure After Fixes

```
backend\
├── manage.py                          ← NEW (was missing)
├── .env                               ← NEW (local values)
├── requirements.txt                   ← UPDATED (removed gevent)
├── requirements-local.txt             ← NEW (minimal Windows install)
├── start_dev.bat                      ← NEW (one-click Django start)
├── start_dev.ps1                      ← NEW (PowerShell version)
├── start_celery.bat                   ← NEW (Celery with --pool=solo)
├── start_celery.ps1                   ← NEW (PowerShell version)
├── api\
│   ├── __init__.py                    ← NEW (required)
│   └── apps.py                        ← NEW (required)
└── bitestreak\
    ├── __init__.py                    ← NEW (loads Celery app)
    ├── wsgi.py                        ← NEW (was missing)
    ├── asgi.py                        ← NEW (was missing)
    └── settings\
        ├── __init__.py                ← NEW (makes it a package)
        ├── base.py                    ← existing (production settings)
        └── local.py                   ← NEW (Windows dev overrides)

frontend\
├── index.html                         ← NEW (Vite entry point)
├── .env.local                         ← NEW (VITE_API_URL)
├── vite.config.js                     ← existing (already correct)
└── src\
    ├── main.jsx                       ← NEW (React mount point)
    └── index.css                      ← NEW (Tailwind directives)
```

---

## STEP 1 — Backend Setup

Open a terminal (CMD or PowerShell) in the `backend\` folder.

### 1a. Create and activate the virtual environment

```powershell
# PowerShell
cd C:\Users\Lenevo\Downloads\bitestreak-loyalty-system\bitestreak-app\backend

python -m venv venv
venv\Scripts\Activate.ps1
```

```cmd
:: CMD
cd C:\Users\Lenevo\Downloads\bitestreak-loyalty-system\bitestreak-app\backend

python -m venv venv
venv\Scripts\activate.bat
```

If PowerShell blocks the activate script, run this once:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 1b. Install the minimal local requirements (no C++ compiler needed)

```powershell
pip install -r requirements-local.txt
```

This installs Django, DRF, JWT, CORS, Celery, Pillow, QRCode — nothing that needs Visual C++.

### 1c. Set the settings module (one-time per terminal session)

```powershell
# PowerShell
$env:DJANGO_SETTINGS_MODULE = "bitestreak.settings.local"
```

```cmd
:: CMD
set DJANGO_SETTINGS_MODULE=bitestreak.settings.local
```

### 1d. Run migrations

```powershell
python manage.py makemigrations
python manage.py migrate
```

Expected output:
```
Operations to perform:
  Apply all migrations: admin, api, auth, contenttypes, sessions, token_blacklist
Running migrations:
  Applying api.0001_initial... OK
  ...
```

### 1e. Create your admin user

```powershell
python manage.py createsuperuser
```

Enter a mobile number (e.g. `+15550000001`), name, and password.
Then set the role to admin via the shell:

```powershell
python manage.py shell
```
```python
from api.models import User
u = User.objects.get(mobile_number='+15550000001')
u.role = 'admin'
u.save()
exit()
```

### 1f. Start the Django dev server

**Option A — Use the batch script (easiest):**
```cmd
start_dev.bat
```

**Option B — Manual:**
```powershell
python manage.py runserver 127.0.0.1:8000 --settings=bitestreak.settings.local
```

✅ Django is running at: **http://127.0.0.1:8000**
✅ API root: **http://127.0.0.1:8000/api/shop**
✅ Django Admin: **http://127.0.0.1:8000/django-admin/**

---

## STEP 2 — Celery Worker (optional for local dev)

> **Note:** `settings/local.py` sets `CELERY_TASK_ALWAYS_EAGER = True`,
> which means tasks run synchronously inside Django's process.
> You only need a real Celery worker if you want background processing.

If you want the worker running, open a **second terminal** in `backend\`:

```powershell
# Activate venv first
venv\Scripts\Activate.ps1

$env:DJANGO_SETTINGS_MODULE = "bitestreak.settings.local"
```

**Why `--pool=solo`?**
- Windows doesn't support `fork()` → `prefork` pool fails
- `gevent` and `eventlet` need C++ compiler → build error
- `--pool=solo` runs tasks in the main thread — no extensions, no compiler

```powershell
# PowerShell
python -m celery -A bitestreak worker --pool=solo --loglevel=info
```

```cmd
:: CMD (or just double-click start_celery.bat)
start_celery.bat
```

---

## STEP 3 — Frontend Setup

Open a **third terminal** in the `frontend\` folder.

### 3a. Install Node dependencies

```powershell
cd C:\Users\Lenevo\Downloads\bitestreak-loyalty-system\bitestreak-app\frontend
npm install
```

### 3b. Confirm .env.local exists

The file `frontend\.env.local` must contain:
```
VITE_API_URL=http://127.0.0.1:8000/api
```

It has already been created. If Vite can't reach the API even with this set,
the `vite.config.js` proxy (`/api → http://localhost:8000`) handles it transparently.

### 3c. Start Vite

```powershell
npm run dev
```

Expected output:
```
  VITE v5.x  ready in 1300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

✅ Open **http://localhost:5173/** — the landing page loads.

---

## Why the 404 Happened

Vite requires `index.html` at the **project root** (same level as `vite.config.js`).
When Vite starts, it looks for `index.html` → finds `<script type="module" src="/src/main.jsx">` 
→ loads React. Without `index.html`, Vite has no entry point and serves a blank 404.

The file `frontend\index.html` has been added. It references `src/main.jsx` which mounts the React app into `<div id="root">`.

---

## Running All Three Together (Three Terminals)

| Terminal | Folder | Command |
|---|---|---|
| 1 – Django | `backend\` | `start_dev.bat` or `python manage.py runserver 127.0.0.1:8000` |
| 2 – Celery | `backend\` | `start_celery.bat` (optional) |
| 3 – Vite | `frontend\` | `npm run dev` |

---

## Quick Test Checklist

After all three are running:

- [ ] `http://127.0.0.1:8000/api/shop` → returns JSON (Django OK)
- [ ] `http://localhost:5173/` → shows landing page (Vite OK)
- [ ] Register at `/register` → creates account (API + DB OK)
- [ ] Login → redirected to dashboard (JWT OK)
- [ ] `http://127.0.0.1:8000/django-admin/` → admin panel (Django Admin OK)

---

## Common Errors & Fixes

| Error | Fix |
|---|---|
| `'python' is not recognized` | Install Python 3.10+ and add to PATH, or use `py` instead of `python` |
| `cannot be loaded because running scripts is disabled` | Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `ModuleNotFoundError: No module named 'bitestreak'` | Run commands from inside the `backend\` folder, not the root |
| `No module named 'environ'` | Run `pip install -r requirements-local.txt` with venv active |
| `Address already in use :8000` | Another process owns port 8000. Run: `netstat -ano \| findstr :8000` then `taskkill /PID <pid> /F` |
| `Vite: Could not auto-determine entry point` | `frontend\index.html` was missing — it has now been added |
| `gevent build failed` | Do NOT install gevent. Use `--pool=solo` for Celery on Windows |
