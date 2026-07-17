from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.models import ChatLog


router = APIRouter(prefix="/api/v1/admin", tags=["Admin Dashboard"])

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


class PopularTopicMetric(BaseModel):
    topic: str
    total: int


class ServicePerformanceMetric(BaseModel):
    service_name: str
    total_requests: int
    escalation_count: int
    unanswered_count: int
    average_confidence: float
    average_latency_ms: float | None = None


class ResponseQualityMetric(BaseModel):
    average_confidence: float
    low_confidence_count: int


class AdminDashboardResponse(BaseModel):
    total_chatbot_usage: int
    unanswered_questions_count: int
    escalation_volume: int
    popular_topics: list[PopularTopicMetric]
    response_quality: ResponseQualityMetric
    service_performance: list[ServicePerformanceMetric]


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(db: DatabaseSession) -> AdminDashboardResponse:
    aggregate_query = select(
        func.count(ChatLog.id).label("total_chatbot_usage"),
        func.count(ChatLog.id)
        .filter(ChatLog.unanswered_question_flag.is_(True))
        .label("unanswered_questions_count"),
        func.count(ChatLog.id)
        .filter(ChatLog.escalation_flag.is_(True))
        .label("escalation_volume"),
        func.coalesce(func.avg(ChatLog.confidence_score), 0.0).label(
            "average_confidence"
        ),
        func.count(ChatLog.id)
        .filter(ChatLog.confidence_score < 0.7)
        .label("low_confidence_count"),
    )
    aggregate_row = (await db.execute(aggregate_query)).one()

    popular_topics_query = (
        select(
            func.coalesce(ChatLog.topic, "other").label("topic"),
            func.count(ChatLog.id).label("total"),
        )
        .group_by(func.coalesce(ChatLog.topic, "other"))
        .order_by(desc("total"))
        .limit(10)
    )
    popular_topics = [
        PopularTopicMetric(topic=row.topic, total=row.total)
        for row in (await db.execute(popular_topics_query)).all()
    ]

    service_performance_query = (
        select(
            func.coalesce(ChatLog.service_name, "general_chat").label("service_name"),
            func.count(ChatLog.id).label("total_requests"),
            func.count(ChatLog.id)
            .filter(ChatLog.escalation_flag.is_(True))
            .label("escalation_count"),
            func.count(ChatLog.id)
            .filter(ChatLog.unanswered_question_flag.is_(True))
            .label("unanswered_count"),
            func.coalesce(func.avg(ChatLog.confidence_score), 0.0).label(
                "average_confidence"
            ),
            func.avg(ChatLog.latency_ms).label("average_latency_ms"),
        )
        .group_by(func.coalesce(ChatLog.service_name, "general_chat"))
        .order_by(desc("total_requests"))
    )
    service_performance = [
        ServicePerformanceMetric(
            service_name=row.service_name,
            total_requests=row.total_requests,
            escalation_count=row.escalation_count,
            unanswered_count=row.unanswered_count,
            average_confidence=float(row.average_confidence or 0.0),
            average_latency_ms=(
                float(row.average_latency_ms)
                if row.average_latency_ms is not None
                else None
            ),
        )
        for row in (await db.execute(service_performance_query)).all()
    ]

    return AdminDashboardResponse(
        total_chatbot_usage=aggregate_row.total_chatbot_usage,
        unanswered_questions_count=aggregate_row.unanswered_questions_count,
        escalation_volume=aggregate_row.escalation_volume,
        popular_topics=popular_topics,
        response_quality=ResponseQualityMetric(
            average_confidence=float(aggregate_row.average_confidence or 0.0),
            low_confidence_count=aggregate_row.low_confidence_count,
        ),
        service_performance=service_performance,
    )
