from datetime import timedelta, datetime, timezone
from decimal import Decimal
from typing import Annotated, List
import uuid
from .auth import check_user_role, get_current_user
from .database import get_db
from . import notification_service
from fastapi import APIRouter, Depends, HTTPException 
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from . import db_model

router = APIRouter(prefix='/quotation', tags=['quotation'])

DBDependency = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[db_model.User, Depends(get_current_user)]

class UserBase(BaseModel):
  u_id: uuid.UUID
  name: str
  email: str
  role: str
  line_user_id: str
  class Config:
    from_attributes = True

class QuotationItemBase(BaseModel):
  description: str
  quantity: int
  unit_price: float
  
class QuotationItemResponse(QuotationItemBase):
  item_id: int
  total: float
  class Config:
    from_attributes = True

class QuotationCreate(BaseModel):
  quotation_number: str
  customer_name: str
  customer_address: str
  customer_email: str
  itemlist: List[QuotationItemBase]
  status: str | None = None
  class Config:
    from_attributes = True

class QuotationUpdate(BaseModel):
  customer_name: str
  customer_address: str 
  customer_email: str
  itemlist: List[QuotationItemBase]
  class Config:
    from_attributes = True

class QuotationBase(BaseModel):
  q_id: int
  quotation_number: str
  customer_name: str
  customer_address: str 
  customer_email: str
  u_id: uuid.UUID
  status: str
  total: float
  tax: float
  class Config:
    from_attributes = True

class QuotationResponse(QuotationBase):
  u_id: uuid.UUID
  items: List[QuotationItemResponse] = []

vat = Decimal('0.07')

def quoatation2invoice(quotation: db_model.Quotation, db: Session):

    check_invoice = db.query(db_model.Invoice).filter(db_model.Invoice.q_id == quotation.q_id).first()
    
    if check_invoice:
        print(f"Invoice for Quotation ID {quotation.q_id} already exists. No Worry")
        return check_invoice

    db_invoice = db_model.Invoice(
      q_id = quotation.q_id, 
      u_id = quotation.u_id,
      invoice_number = f"INV-{quotation.quotation_number}",
      customer_name = quotation.customer_name,
      customer_address = quotation.customer_address,
      payment_term = "Net 30 Days",
      status = 'Draft',
      total = quotation.total,
      tax = quotation.tax
      )
    
    db.add(db_invoice)
    db.flush()
    
    for item in quotation.items: 
        db_item = db_model.InvoiceItem(
          i_id = db_invoice.i_id,
          description = item.description,
          quantity = item.quantity,
          unit_price = item.unit_price 
          )
        db.add(db_item)
        
    print(f"Successfully created Invoice NUm {db_invoice.invoice_number}!!!")
    return db_invoice

@router.post("/", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(quotation_data: QuotationCreate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):    
  
  subtotal = Decimal('0.00')
    
  if not quotation_data.itemlist:
    raise HTTPException(status_code=400, detail="Quotation must contain at least one item.")
        
  for item in quotation_data.itemlist:
    if item.quantity <= 0:
      raise HTTPException(status_code=400, detail="Item quantity must be greater than zero.")
    
    quantity = Decimal(str(item.quantity))
    unit_price = Decimal(str(item.unit_price))
       
    each_item_total = quantity * unit_price
    subtotal += each_item_total
       
  tax_amount = subtotal * vat
  grand_total = subtotal + tax_amount

  new_status = 'Draft'
  if quotation_data.status == 'Submitted':
     new_status = 'Submitted'
    
  db_quotation = db_model.Quotation(
    u_id = current_user.u_id,
    quotation_number = quotation_data.quotation_number,
    customer_name = quotation_data.customer_name,
    customer_address = quotation_data.customer_address,
    customer_email = quotation_data.customer_email,
    total = grand_total,
    tax = tax_amount,
    status = new_status
    )
  
  try:
    db.add(db_quotation)
    db.flush()
    
    for item_data in quotation_data.itemlist:
      db_item = db_model.QuotationItem(
        q_id = db_quotation.q_id,
        description = item_data.description,
        quantity = item_data.quantity,
        unit_price = Decimal(str(item_data.unit_price))
        )
      db.add(db_item)
    
    db.commit()
    db.refresh(db_quotation)
  
  except Exception as e:
    db.rollback()
    print(f"Error inserting quotation and items: {e}") 
    raise HTTPException(status_code=500, detail="Could not create quotation due to a database error.")


  db_quotation.total = float(db_quotation.total)
  db_quotation.tax = float(db_quotation.tax)
    
  return db_quotation

@router.get("/me", response_model=List[QuotationResponse])
def get_user_quotations(db: DBDependency, current_user: CurrentUser):
    quotations = db.query(db_model.Quotation).filter(
        db_model.Quotation.u_id == current_user.u_id
    ).all()
    
    return quotations

@router.get("/", response_model=List[QuotationResponse])
def get_all_quotations(db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
    quotations = db.query(db_model.Quotation).all()
    
    return quotations

@router.get("/{quotation_id}", response_model=QuotationResponse, status_code=status.HTTP_200_OK)
def get_quotation(quotation_id: int, db: DBDependency):

    quotation = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == quotation_id).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    quotation.total = float(quotation.total)
    quotation.tax = float(quotation.tax)
    
    return quotation

@router.put("/{quotation_id}", response_model=QuotationResponse, status_code=status.HTTP_200_OK)
def quotation_edit(quotation_id: int, quotation_update: QuotationUpdate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    quotation = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if quotation.u_id != current_user.u_id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this quotation.")
    
    if quotation.status == 'Approved':
        raise HTTPException(
            status_code=400, detail=f"Quotation cannot be Edit. Current status is '{quotation.status}'."
            )

    quotation.customer_name = quotation_update.customer_name
    quotation.customer_address = quotation_update.customer_address
    
    subtotal = Decimal('0.00')
    if not quotation_update.itemlist:
        raise HTTPException(status_code=400, detail="Quotation must contain at least one item.")
        
    for item in quotation_update.itemlist:
       quantity = Decimal(str(item.quantity))
       unit_price = Decimal(str(item.unit_price))
       subtotal += quantity * unit_price
       
    tax_amount = subtotal * vat
    grand_total = subtotal + tax_amount

    quotation.total = grand_total
    quotation.tax = tax_amount
    
    try:
      quotation.items = []
      db.flush() 
      
      for item_data in quotation_update.itemlist:
          db_item = db_model.QuotationItem(
              q_id = quotation.q_id,
              description = item_data.description,
              quantity = item_data.quantity,
              unit_price = Decimal(str(item_data.unit_price))
          )
          db.add(db_item)

      db.commit()
      db.refresh(quotation)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
    quotation.total = float(quotation.total)
    quotation.tax = float(quotation.tax)

    return quotation

@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quotation(quotation_id: int, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    quotation = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == quotation_id).first()
    
    if not quotation:
       raise HTTPException(status_code=404, detail="Quotation not found")

    
    if quotation.status not in ['Draft', 'Cancelled', 'Rejected']:
        raise HTTPException(
          status_code=400, detail=f"Quotation can not be delete. Current status is '{quotation.status}'."
        )

    try:
        db.delete(quotation)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during deletion: {e}")

    return

@router.put("/{quotation_id}/submit", response_model=QuotationResponse, status_code=status.HTTP_200_OK)
def quotation_submit(quotation_id: int, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    quotation = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
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
    
        # --- NOTIFICATION LOGIC ---
    message = f"Quotation Q-{quotation.q_id} (Total: {quotation.total}) has been submitted for approval by {current_user.name}."
    subject = f"Approval Required: Quotation Q-{quotation.q_id}"
    
    # Find all admins
    admins = db.query(db_model.User).filter(db_model.User.role == 'Admin').all()
    for admin in admins:
        notification_service.dispatch_notification(
            db=db,
            user=admin,
            message=message,
            subject=subject
        )

    return quotation

@router.put("/{quotation_id}/approve")
def quotation_approve(quotation_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
  
  quotation = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == quotation_id).first()
  
  if not quotation:
    raise HTTPException(status_code=404, detail="Quotation not found")
    
  if quotation.status != 'Submitted':
    raise HTTPException(
       status_code=400, detail=f"Quotation is not Summited. Current status is '{quotation.status}'."
       )
  
  target_user = db.query(db_model.User).filter(db_model.User.u_id == quotation.u_id).first()

  if status == 'Approved':
    try:
      quoatation2invoice(quotation, db)
      quotation.status = 'Approved'
      db.commit()
      db.refresh(quotation)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
      if target_user:
        message = f"Good news bro! Your Quotation Q-{quotation.q_id} (Total: {quotation.total}) has been APPROVED by admin."
        subject = f"Your Quotation Q-{quotation.q_id} was Approved"
        notification_service.dispatch_notification(db, target_user, message, subject)
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
      if target_user:
        message = f"Update: Your Quotation Q-{quotation.q_id} (Total: {quotation.total}) has been REJECTED by admin."
        subject = f"Your Quotation Q-{quotation.q_id} was Rejected"
        notification_service.dispatch_notification(db, target_user, message, subject)
      return quotation