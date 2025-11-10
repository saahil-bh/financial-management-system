import uuid
from sqlalchemy import Boolean, Column, Integer, String, Text, Date, DateTime, Numeric, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Computed
from .database import Base

class User(Base):
    __tablename__ = "Users"
    u_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, name="u_id") # uuid.uuid4 is for random new unique uuid
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    role = Column(String(10), nullable=False)
    password_hash = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    line_user_id = Column((String(255)), nullable=True)
    
    __table_args__ = (
        CheckConstraint(role.in_(['Admin', 'User']), name='ck_user_role'),
        Index('idx_user_role', 'role'),
    )
    
    quotations = relationship("Quotation", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    logs = relationship("Log", back_populates="actor")

    invoices = relationship("Invoice", back_populates="user")
    receipts = relationship("Receipt", back_populates="user")

class Quotation(Base):
    __tablename__ = "Quotations"
    q_id = Column(Integer, primary_key=True, index=True, name="q_id")
    quotation_number = Column(String(50), nullable=False, default="Q-YYYYMMDD-000")
    customer_name = Column(String(100), nullable=False)
    customer_address = Column(Text, nullable=False)
    customer_email = Column(String(150), nullable=False)
    u_id = Column(UUID(as_uuid=True), ForeignKey("Users.u_id", ondelete="CASCADE"))
    status = Column(String(30), nullable=False, default='Draft')
    total = Column(Numeric(12, 2), nullable=False)
    tax = Column(Numeric(12, 2), default=0.00)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint(status.in_(['Draft', 'Submitted', 'Approved', 'Rejected']), name='ck_quotation_status'),
        Index('idx_quotation_status', 'status'),
    )

    user = relationship("User", back_populates="quotations")
    invoices = relationship("Invoice", back_populates="quotation")

    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")

class Invoice(Base):
    __tablename__ = "Invoices"
    i_id = Column(Integer, primary_key=True, index=True, name="i_id")
    q_id = Column(Integer, ForeignKey("Quotations.q_id", ondelete="SET NULL"), nullable=True)
    invoice_number = Column(String(50), nullable=False, default="-YYYYMMDD-000")
    customer_name = Column(String(100), nullable=False)
    customer_address = Column(Text, nullable=False)
    payment_term = Column(String(150), nullable=False)
    status = Column(String(30), nullable=False, default='Draft')
    total = Column(Numeric(12, 2), nullable=False)
    tax = Column(Numeric(12, 2), default=0.00)
    due_date = Column(Date, nullable=False, default=func.now())
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    u_id = Column(UUID(as_uuid=True), ForeignKey("Users.u_id", ondelete="SET NULL"), nullable=True)
    
    __table_args__ = (
        CheckConstraint(status.in_(['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid']), name='ck_invoice_status'),
        Index('idx_invoice_status', 'status'),
    )
    
    quotation = relationship("Quotation", back_populates="invoices")
    receipts = relationship("Receipt", back_populates="invoice")
    user = relationship("User", back_populates="invoices")# relationship for triggers

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan") 

class Receipt(Base):
    __tablename__ = "Receipts"
    r_id = Column(Integer, primary_key=True, index=True, name="r_id")
    i_id = Column(Integer, ForeignKey("Invoices.i_id", ondelete="SET NULL"), nullable=True)
    receipt_number = Column(String(50), nullable=False, default="-YYYYMMDD-000")
    payment_date = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default='Pending')

    u_id = Column(UUID(as_uuid=True), ForeignKey("Users.u_id", ondelete="SET NULL"), nullable=True)

    payment_method = Column(String(20), )
    
    __table_args__ = (
        CheckConstraint(status.in_(['Pending', 'Approved', 'Rejected', 'Submitted']), name='ck_receipt_status'),
        CheckConstraint(payment_method.in_(['Bank Transfer', 'Cash', 'Credit Card']))
    )

    invoice = relationship("Invoice", back_populates="receipts")
    user = relationship("User", back_populates="receipts")# Add relationship for triggers

class Notification(Base):
    __tablename__ = "Notifications"
    n_id = Column(Integer, primary_key=True, index=True, name="n_id")
    u_id = Column(UUID(as_uuid=True), ForeignKey("Users.u_id", ondelete="CASCADE"))
    message = Column(Text, nullable=False)
    type = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    
    __table_args__ = (
        CheckConstraint(type.in_(['LINE', 'Email']), name='ck_notification_type'),
    )
    
    user = relationship("User", back_populates="notifications")

class Log(Base):
    __tablename__ = "Logs"
    l_id = Column(Integer, primary_key=True, index=True, name="l_id")
    action = Column(String(100), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("Users.u_id", ondelete="SET NULL"), nullable=True)
    document_id = Column(Integer)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now())
    
    __table_args__ = (
        Index('idx_log_actor', 'actor_id'),
    )
  
    actor = relationship("User", back_populates="logs")

class CompanyProfile(Base):
    __tablename__ = "CompanyProfile"
    company_id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255))
    company_address = Column(Text)
    tax_id = Column(String(50))
    phone = Column(String(50))
    email = Column(String(100))
    
class CompanyBankAccount(Base):
    __tablename__ = "CompanyBankAccount"
    bank_id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String(100))
    account_name = Column(String(100))
    account_number = Column(String(50))
    swift_code = Column(String(20))
    is_default = Column(Boolean, default=True)

class QuotationItem(Base):
    __tablename__ = "QuotationItems"
    item_id = Column(Integer, primary_key=True, index=True)
    q_id = Column(Integer, ForeignKey("Quotations.q_id", ondelete="CASCADE"))
    description = Column(Text, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), Computed("quantity * unit_price", persisted=True))

    quotation = relationship("Quotation", back_populates="items")

class InvoiceItem(Base):
    __tablename__ = "InvoiceItems"
    inv_item_id = Column(Integer, primary_key=True, index=True)
    i_id = Column(Integer, ForeignKey("Invoices.i_id", ondelete="CASCADE"))
    description = Column(Text, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), Computed("quantity * unit_price", persisted=True))
    
    invoice = relationship("Invoice", back_populates="items")
