from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "Users"
    u_id = Column(Integer, primary_key=True, index=True, name="u_id")
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    role = Column(String(10), nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    __table_args__ = (
        CheckConstraint(role.in_(['Admin', 'User']), name='ck_user_role'),
        Index('idx_user_role', 'role'),
    )
    
    quotations = relationship("Quotation", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    logs = relationship("Log", back_populates="actor")

class Quotation(Base):
    __tablename__ = "Quotations"
    q_id = Column(Integer, primary_key=True, index=True, name="q_id")
    user_id = Column(Integer, ForeignKey("Users.u_id", ondelete="CASCADE"))
    status = Column(String(30), nullable=False, default='Draft')
    total = Column(Numeric(12, 2), nullable=False)
    tax = Column(Numeric(6, 2), default=0.00)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint(status.in_(['Draft', 'Submitted', 'Approved', 'Rejected']), name='ck_quotation_status'),
        Index('idx_quotation_status', 'status'),
    )

    user = relationship("User", back_populates="quotations")
    invoices = relationship("Invoice", back_populates="quotation")

class Invoice(Base):
    __tablename__ = "Invoices"
    i_id = Column(Integer, primary_key=True, index=True, name="i_id")
    q_id = Column(Integer, ForeignKey("Quotations.q_id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), nullable=False, default='Draft')
    total = Column(Numeric(12, 2), nullable=False)
    due_date = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint(status.in_(['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid']), name='ck_invoice_status'),
        Index('idx_invoice_status', 'status'),
    )
    
    quotation = relationship("Quotation", back_populates="invoices")
    receipts = relationship("Receipt", back_populates="invoice")

class Receipt(Base):
    __tablename__ = "Receipts"
    r_id = Column(Integer, primary_key=True, index=True, name="r_id")
    i_id = Column(Integer, ForeignKey("Invoices.i_id", ondelete="SET NULL"), nullable=True)
    payment_date = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default='Pending')
    __table_args__ = (
        CheckConstraint(status.in_(['Pending', 'Confirmed', 'Rejected']), name='ck_receipt_status'),
    )

    invoice = relationship("Invoice", back_populates="receipts")

class Notification(Base):
    __tablename__ = "Notifications"
    n_id = Column(Integer, primary_key=True, index=True, name="n_id")
    u_id = Column(Integer, ForeignKey("Users.u_id", ondelete="CASCADE"))
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
    actor_id = Column(Integer, ForeignKey("Users.u_id", ondelete="SET NULL"), nullable=True)
    document_id = Column(Integer)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now())
    
    __table_args__ = (
        Index('idx_log_actor', 'actor_id'),
    )
  
    actor = relationship("User", back_populates="logs")
