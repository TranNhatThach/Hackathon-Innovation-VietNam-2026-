from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.models import ChatLog
from backend.schemas.admin import AdminMetricsResponse


router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/metrics", response_model=AdminMetricsResponse)
async def get_metrics(db: DatabaseSession) -> AdminMetricsResponse:
    statement = select(
        func.count(ChatLog.id).label("total_chats"),
        func.count(ChatLog.id)
        .filter(ChatLog.escalation_flag.is_(True))
        .label("escalation_volume"),
        func.coalesce(func.avg(ChatLog.confidence_score), 0.0).label(
            "average_confidence_score"
        ),
    )

    metrics = (await db.execute(statement)).one()

    return AdminMetricsResponse(
        total_chats=int(metrics.total_chats),
        escalation_volume=int(metrics.escalation_volume),
        average_confidence_score=float(metrics.average_confidence_score),
    )
