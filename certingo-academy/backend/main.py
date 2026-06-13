"""Compatibility wrapper so `uvicorn main:app` keeps working from backend/.

The real application lives in app.main.
"""
from app.main import app  # noqa: F401
