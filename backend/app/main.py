from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database import init_db
from backend.app.routes.chat import get_orchestrator
from backend.app.routes.chat import router as chat_router
from backend.middleware.emergency import EmergencyFilterMiddleware
from backend.routers.admin import router as admin_router
from backend.routers.dashboard import router as dashboard_router
from backend.routers.hospital_api import router as hospital_router
from backend.routers.integration import router as integration_router
from backend.routers.voice import router as voice_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield
    if get_orchestrator.cache_info().currsize:
        await get_orchestrator().aclose()

app = FastAPI(
    title="Hanoi Heart Hospital AI Patient Experience Platform",
    description="Governed hospital concierge APIs and AI orchestration.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(EmergencyFilterMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(hospital_router)
app.include_router(admin_router)
app.include_router(integration_router)
app.include_router(dashboard_router)
app.include_router(voice_router)

@app.get("/")
async def read_root() -> dict[str, str]:
    return {
        "status": "healthy",
        "message": "Hanoi Heart Hospital AI Patient Experience Platform is running.",
        "docs": "/docs",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
