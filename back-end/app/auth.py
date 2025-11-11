from datetime import timedelta, datetime, timezone
from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from . import db_model
from .database import get_db
from pwdlib import PasswordHash
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
from dotenv import load_dotenv
import os

router = APIRouter(prefix='/auth', tags=['auth'])

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
AlGORITHM = 'HS256'

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
ouath2_bearer = OAuth2PasswordBearer(tokenUrl='auth/login')
password_hash = PasswordHash.recommended()


db_dependency = Annotated[Session, Depends(get_db)]

class CreateUser(BaseModel):
    name: str
    email: str
    role: str
    password: str
    address: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: uuid.UUID
    
    class Config:
        extra = "ignore"

def get_password_hash(password):
    return password_hash.hash(password)

def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(db: db_dependency, user_request:CreateUser):
    hashed_password = get_password_hash(user_request.password)

    db_user = db_model.User(
        name = user_request.name,
        email = user_request.email,
        role = user_request.role,
        password_hash = hashed_password,
        address = user_request.address
        )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except Exception as e:
        db.rollback()
        print(f"Error inserting user: {e}")
        raise HTTPException(status_code=500, detail="Database error.")

    return db_user


@router.post("/login", response_model=Token)
async def login_for_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: db_dependency):
    user = authenticate_user(form_data.username, form_data.password, db)

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Could not validate user.')
    
    token = create_access_token(user.email, user.u_id, timedelta(minutes=20))

    return{'access_token': token, 'token_type': 'bearer'}
    
def authenticate_user(email: str, password: str, db):
    
    user = db.query(db_model.User).filter(db_model.User.email == email).first()
    if not user:
        return False

    if not verify_password(password, user.password_hash):
        return False
    
    return user

def create_access_token(email: str, u_id: uuid.UUID, expires_delta: timedelta):
    encode = {'id': str(u_id)}

    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp': expires})

    return jwt.encode(encode, SECRET_KEY, algorithm=AlGORITHM)

def get_current_user(token: Annotated[str, Depends(ouath2_bearer)], db: db_dependency):
    
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                          detail="Could not validate credentials",
                                          headers={"WWW-Authenticate": "Bearer"},
                                          )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[AlGORITHM])
        
        token_data = TokenData(**payload)

    except (JWTError, Exception):
        raise credentials_exception
        
    user = db.query(db_model.User).filter(db_model.User.u_id == token_data.id).first()
    
    if user is None:
        raise credentials_exception
    
    return user

def check_user_role(required_role: str):
    def role_checker(current_user: Annotated[db_model.User, Depends(get_current_user)]):
        if current_user.role != required_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Not authorized. User must have the role '{required_role}'.",)
        
        return current_user
    
    return role_checker