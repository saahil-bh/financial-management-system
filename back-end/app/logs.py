from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Annotated
import uuid
from datetime import datetime
from . import db_model
from .database import get_db
from .auth import check_user_role, get_current_user

router = APIRouter(prefix='/logs', tags=['logs'])

DBDependency = Annotated[Session, Depends(get_db)]
AdminUser = Annotated[db_model.User, Depends(check_user_role('Admin'))]

class LogResponse(BaseModel):
    l_id: int
    actor_id: uuid.UUID
    action: str
    document_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[LogResponse])
def get_all_logs(db: DBDependency, current_user: AdminUser):
    logs = db.query(db_model.Log).order_by(desc(db_model.Log.timestamp)).all()
    
    return logs