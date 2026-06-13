from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from ..config import get_settings

settings = get_settings()

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# check_same_thread is a SQLite-only argument
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
