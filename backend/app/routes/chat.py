from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from agent.orchestrator import ChatResult, HospitalRAGOrchestrator
from backend.app.database import get_db


router = APIRouter(tags=["Chat"])

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)
    message: str = Field(min_length=1, max_length=10_000)


@lru_cache
def get_orchestrator() -> HospitalRAGOrchestrator:
    return HospitalRAGOrchestrator.from_environment()


@router.post("/chat", response_model=ChatResult)
@router.post("/api/chat", response_model=ChatResult, include_in_schema=False)
async def chat_endpoint(
    request: ChatRequest,
    db: DatabaseSession,
) -> ChatResult:
    return await get_orchestrator().handle_chat(
        db=db,
        session_id=request.session_id,
        user_message=request.message,
    )
