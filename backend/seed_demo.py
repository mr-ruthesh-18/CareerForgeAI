import json
from app.database import Base, engine, SessionLocal
from app.models import User, Job
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    demo_email = "student@example.com"
    if not db.query(User).filter(User.email == demo_email).first():
        db.add(User(name="Demo Student", email=demo_email, password_hash=hash_password("Student123!"),
                    role="student", department="Computer Science", skills=json.dumps(["Python", "SQL", "React"])))
    samples = [
        ("Python Backend Intern", "ApexRise Demo Labs", "Build and maintain REST APIs, write tests, and collaborate with frontend developers.", ["Python", "FastAPI", "SQL"], "Remote", "Internship"),
        ("Frontend Developer Intern", "ApexRise Demo Labs", "Build responsive React interfaces and integrate APIs with accessible UI components.", ["React", "JavaScript", "CSS"], "Hybrid", "Internship"),
        ("Full Stack Trainee", "Sample Technology Co.", "Develop web features across frontend and backend, manage database records, and test endpoints.", ["Python", "React", "SQL"], "Hyderabad", "Full-time")
    ]
    for title, company, description, skills, location, job_type in samples:
        if not db.query(Job).filter_by(title=title, company=company).first():
            db.add(Job(title=title, company=company, description=description,
                       required_skills=json.dumps(skills), location=location, job_type=job_type))
    db.commit()
    print("Demo data ready. Login: student@example.com / Student123!")
finally:
    db.close()
