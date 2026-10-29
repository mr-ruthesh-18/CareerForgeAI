# CareerForge AI — ApexRise Python Full Stack Mini Project

CareerForge AI is a student career and placement-readiness portal built with **FastAPI + React + SQLite**. The current release includes skills management, job listings, skill-match scores, student applications, and an administrator dashboard.

> This is an educational starter project. Use synthetic/demo data. The match score is a simple overlap metric, not an AI hiring prediction.

## Features
- Student registration and login with signed JWT access tokens
- Password hashing using PBKDF2-HMAC-SHA256
- Student profile and skills management
- Searchable job listings and transparent skill-overlap scores
- Apply to jobs; prevent duplicate applications
- Admin-only job creation and application status management
- Admin summary metrics and application list
- Responsive React interface
- SQLite database created automatically

## Stack
- Backend: Python 3.10+, FastAPI, SQLAlchemy, SQLite, python-jose
- Frontend: React 18, Vite, JavaScript, CSS
- API documentation: Swagger UI at `/docs`

## Requirements
- Python 3.10 or later (Python 3.12 is supported)
- Node.js 20 LTS recommended, npm
- Windows PowerShell / Command Prompt, macOS, or Linux

## Run on Windows

### 1. Backend
Open Command Prompt:
```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```
Edit `backend\.env` and set a strong random `SECRET_KEY`. For local testing the fallback key works, but do not deploy with it.

Start the API:
```bat
uvicorn app.main:app --reload --port 8000
```
Check `http://localhost:8000/api/health` and API docs at `http://localhost:8000/docs`.

Open a second terminal (keep the backend running) to seed sample listings:
```bat
cd backend
.venv\Scripts\activate
python seed_demo.py
```
Demo student: `student@example.com` / `Student123!`. Change this password and use only local demo data. To create an admin account:
```bat
python create_admin.py
```
Use your own admin email and a strong password. Admin registration is intentionally not public.

### 2. Frontend
Open another terminal:
```bat
cd frontend
npm install
copy .env.example .env
npm run dev
```
Open `http://localhost:5173`. Log in using the demo student credentials or create a student account. Admins sign in with the account created by `create_admin.py`.

## Run on macOS/Linux
Backend activation: `source .venv/bin/activate`. Copy environment examples using `cp .env.example .env`. Frontend commands are the same.

## API quick reference
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register student |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Authenticated | Current profile |
| PUT | `/api/students/me/skills` | Authenticated | Update skills |
| GET | `/api/jobs` | Authenticated | List jobs and match scores |
| POST | `/api/jobs` | Admin | Create listing |
| DELETE | `/api/jobs/{id}` | Admin | Delete listing |
| POST | `/api/jobs/{id}/apply` | Authenticated | Apply |
| GET | `/api/applications/me` | Authenticated | Own applications |
| GET | `/api/admin/summary` | Admin | Dashboard counts |
| GET | `/api/admin/applications` | Admin | All applications |
| PATCH | `/api/admin/applications/{id}?status_value=Shortlisted` | Admin | Update status |

## Test checklist
1. Open `/api/health`; expect `{"status":"ok"}`.
2. Register a new student; duplicate email should return HTTP 409.
3. Update skills to `Python, SQL, React`; check job match scores update.
4. Apply to a job; it should appear under Recent applications.
5. Apply to the same job again; expect HTTP 409.
6. Log in as admin; create a listing and inspect the summary counts.
7. Change an application status to Shortlisted; verify it updates.
8. Try admin endpoints as a student; expect HTTP 403.

## Troubleshooting
- `python` not recognized: install Python and enable “Add Python to PATH”.
- `npm` not recognized: install Node.js LTS, reopen terminal, and check `node -v` / `npm -v`.
- CORS error: frontend origin defaults to `http://localhost:5173`; align `FRONTEND_ORIGIN` if the port changes.
- Database reset for a fresh demo: stop the API and delete `backend/careerforge.db`, then run `seed_demo.py` again.
- Port already used: choose a different Uvicorn port and update `VITE_API_BASE_URL` only if the backend address changes.

## Security and deployment notes
- Set `SECRET_KEY` to a long random secret and keep `.env` out of Git.
- Do not expose demo credentials on a public deployment; change or remove seeded demo users.
- For production, add HTTPS, rate limiting, email verification, password reset, audit logging, database migrations, stricter CORS, and secure token storage (avoid localStorage for sensitive production deployments).
- Configure secrets and database URL through the hosting provider's environment settings.
- Never upload real student records or resumes without consent and appropriate safeguards.

## Scope limitations / future work
- The “AI” branding refers to career-readiness assistance; the current score is deterministic skill overlap, not a trained ML model or LLM.
- Planned extensions: resume parsing, skill-gap recommendations, email notifications, CSV exports, interview practice, tests, and PostgreSQL deployment.
