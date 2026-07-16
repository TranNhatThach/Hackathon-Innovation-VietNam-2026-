import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres_password_123@postgres:5432/hackathon_db")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
