from getpass import getpass
from app.database import Base, engine, SessionLocal
from app.models import User
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    email = input("Admin email: ").strip().lower()
    name = input("Admin name: ").strip() or "CareerForge Admin"
    password = getpass("Admin password (minimum 8 characters): ")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise SystemExit("That email already exists. Use a different email.")
    db.add(User(name=name, email=email, password_hash=hash_password(password), role="admin"))
    db.commit()
    print("Admin account created. Sign in through the web app.")
finally:
    db.close()
