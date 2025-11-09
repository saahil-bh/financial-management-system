from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Annotated, Optional
from fastapi.security import OAuth2PasswordRequestForm
# from sqlmodel import SQLModel, Field,Session
from . import auth
from . import db_model 
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

app.include_router(auth.router) 

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

# Receipt
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

# test
@app.get("/hi")
def hi():
  return {"message": "Hi"}


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

@app.get("/users/me", response_model=UserBase)
def read_users_me(current_user: CurrentUser):
    return current_user

@app.post("/quotation", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
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

@app.get("/quotations/me", response_model=List[QuotationResponse])
def get_user_quotations(db: DBDependency, current_user: CurrentUser):
    quotations = db.query(db_model.Quotation).filter(
        db_model.Quotation.u_id == current_user.u_id
    ).all()
    
    return quotations

@app.get("/quotations", response_model=List[QuotationResponse])
def get_all_quotations(db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
    quotations = db.query(db_model.Quotation).all()
    
    return quotations

@app.get("/quotation/{quotation_id}", response_model=QuotationResponse, status_code=status.HTTP_200_OK)
def get_quotation(quotation_id: int, db: DBDependency):

    quotation = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == quotation_id).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    quotation.total = float(quotation.total)
    quotation.tax = float(quotation.tax)
    
    return quotation

@app.put("/quotation/{quotation_id}", response_model=QuotationResponse, status_code=status.HTTP_200_OK)
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

@app.delete("/quotation/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
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

@app.put("/quotation/{quotation_id}/submit", response_model=QuotationResponse, status_code=status.HTTP_200_OK)
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
    
    return quotation

@app.put("/quotation/{quotation_id}/approve")
def quotation_approve(quotation_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
  
  quotation = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == quotation_id).first()
  
  if not quotation:
    raise HTTPException(status_code=404, detail="Quotation not found")
    
  if quotation.status != 'Submitted':
    raise HTTPException(
       status_code=400, detail=f"Quotation is not Summited. Current status is '{quotation.status}'."
       )
    
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

@app.post("/invoice", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
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

@app.put("/invoice/{invoice_id}/submit", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
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
    
    return invoice

@app.put("/invoice/{invoice_id}/approve")
def invoice_approve(invoice_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
  
  invoice = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == invoice_id).first()
  
  if not invoice:
    raise HTTPException(status_code=404, detail="Invoice not found")

  if invoice.status != 'Submitted':
    raise HTTPException(status_code=400, detail=f"Invoice cannot be Approved. Current status is '{invoice.status}'.")
    
  if status == 'Approved':
    try:
      invoice.status = 'Approved'
      db.commit()
      db.refresh(invoice)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
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
      return invoice
    
@app.get("/invoice/{invoice_id}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def get_invoice(invoice_id: int, db: DBDependency):

    invoice = db.query(db_model.Invoice).filter(db_model.Invoice.i_id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.total = float(invoice.total)
    
    return invoice

@app.post("/receipt", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
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

@app.put("/receipt/{receipt_id}/submit", response_model=ReceiptResponse, status_code=status.HTTP_200_OK)
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

@app.put("/receipt/{receipt_id}/approve")
def receipt_approve(receipt_id: int, status: str, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('Admin'))]):
  
  receipt = db.query(db_model.Receipt).filter(db_model.Receipt.r_id == receipt_id).first()
  
  if not receipt:
    raise HTTPException(status_code=404, detail="Receipt not found")

  if receipt.status != 'Submitted':
    raise HTTPException(status_code=400, detail=f"Receipt cannot be Approved. Current status is '{receipt.status}'.")
    
  if status == 'Approved':
    try:
      receipt.status = 'Approved'
      db.commit()
      db.refresh(receipt)
    except Exception as e:
      db.rollback()
      raise HTTPException(status_code=500, detail=f"Database error during submission: {e}")
    finally:
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
      return receipt
    
@app.get("/receipt/{receipt_id}", response_model=InvoiceResponse, status_code=status.HTTP_200_OK)
def get_receipt(receipt_id: int, db: DBDependency):

    receipt = db.query(db_model.Receipt).filter(db_model.Receipt.r_id == receipt_id).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    receipt.amount = float(receipt.amount)
    
    return receipt
   
# @app.get("/notification")
# def receipt():
