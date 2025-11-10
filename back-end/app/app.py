from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Annotated, Optional
from fastapi.security import OAuth2PasswordRequestForm
from . import quotation
from . import invoice
from . import receipt
from . import auth
from . import db_model 
from . import notification_service
from . import line_webhook
from .auth import get_current_user,check_user_role
from .database import engine, SessionLocal, get_db
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import timedelta, date
import uuid 
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quotation.router) 
app.include_router(invoice.router) 
app.include_router(receipt.router) 
app.include_router(auth.router) 
app.include_router(line_webhook.router) 

db_model.Base.metadata.create_all(bind=engine, checkfirst=True)

DBDependency = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[db_model.User, Depends(get_current_user)]

class UserBase(BaseModel):
    u_id: uuid.UUID
    name: str
    email: str
    role: str
    class Config:
        from_attributes = True

class CompanyProfileResponse(BaseModel):
    company_id: int
    company_name: str
    company_address: str
    tax_id: str
    phone: str
    email: str

    class Config:
        from_attributes = True

class CompanyBankAccountResponse(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    swift_code: str

    class Config:
        from_attributes = True

@app.get("/company-profile", response_model=CompanyProfileResponse)
def get_company_profile(db: DBDependency):
    profile = db.query(db_model.CompanyProfile).first() 
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Company profile has not been set up."
        )
    return profile

@app.get("/company-bank-account", response_model=CompanyBankAccountResponse)
def get_company_bank_account(db: DBDependency):
    """
    Retrieve the default company bank account information.
    """
    # Fetch the bank account marked as default
    account = db.query(db_model.CompanyBankAccount).filter(
        db_model.CompanyBankAccount.is_default == True
    ).first() 
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Default company bank account has not been set up."
        )
    return account

# test
@app.get("/hi")
def hi():
  return {"message": "Hi"}

@app.get("/users/me", response_model=UserBase)
def read_users_me(current_user: CurrentUser):
    return current_user
   
# @app.get("/notification")
# def receipt():
