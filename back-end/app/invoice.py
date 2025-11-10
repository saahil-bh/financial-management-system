from datetime import timedelta, datetime, timezone
from decimal import Decimal
from typing import Annotated, List
import uuid
from .auth import check_user_role, get_current_user
from .database import get_db
from . import notification_service
from fastapi import APIRouter, Depends, HTTPException 
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
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

class InvoiceUpdate(BaseModel):
  customer_name: str
  customer_address: str 
  payment_term: str
  itemlist: List[InvoiceItemBase]

  class Config:
    from_attributes = True

class InvoiceItemResponse(InvoiceItemBase):
  item_id: int = Field(..., alias='inv_item_id') # Use the alias for 'inv_item_id'
  total: float
  class Config:
    from_attributes = True
    populate_by_name = True # Add this to enable the alias

class InvoiceBase(BaseModel):
  i_id: int
  q_id: int | None = None
  invoice_number: str
  customer_name: str
  customer_address: str
  payment_term: str
  status: str
  total: float
  tax: float | None = 0.0 # Allow tax to be None
  u_id: uuid.UUID | None = None
  class Config:
    from_attributes = True

class InvoiceResponse(InvoiceBase):
  i_id: int
  items: List[InvoiceItemResponse] = []

vat = Decimal('0.07')

def invoice2receipt(invoice: db_model.Invoice, db: Session):

    check_receipt = db.query(db_model.Receipt).filter(db_model.Receipt.i_id == invoice.i_id).first()
    
    if check_receipt:
        print(f"Receipt for Invoice num {invoice.invoice_number} already exists. No Worry")
        return check_receipt

    db_receipt = db_model.Receipt(
      i_id = invoice.i_id,
      u_id = invoice.u_id,
      receipt_number = f"RC-{invoice.invoice_number}",
      payment_date = datetime.now(timezone.utc),
      payment_method = 'Bank Transfer',
      status = 'Pending',
      amount = invoice.total,
      )
    
    db.add(db_receipt)
    db.flush()
            
    print(f"Successfully created Receipt Number:{db_receipt.receipt_number}!!!")
    return db_receipt

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
    u_id = current_user.u_id, 
    invoice_number = invoice_data.invoice_number,
    customer_name = invoice_data.customer_name,
    customer_address = invoice_data.customer_address,
    payment_term = invoice_data.payment_term,
    status = new_status,
    total = grand_total,
    tax = tax_amount
    )
 
  try:
    db.add(db_invoice)
    db.flush()
    
    for item_data in invoice_data.itemlist:
      db_item = db_model.InvoiceItem(
        i_id = db_invoice.i_id, 
        description = item_data.description,
        quantity = item_data.quantity,
        unit_price = Decimal(str(item_data.unit_price))
        )
      db.add(db_item)

    db.commit() 
    db.refresh(db_invoice)
 
  except IntegrityError: 
    db.rollback()
    raise HTTPException(
        status_code=400, 
        detail=f"An invoice with ID '{invoice_data.invoice_number}' already exists."
    )
  except Exception as e:
    db.rollback()
    print(f"Error inserting invoice and items: {e}") 
    raise HTTPException(status_code=500, detail="Could not create invoice due to a database error.")

  db_invoice.total = float(db_invoice.total)
  db_invoice.tax = float(db_invoice.tax) if db_invoice.tax is not None else 0.0
    
  return db_invoice

@router.get("/me", response_model=List[InvoiceResponse])
def get_user_invoices(db: DBDependency, current_user: CurrentUser):
    invoices = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
    ).filter(
        db_model.Invoice.u_id == current_user.u_id
    ).all()
    
    return invoices

@router.get("/", response_model=List[InvoiceResponse])
def get_all_invoices(db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
    invoices = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
    ).all()
    
    return invoices

@router.put("/{invoice_id}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def invoice_edit(invoice_id: int, invoice_update: InvoiceUpdate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    invoice = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
    ).filter(db_model.Invoice.i_id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.u_id != current_user.u_id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this invoice.")
    
    if invoice.status != 'Draft':
        raise HTTPException(
            status_code=400, detail=f"Only 'Draft' invoices can be edited. Current status is '{invoice.status}'."
            )

    # Update main fields
    invoice.customer_name = invoice_update.customer_name
    invoice.customer_address = invoice_update.customer_address
    invoice.payment_term = invoice_update.payment_term
    
    # Recalculate totals
    subtotal = Decimal('0.00')
    if not invoice_update.itemlist:
        raise HTTPException(status_code=400, detail="Invoice must contain at least one item.")
        
    for item in invoice_update.itemlist:
        quantity = Decimal(str(item.quantity))
        unit_price = Decimal(str(item.unit_price))
        subtotal += quantity * unit_price
        
    tax_amount = subtotal * vat
    grand_total = subtotal + tax_amount

    invoice.total = grand_total
    invoice.tax = tax_amount
    
    try:
      # --- BUG FIX HERE ---
      # Delete old items based on the found invoice's ID (invoice.i_id)
      db.query(db_model.InvoiceItem).filter(db_model.InvoiceItem.i_id == invoice.i_id).delete(synchronize_session=False)
      db.flush() # Ensure deletions are processed before additions

      # Add new items
      for item_data in invoice_update.itemlist:
          db_item = db_model.InvoiceItem(
              i_id = invoice.i_id,
              description = item_data.description,
              quantity = item_data.quantity,
              unit_price = Decimal(str(item_data.unit_price))
          )
          db.add(db_item)

      db.commit()
      db.refresh(invoice)
    except Exception as e:
        db.rollback()
        print(f"Error updating invoice items: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
    invoice.total = float(invoice.total)
    invoice.tax = float(invoice.tax) if invoice.tax is not None else 0.0

    return invoice

@router.put("/{invoice_id}/submit", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def invoice_submit(invoice_id: int, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    invoice = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
    ).filter(db_model.Invoice.i_id == invoice_id).first()
    
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
    
    message = f"Invoice {invoice.invoice_number} (Total: {invoice.total}) has been submitted for approval by {current_user.name}."
    subject = f"Approval Required: Invoice {invoice.invoice_number}"
    
    admins = db.query(db_model.User).filter(db_model.User.role == 'Admin').all()
    for admin in admins:
      notification_service.dispatch_notification(
        db=db,
        user=admin,
        message=message,
        subject=subject
        )
    
    return invoice

@router.put("/{invoice_id}/approve", response_model=InvoiceResponse)
def invoice_approve(invoice_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
 
  invoice = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
  ).filter(db_model.Invoice.i_id == invoice_id).first()
 
  if not invoice:
    raise HTTPException(status_code=404, detail="Invoice not found")

  if invoice.status != 'Submitted':
    raise HTTPException(status_code=400, detail=f"Invoice cannot be Approved. Current status is '{invoice.status}'.")
 
  target_user = db.query(db_model.User).filter(db_model.User.u_id == invoice.u_id).first()

  if status == 'Approved':
    try:
      invoice2receipt(invoice, db)
      invoice.status = 'Approved'
      db.commit()
      db.refresh(invoice)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
    if target_user:
      message = f"Good news! Your Invoice {invoice.invoice_number} (Total: {invoice.total}) has been APPROVED by admin."
      subject = f"Your Invoice {invoice.invoice_number} was Approved"
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
      
    if target_user:
      message = f"Update: Your Invoice {invoice.invoice_number} (Total: {invoice.total}) has been REJECTED by admin."
      subject = f"Your Invoice {invoice.invoice_number} was Rejected"
      notification_service.dispatch_notification(db, target_user, message, subject)
    return invoice
  
  raise HTTPException(status_code=400, detail="Invalid status provided. Must be 'Approved' or 'Rejected'.")
    
@router.get("/{invoice_id}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def get_invoice(invoice_id: int, db: DBDependency, current_user: CurrentUser): # <-- 1. ADDED current_user

    invoice = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
    ).filter(db_model.Invoice.i_id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # --- 2. ADDED SECURITY CHECK ---
    if current_user.role != 'Admin' and invoice.u_id != current_user.u_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this invoice")
    
    invoice.total = float(invoice.total)
    invoice.tax = float(invoice.tax) if invoice.tax is not None else 0.0
    
    return invoice

# --- 1. NEW ENDPOINT TO GET BY NUMBER (for details page) ---
@router.get("/number/{invoice_number}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def get_invoice_by_number(invoice_number: str, db: DBDependency, current_user: CurrentUser):

    invoice = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
    ).filter(db_model.Invoice.invoice_number == invoice_number).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Security check
    if current_user.role != 'Admin' and invoice.u_id != current_user.u_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this invoice")
    
    invoice.total = float(invoice.total)
    invoice.tax = float(invoice.tax) if invoice.tax is not None else 0.0
    
    return invoice

# --- 2. NEW ENDPOINT TO EDIT BY NUMBER (for edit page) ---
@router.put("/number/{invoice_number}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def invoice_edit_by_number(invoice_number: str, invoice_update: InvoiceUpdate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    # Find the invoice by its number
    invoice = db.query(db_model.Invoice).options(
        joinedload(db_model.Invoice.items)
    ).filter(db_model.Invoice.invoice_number == invoice_number).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.u_id != current_user.u_id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this invoice.")
    
    # This is your requested rule
    if invoice.status != 'Draft':
        raise HTTPException(
            status_code=400, detail=f"Only 'Draft' invoices can be edited. Current status is '{invoice.status}'."
            )

    # Update main fields
    invoice.customer_name = invoice_update.customer_name
    invoice.customer_address = invoice_update.customer_address
    invoice.payment_term = invoice_update.payment_term
    
    # Recalculate totals
    subtotal = Decimal('0.00')
    if not invoice_update.itemlist:
        raise HTTPException(status_code=400, detail="Invoice must contain at least one item.")
        
    for item in invoice_update.itemlist:
        quantity = Decimal(str(item.quantity))
        unit_price = Decimal(str(item.unit_price))
        subtotal += quantity * unit_price
        
    tax_amount = subtotal * vat
    grand_total = subtotal + tax_amount

    invoice.total = grand_total
    invoice.tax = tax_amount
    
    try:
      # Delete old items using the found invoice's ID
      db.query(db_model.InvoiceItem).filter(db_model.InvoiceItem.i_id == invoice.i_id).delete(synchronize_session=False)
      db.flush() 

      # Add new items
      for item_data in invoice_update.itemlist:
          db_item = db_model.InvoiceItem(
              i_id = invoice.i_id,
              description = item_data.description,
              quantity = item_data.quantity,
              unit_price = Decimal(str(item_data.unit_price))
          )
          db.add(db_item)

      db.commit()
      db.refresh(invoice)
    except Exception as e:
        db.rollback()
        print(f"Error updating invoice items: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    
    invoice.total = float(invoice.total)
    invoice.tax = float(invoice.tax) if invoice.tax is not None else 0.0

    return invoice

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: int, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):
    
    invoice = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
 
    if invoice.u_id != current_user.u_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this invoice.")
    
    if invoice.status not in ['Draft', 'Submitted', 'Rejected']:
        raise HTTPException(
            status_code=400, detail=f"Invoice cannot be deleted. Current status is '{invoice.status}'."
        )

    try:
        db.delete(invoice)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during deletion: {e}")

    return