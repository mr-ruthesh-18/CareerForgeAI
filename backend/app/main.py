import json, os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from jose import JWTError
from .database import Base, engine, get_db
from .models import User, Job, Application
from .schemas import RegisterIn, LoginIn, SkillsIn, JobIn
from .security import hash_password, verify_password, create_access_token, decode_token

Base.metadata.create_all(bind=engine)
app = FastAPI(title="CareerForge AI API", version="1.0.0",
              description="Student career and placement-readiness portal API")
origins = [os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def parse_list(raw):
    try:
        value = json.loads(raw or "[]")
        return value if isinstance(value, list) else []
    except (ValueError, TypeError):
        return []

def user_dict(user):
    return {"id": user.id, "name": user.name, "email": user.email,
            "role": user.role, "department": user.department, "skills": parse_list(user.skills)}

def job_dict(job):
    return {"id": job.id, "title": job.title, "company": job.company,
            "description": job.description, "required_skills": parse_list(job.required_skills),
            "location": job.location, "job_type": job.job_type}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub", ""))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user

def require_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def match_score(user, job):
    have = {s.strip().lower() for s in parse_list(user.skills) if s.strip()}
    need = {s.strip().lower() for s in parse_list(job.required_skills) if s.strip()}
    if not need:
        return 100
    return round(100 * len(have & need) / len(need))

@app.get("/")
def root():
    return {"name": "CareerForge AI API", "docs": "/docs", "health": "/api/health"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/auth/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password),
                department=data.department.strip())
    db.add(user); db.commit(); db.refresh(user)
    token = create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer", "user": user_dict(user)}

@app.post("/api/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": create_access_token(user.id, user.role),
            "token_type": "bearer", "user": user_dict(user)}

@app.get("/api/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_dict(user)

@app.put("/api/students/me/skills")
def update_skills(data: SkillsIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    clean = list(dict.fromkeys(s.strip() for s in data.skills if s.strip()))
    user.skills = json.dumps(clean)
    db.commit(); db.refresh(user)
    return user_dict(user)

@app.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    jobs = db.query(Job).order_by(Job.id.desc()).all()
    return [{**job_dict(j), "match_score": match_score(user, j)} for j in jobs]

@app.post("/api/jobs", status_code=201)
def create_job(data: JobIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    job = Job(title=data.title.strip(), company=data.company.strip(), description=data.description.strip(),
              required_skills=json.dumps(list(dict.fromkeys(s.strip() for s in data.required_skills if s.strip()))),
              location=data.location.strip(), job_type=data.job_type.strip())
    db.add(job); db.commit(); db.refresh(job)
    return job_dict(job)

@app.delete("/api/jobs/{job_id}", status_code=204)
def delete_job(job_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.query(Application).filter(Application.job_id == job_id).delete()
    db.delete(job); db.commit()
    return None

@app.post("/api/jobs/{job_id}/apply", status_code=201)
def apply(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = db.query(Application).filter_by(student_id=user.id, job_id=job_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already applied to this job")
    application = Application(student_id=user.id, job_id=job_id)
    db.add(application)
    try:
        db.commit(); db.refresh(application)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="You already applied to this job")
    return {"message": "Application submitted", "application_id": application.id}

@app.get("/api/applications/me")
def my_applications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    records = db.query(Application).filter(Application.student_id == user.id).order_by(Application.id.desc()).all()
    return [{"id": a.id, "job_id": a.job_id, "job_title": a.job.title, "company": a.job.company,
             "status": a.status, "match_score": match_score(user, a.job)} for a in records]

@app.get("/api/admin/summary")
def admin_summary(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return {"students": db.query(User).filter(User.role == "student").count(),
            "jobs": db.query(Job).count(), "applications": db.query(Application).count()}

@app.get("/api/admin/applications")
def all_applications(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    records = db.query(Application).order_by(Application.id.desc()).all()
    return [{"id": a.id, "student_name": a.student.name, "student_email": a.student.email,
             "job_title": a.job.title, "company": a.job.company, "status": a.status} for a in records]

@app.patch("/api/admin/applications/{application_id}")
def update_application(application_id: int, status_value: str, db: Session = Depends(get_db),
                       admin: User = Depends(require_admin)):
    allowed = {"Applied", "Under Review", "Shortlisted", "Rejected"}
    if status_value not in allowed:
        raise HTTPException(status_code=422, detail=f"status_value must be one of {sorted(allowed)}")
    record = db.query(Application).filter(Application.id == application_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Application not found")
    record.status = status_value; db.commit()
    return {"message": "Application status updated", "status": record.status}
