from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    department: str = Field(default="", max_length=100)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    department: str
    skills: List[str] = []
    model_config = ConfigDict(from_attributes=True)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class SkillsIn(BaseModel):
    skills: List[str] = Field(max_length=50)

class JobIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    company: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=10, max_length=5000)
    required_skills: List[str] = Field(default=[], max_length=50)
    location: str = Field(default="Remote", max_length=120)
    job_type: str = Field(default="Full-time", max_length=60)

class JobOut(BaseModel):
    id: int
    title: str
    company: str
    description: str
    required_skills: List[str]
    location: str
    job_type: str

class ApplicationOut(BaseModel):
    id: int
    job_id: int
    job_title: str
    company: str
    status: str
    match_score: int
