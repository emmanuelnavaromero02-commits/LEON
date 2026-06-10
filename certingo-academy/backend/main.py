from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import academy
from app.database import db, models

models.Base.metadata.create_all(bind=db.engine)

app = FastAPI(title="Certingo Academy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(academy.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Certingo Academy API"}
