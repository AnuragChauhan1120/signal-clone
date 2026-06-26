import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

load_dotenv() # Loads the variables from .env

# Fallback to local string if the env var isn't set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./signal_clone.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
# ... rest of your code remains exactly the same

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()