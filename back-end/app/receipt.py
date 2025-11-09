from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from typing import Annotated, List
import uuid
from .auth import check_user_role, get_current_user
from .database import get_db
from .invoice import InvoiceResponse
from . import notification_service
from fastapi import APIRouter, Depends, HTTPException 
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from . import db_model

router = APIRouter(prefix='/receipts', tags=['receipts'])

DBDependency = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[db_model.User, Depends(get_current_user)]

class UserBase(BaseModel):
  u_id: uuid.UUID
  name: str
  email: str
  role: str
  class Config:
    from_attributes = True

class ReceiptCreate(BaseModel):
    r_id: int
    i_id: int
    amount: float
    payment_date: date 
    payment_method: str 

    class Config:
        from_attributes = True

class ReceiptBase(BaseModel):
    r_id: int
    i_id: int
    status: str
    amount: float
    payment_date: date 
    payment_method: str | None = None 
    u_id: uuid.UUID | None = None 

    class Config:
        from_attributes = True

class ReceiptResponse(ReceiptBase):
    r_id: int

vat = Decimal('0.07')

@router.post("/", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
def create_receipt(receipt: ReceiptCreate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):    
  # Check if the invoice ID from the pydantic model exists
  check_iid = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == receipt.i_id).first()
  
  if not check_iid:
    raise HTTPException(status_code=404, detail=f"Invoice ID:{receipt.i_id} not found.")
  
  if check_iid.status != "Approved": 
     raise HTTPException(status_code=404, detail=f"Invoice ID:{receipt.i_id} has not been Approved.")
  
  db_receipt = db_model.Receipt(
    i_id = receipt.i_id,
    amount = Decimal(str(receipt.amount)),
    payment_date = receipt.payment_date, # Added from pydantic model
    payment_method = receipt.payment_method, # Added from pydantic model
    u_id = current_user.u_id # Added user_id for trigger
    )
  
  try:
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt) 
  except Exception as e:
    db.rollback()
    print(f"Error inserting receipt: {e}") 
    raise HTTPException(status_code=500, detail="Could not create receipt due to a database error.")
  
  db_receipt.amount = float(db_receipt.amount)
  
  return db_receipt

@router.put("/{receipt_id}/submit", response_model=ReceiptResponse, status_code=status.HTTP_200_OK)
def receipt_submit(receipt_id: int, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    receipt = db.query(db_model.Receipt).filter(db_model.Receipt.r_id == receipt_id).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    if receipt.status != 'Draft':
      raise HTTPException(status_code=400, detail=f"Receipt cannot be submitted. Current status is '{receipt.status}'.")
    
    try:
        receipt.status = 'Submitted'
        db.commit()
        db.refresh(receipt)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
    return receipt

@router.put("/{receipt_id}/approve")
def receipt_approve(receipt_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
  
  receipt = db.query(db_model.Receipt).filter(db_model.Receipt.r_id == receipt_id).first()
  
  if not receipt:
    raise HTTPException(status_code=404, detail="Receipt not found")

  if receipt.status != 'Submitted':
    raise HTTPException(status_code=400, detail=f"Receipt cannot be Approved. Current status is '{receipt.status}'.")
    
  target_user = db.query(db_model.User).filter(db_model.User.u_id == receipt.u_id).first()

  if status == 'Approved':
    try:
      receipt.status = 'Approved'
      db.commit()
      db.refresh(receipt)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
      if target_user:
        message = f"Good news! Your Receipt R-{receipt.r_id} (Total: {receipt.total}) has been APPROVED by admin."
        subject = f"Your Receipt R-{receipt.r_id} was Approved"
        notification_service.dispatch_notification(db, target_user, message, subject)
      return receipt
      
  if status == 'Rejected':
    try:
      receipt.status = 'Rejected'
      db.commit()
      db.refresh(receipt)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
      if target_user:
        message = f"Update: Your Receipt R-{receipt.r_id} (Total: {receipt.total}) has been REJECTED by admin."
        subject = f"Your Receipt R-{receipt.r_id} was Rejected"
        notification_service.dispatch_notification(db, target_user, message, subject)
      return receipt
    
@router.get("/{receipt_id}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def get_receipt(receipt_id: int, db: DBDependency):

    receipt = db.query(db_model.Receipt).filter(db_model.Receipt.r_id == receipt_id).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    receipt.amount = float(receipt.amount)
    
    return receipt