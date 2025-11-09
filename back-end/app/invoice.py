from datetime import timedelta, datetime, timezone
from decimal import Decimal
from typing import Annotated, List
import uuid
from .auth import check_user_role, get_current_user
from .database import get_db
from . import quotation
from . import notification_service
from fastapi import APIRouter, Depends, HTTPException 
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from . import db_model

router = APIRouter(prefix='/invoice', tags=['invoice'])

DBDependency = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[db_model.User, Depends(get_current_user)]

class UserBase(BaseModel):
  u_id: uuid.UUID
  name: str
  email: str
  role: str
  class Config:
    from_attributes = True

# Invoice
class InvoiceItemBase(BaseModel):
  description: str
  quantity: int
  unit_price: float

class InvoiceCreate(BaseModel):
  invoice_number: str
  customer_name: str
  customer_address: str
  payment_term: str
  itemlist: List[InvoiceItemBase]
  status: str | None = None
  class Config:
    from_attributes = True

class InvoiceItemResponse(InvoiceItemBase):
  item_id: int
  total: float
  class Config:
    from_attributes = True

class InvoiceBase(BaseModel):
  i_id: int
  q_id: int
  invoice_number: str
  customer_name: str
  customer_address: str
  payment_term: str
  status: str
  total: float
  u_id: uuid.UUID | None = None
  class Config:
    from_attributes = True

class InvoiceResponse(InvoiceBase):
  i_id: int
  items: List[InvoiceItemResponse] = []

vat = Decimal('0.07')

@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(invoice_data: InvoiceCreate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):    
  subtotal = Decimal('0.00')
    
  if not invoice_data.itemlist:
    raise HTTPException(status_code=400, detail="Invoice must contain at least one item.")
        
  for item in invoice_data.itemlist:
    if item.quantity <= 0:
      raise HTTPException(status_code=400, detail="Item quantity must be greater than zero.")
    
    quantity = Decimal(str(item.quantity))
    unit_price = Decimal(str(item.unit_price))
       
    each_item_total = quantity * unit_price
    subtotal += each_item_total
       
  tax_amount = subtotal * vat
  grand_total = subtotal + tax_amount

  new_status = 'Draft'

  if invoice_data.status == 'Submitted':
    new_status = 'Submitted'
    
  db_invoice = db_model.Invoice(
    q_id = invoice_data.q_id, 
    u_id = invoice_data.u_id,
    invoice_number = invoice_data.invoice_number,
    customer_name = invoice_data.customer_name,
    customer_address = invoice_data.customer_address,
    payment_term = "Net 30 Days",
    status = new_status,
    total = grand_total,
    tax = tax_amount
    )
  
  try:
    db.add(db_invoice)
    db.flush()
    
    for item_data in invoice_data.itemlist:
      db_item = db_model.InvoiceItem(
        q_id = invoice_data.q_id,
        description = item_data.description,
        quantity = item_data.quantity,
        unit_price = Decimal(str(item_data.unit_price))
        )
      
      db.add(db_item)
    db.commit()
    db.refresh(db_invoice)
  
  except Exception as e:
    db.rollback()
    print(f"Error inserting quotation and items: {e}") 
    raise HTTPException(status_code=500, detail="Could not create quotation due to a database error.")


  db_invoice.total = float(db_invoice.total)
  db_invoice.tax = float(db_invoice.tax)
    
  return db_invoice

@router.put("/{invoice_id}/submit", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def invoice_submit(invoice_id: int, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    invoice = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == invoice_id).first()
    
    if not invoice:
      raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != 'Draft':
      raise HTTPException(status_code=400, detail=f"Invoice cannot be submitted. Current status is '{invoice.status}'.")
        
    try:
      invoice.status = 'Submitted'
      db.commit()
      db.refresh(invoice)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
      # --- ADD NOTIFICATION LOGIC ---
    message = f"Invoice I-{invoice.i_id} (Total: {invoice.total}) has been submitted for approval by {current_user.name}."
    subject = f"Approval Required: Invoice I-{invoice.i_id}"
    
    # Find all admins
    admins = db.query(db_model.User).filter(db_model.User.role == 'Admin').all()
    for admin in admins:
      notification_service.dispatch_notification(
        db=db,
        user=admin,
        message=message,
        subject=subject
        )
    
    return invoice

@router.put("/{invoice_id}/approve")
def invoice_approve(invoice_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
  
  invoice = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == invoice_id).first()
  
  if not invoice:
    raise HTTPException(status_code=404, detail="Invoice not found")

  if invoice.status != 'Submitted':
    raise HTTPException(status_code=400, detail=f"Invoice cannot be Approved. Current status is '{invoice.status}'.")
  
  target_user = db.query(db_model.User).filter(db_model.User.u_id == invoice.u_id).first()

  if status == 'Approved':
    try:
      invoice.status = 'Approved'
      db.commit()
      db.refresh(invoice)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
      if target_user:
        message = f"Good news! Your Invoice I-{invoice.q_id} (Total: {invoice.total}) has been APPROVED by admin."
        subject = f"Your Invoice I-{invoice.q_id} was Approved"
        notification_service.dispatch_notification(db, target_user, message, subject)
      return invoice
      
  if status == 'Rejected':
    try:
      invoice.status = 'Rejected'
      db.commit()
      db.refresh(invoice)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
      if target_user:
        message = f"Update: Your Invoice I-{invoice.i_id} (Total: {invoice.total}) has been REJECTED by admin."
        subject = f"Your Invoice Q-{invoice.i_id} was Rejected"
        notification_service.dispatch_notification(db, target_user, message, subject)
      return invoice
    
@router.get("/{invoice_id}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def get_invoice(invoice_id: int, db: DBDependency):

    invoice = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == invoice_id).first()

    if not invoice:
      raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.total = float(invoice.total)
    
    return invoice
