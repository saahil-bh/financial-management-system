from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Annotated
from . import db_model 
from .database import engine, SessionLocal
from sqlalchemy.orm import Session
from decimal import Decimal

app = FastAPI()

db_model.Base.metadata.create_all(bind=engine)

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

DBDependency = Annotated[Session, Depends(get_db)]

class QuotationCreate(BaseModel):
    user_id: int
    total: float
    tax: float = 0.00 

    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    q_id: int
    user_id: int
    status: str
    total: float
    tax: float

    class Config:
        from_attributes = True

class QuotationResponse(QuotationBase):
    q_id: int

# test
@app.get("/hi")
def hi():
  return {"message": "Hi"}

# @app.post("/auth/login")
# def login():

@app.post("/quotation", response_model=QuotationResponse, status_code=201)
def create_quotation(quotation: QuotationCreate, db: DBDependency):    
    user_exists = db.query(db_model.User).filter(
        db_model.User.u_id == quotation.user_id
    ).first()
    if not user_exists:
        raise HTTPException(status_code=404, detail=f"User with ID {quotation.user_id} not found.")

    db_quotation = db_model.Quotation(
        user_id=quotation.user_id,
        total=Decimal(str(quotation.total)),
        tax=Decimal(str(quotation.tax))
    )

    try:
        db.add(db_quotation)
        db.commit()
        db.refresh(db_quotation) 
    except Exception as e:
        db.rollback()
        print(f"Error inserting quotation: {e}") 
        raise HTTPException(status_code=500, detail="Could not create quotation due to a database error.")

    db_quotation.total = float(db_quotation.total)
    db_quotation.tax = float(db_quotation.tax)
    
    return db_quotation

@app.get("/quotation/{quotation_id}", response_model=QuotationResponse)
def get_quotation_by_id(quotation_id: int, db: DBDependency):

    quotation = db.query(db_model.Quotation).filter(
        db_model.Quotation.q_id == quotation_id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    quotation.total = float(quotation.total)
    quotation.tax = float(quotation.tax)
    
    return quotation

@app.put("/quotation/{quotation_id}/submit", response_model=QuotationResponse)
def quotation_submit(quotation_id: int, db: DBDependency):
    
    quotation = db.query(db_model.Quotation).filter(
        db_model.Quotation.q_id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # check role (only user)
    # if user.role != 'user':
    #   raise HTTPException(
    #         status_code=400, detail=f"You do not have permission to submit the draft'."
    #     )
    
    if quotation.status != 'Draft':
        raise HTTPException(
            status_code=400, detail=f"Quotation cannot be submitted. Current status is '{quotation.status}'."
            )
        
    try:
        quotation.status = 'Submitted'
        db.commit()
        db.refresh(quotation)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
    return quotation

@app.put("/quotation/:id/approve")
def quotation_approve(quotation_id: int, status: str, db: DBDependency):
  quotation = db.query(db_model.Quotation).filter(
     db_model.Quotation.q_id == quotation_id).first()
  
  if not quotation:
    raise HTTPException(status_code=404, detail="Quotation not found")
  
  # check role (only admin)
  # if user.role != 'admin':
  #   raise HTTPException(status_code=400, detail=f"You do not have permission to approve the draft'.")
    
  if quotation.status != 'Submitted':
    raise HTTPException(
       status_code=400, detail=f"Quotation cannot be Approved. Current status is '{quotation.status}'."
       )
    
  if status == 'Approved':
    try:
      quotation.status = 'Approved'
      db.commit()
      db.refresh(quotation)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
      return quotation
      
  if status == 'Rejected':
    try:
      quotation.status = 'Rejected'
      db.commit()
      db.refresh(quotation)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
      return quotation

# @app.post("/invoice")
# def invoice():

# @app.post("/receipt")
# def receipt():

# @app.get("/notification")
# def receipt():
