import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import appointments, chat, doctors, documents, speech, visits
from backend.app.database import engine
from backend.app.models import Base

logger = logging.getLogger(__name__)

# Create database tables on startup
Base.metadata.create_all(bind=engine)
logger.info("Database tables initialized")

app = FastAPI(
    title="Vietnam AI Innovation Challenge 2026 API",
    description="FastAPI Backend for Sponsor FPT AI Factory and Google ADK 2.0 Agent Stack",
    version="1.0.0"
)

# CORS configuration for local development and container networking
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(appointments.router)
app.include_router(visits.router)
app.include_router(doctors.router)
app.include_router(speech.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "message": "Vietnam AI Innovation Challenge 2026 Backend is running.",
        "docs": "/docs"
    }

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    logger.info("FastAPI startup - Database initialized")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
