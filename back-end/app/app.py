from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Annotated
from fastapi.security import OAuth2PasswordRequestForm
from . import auth
from . import db_model 
from .auth import get_current_user,check_user_role
from .database import engine, SessionLocal, get_db
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import timedelta, date # add date 
import uuid # import uuid

app = FastAPI()
app.include_router(auth.router) 

# db_model.Base.metadata.create_all(bind=engine)
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

class QuotationCreate(BaseModel):
    # user_id removed, will be taken from current_user
    total: float
    tax: float 

    class Config:
        from_attributes = True

class QuotationUpdate(BaseModel):
    total: float
    tax: float 

    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    q_id: int
    user_id: uuid.UUID
    status: str
    total: float
    tax: float

    class Config:
        from_attributes = True

class QuotationResponse(QuotationBase):
    q_id: int

# Invoice
class InvoiceCreate(BaseModel):
    q_id: int
    total: float

    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    i_id: int
    q_id: int
    status: str
    total: float
    u_id: uuid.UUID | None = None # Added u_id

    class Config:
        from_attributes = True

class InvoiceResponse(InvoiceBase):
    i_id: int

# Receipt
class ReceiptCreate(BaseModel):
    # r_id: int
    # amount: float
    i_id: int # Changed from r_id
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

# test
@app.get("/hi")
def hi():
  return {"message": "Hi"}


@app.get("/users/me", response_model=UserBase)
def read_users_me(current_user: CurrentUser):
    return current_user

@app.post("/quotation", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(quotation: QuotationCreate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):    

    db_quotation = db_model.Quotation(
        user_id = current_user.u_id, # Set user_id from logged-in user
        total = Decimal(str(quotation.total)),
        tax = Decimal(str(quotation.tax))
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
    
    if quotation.user_id != current_user.u_id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this quotation.")
    
    if quotation.status == 'Approved':
        raise HTTPException(
            status_code=400, detail=f"Quotation cannot be Edit. Current status is '{quotation.status}'."
            )
    
    try:
      quotation.total = Decimal(str(quotation_update.total))
      quotation.tax = Decimal(str(quotation_update.tax))
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
def create_invoice(invoice: InvoiceCreate, db: DBDependency, current_user: Annotated[db_model.User, Depends(check_user_role('User'))]):    
  
  check_qid = db.query(db_model.Quotation).filter(db_model.Quotation.q_id == invoice.q_id).first()
  
  if not check_qid:
    raise HTTPException(status_code=404, detail=f"Quotation ID:{invoice.q_id} not found.")
  
  # *** LOGICAL ERROR HERE ***
  # This checks if *ANY* quotation in the database is "Approved",
  # not if the *specific one* you found (check_qid) is approved.
  # ---------------------------------------------------------------  
  #  check_approve = db.query(db_model.Quotation).filter(db_model.Quotation.status == "Approved").first()
  #if not check_approve: 
     #raise HTTPException(status_code=404, detail=f"Quotation ID:{invoice.q_id} has not been Approved.")
  # ---------------------------------------------------------------
  if check_qid.status != "Approved": #fixed version
     raise HTTPException(status_code=400, detail=f"Quotation ID:{invoice.q_id} has not been Approved.")
  
  db_invoice = db_model.Invoice(
    q_id = invoice.q_id,
    total = Decimal(str(invoice.total)),
    u_id = current_user.u_id # Added user_id for trigger
    )
  
  try:
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice) 
  except Exception as e:
    db.rollback()
    print(f"Error inserting quotation: {e}") 
    raise HTTPException(status_code=500, detail="Could not create invoice due to a database error.")
  
  db_invoice.total = float(db_invoice.total)
    
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
    # Fixed error message to use i_id
    # raise HTTPException(status_code=404, detail=f"Quotation ID:{receipt.q_id} not found.") OLd version
    raise HTTPException(status_code=404, detail=f"Invoice ID:{receipt.i_id} not found.")
  # *** LOGICAL ERROR HERE ***
  # This checks if *ANY* invoice in the database is "Approved".
  #------------------------------------------------------------------
  #check_approve = db.query(db_model.Invoice).filter(db_model.Invoice.status == "Approved").first()
  #if not check_approve: 
  #   raise HTTPException(status_code=404, detail=f"Invoice ID:{receipt.i_id} has not been Approved.")
  #------------------------------------------------------------------
  # corrected version
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
  
  # receipt = db.query(db_model.Receipt).filter(db_model.Receipt.i_id == receipt_id).first() Old code
  # Changed filter to r_id
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
    
    # receipt.total = float(receipt.total) receipt doesn't have total a
    receipt.amount = float(receipt.amount) # fix to amount
    
    return receipt
   
# @app.get("/notification")
# def receipt():
