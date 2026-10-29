from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="student", nullable=False)
    department = Column(String(100), default="")
    skills = Column(Text, default="[]")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    applications = relationship("Application", back_populates="student")

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(160), nullable=False)
    company = Column(String(160), nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(Text, default="[]")
    location = Column(String(120), default="Remote")
    job_type = Column(String(60), default="Full-time")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    applications = relationship("Application", back_populates="job")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    status = Column(String(30), default="Applied", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    student = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    __table_args__ = (UniqueConstraint("student_id", "job_id", name="uq_student_job"),)
