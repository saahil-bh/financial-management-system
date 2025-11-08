from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional
# from sqlmodel import SQLModel, Field, create_engine, Session

# db_username: str = 'postgres'
# db_pwd: str = '3322'
# db_host: str = 'localhost'
# db_port: int = 5432
# db_name: str = 'FinancialManagementDB'

# db_URL = f'postgresql://{db_username}:{db_pwd}@{db_host}:{db_port}/{db_name}'

db_URL = "postgresql://postgres.aeigyszmftixvglxiwpd:supabase448361@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

engine = create_engine(db_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()