from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from typing import Annotated, List, Optional
import uuid
from .auth import check_user_role, get_current_user
from .database import get_db
from .notification_service import dispatch_notification
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from . import db_model
from . import notification_service

router = APIRouter(prefix='/receipt', tags=['receipt'])

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
    receipt_number: str | None = None 
    approver_name: Optional[str] = None

    class Config:
        from_attributes = True

class ReceiptResponse(ReceiptBase):
    r_id: int

vat = Decimal('0.07')

@router.post("/", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
def create_receipt(receipt: ReceiptCreate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    check_iid = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == receipt.i_id).first()
    
    if not check_iid:
        raise HTTPException(status_code=404, detail=f"Invoice ID:{receipt.i_id} not found.")
    
    if check_iid.status != "Approved":
        raise HTTPException(status_code=404, detail=f"Invoice ID:{receipt.i_id} has not been Approved.")
    
    db_receipt = db_model.Receipt(
        i_id = receipt.i_id,
        amount = Decimal(str(receipt.amount)),
        payment_date = receipt.payment_date,
        payment_method = receipt.payment_method,
        u_id = current_user.u_id,
        receipt_number = f"RC-{check_iid.invoice_number}" 
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
    
    if receipt.status != 'Pending': 
        raise HTTPException(status_code=400, detail=f"Receipt cannot be submitted. Current status is '{receipt.status}'.")
    
    message = f"Receipt {receipt.receipt_number} (Total: {receipt.amount}) has been submitted for approval by {current_user.name}."
    subject = f"Approval Required: Receipt {receipt.receipt_number}"

    try:
        receipt.status = 'Submitted'
        db.commit()
        db.refresh(receipt)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
    
    return receipt

@router.put("/{receipt_id}/approve", response_model=ReceiptResponse)
def receipt_approve(receipt_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
    
    receipt = db.query(db_model.Receipt).filter(db_model.Receipt.r_id == receipt_id).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    if receipt.status != 'Pending':
        raise HTTPException(status_code=400, detail=f"Receipt cannot be actioned. Current status is '{receipt.status}'.")
        
    target_user = db.query(db_model.User).filter(db_model.User.u_id == receipt.u_id).first()

    if status == 'Approved':
        try:
            receipt.status = 'Approved'
            db.commit()
            db.refresh(receipt)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error during approval: {e}")
        
        if target_user:
            message = f"Good news! Your Receipt {receipt.receipt_number} (Total: {receipt.amount}) has been APPROVED by admin."
            subject = f"Your Receipt {receipt.receipt_number} was Approved"
            notification_service.dispatch_notification(db, target_user, message, subject)
        return receipt
            
    if status == 'Rejected':
        try:
            receipt.status = 'Rejected'
            db.commit()
            db.refresh(receipt)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error during rejection: {e}")

        if target_user:
            message = f"Update: Your Receipt {receipt.receipt_number} (Total: {receipt.amount}) has been REJECTED by admin."
            subject = f"Your Receipt {receipt.receipt_number} was Rejected"
            notification_service.dispatch_notification(db, target_user, message, subject)
        return receipt
    

    raise HTTPException(status_code=400, detail="Invalid status. Must be 'Approved' or 'Rejected'.")

@router.get("/", response_model=List[ReceiptResponse], status_code=status.HTTP_200_OK)
def get_all_receipts(db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
    
    receipts = db.query(db_model.Receipt).all()
    
    for receipt in receipts:
        receipt.amount = float(receipt.amount)
        
    return receipts

@router.get("/me/", response_model=List[ReceiptResponse], status_code=status.HTTP_200_OK)
def get_my_receipts(db: DBDependency, current_user: CurrentUser):
    
    receipts = db.query(db_model.Receipt).filter(db_model.Receipt.u_id == current_user.u_id).all()
    
    for receipt in receipts:
        receipt.amount = float(receipt.amount)

    return receipts

@router.get("/{receipt_id}", response_model=ReceiptResponse, status_code=status.HTTP_200_OK)
def get_receipt(receipt_id: int, db: DBDependency, current_user: CurrentUser):

    receipt = db.query(db_model.Receipt).filter(db_model.Receipt.r_id == receipt_id).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    if current_user.role != 'Admin' and receipt.u_id != current_user.u_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this receipt")

    receipt.amount = float(receipt.amount)
    
    return receipt

@router.get("/number/{receipt_number}", response_model=ReceiptResponse, status_code=status.HTTP_200_OK)
def get_receipt_by_number(receipt_number: str, db: DBDependency, current_user: CurrentUser):

    receipt = db.query(db_model.Receipt).filter(db_model.Receipt.receipt_number == receipt_number).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    if current_user.role != 'Admin' and receipt.u_id != current_user.u_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this receipt")
    
    approver_name = None
    if receipt.status == 'Approved':
        log_entry = db.query(db_model.Log)\
            .filter(db_model.Log.document_id == receipt.r_id, db_model.Log.action == 'Approved')\
            .order_by(db_model.Log.timestamp.desc())\
            .first()
        
        if log_entry and log_entry.actor:
            approver_name = log_entry.actor.name

    receipt.amount = float(receipt.amount)
    
    return receipt