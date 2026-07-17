import json
import os
import re
import time
from datetime import date, datetime, timezone
from typing import Any

import httpx
from pydantic import BaseModel, Field, ValidationError
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import FieldCondition, Filter, MatchValue
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from agent.adk_agent import (
    AgentDecision,
    GovernedContext,
    HospitalConciergeAgent,
)
from backend.models import ChatLog, ChatSession


CONFIDENCE_THRESHOLD = 0.7

FALLBACK_MESSAGE = (
    "Tôi chưa thể xác nhận câu trả lời này từ nguồn thông tin chính thức của "
    "Bệnh viện Tim Hà Nội. Yêu cầu của bạn đã được chuyển tới nhân viên hỗ trợ. "
    "Vui lòng liên hệ tổng đài Chăm sóc khách hàng của bệnh viện để được hỗ trợ."
)

APPROVED_TOPICS = frozenset(
    {
        "appointment_booking",
        "doctor_schedule",
        "service_pricing",
        "health_insurance",
        "procedure_guidance",
        "admission",
        "follow_up",
        "working_hours",
        "location",
    }
)

SERVICE_TOPICS = {
    "appointment_booking",
    "doctor_schedule",
    "service_pricing",
    "admission",
    "follow_up",
}

TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "appointment_booking": ("đặt lịch", "dat lich", "booking", "zalo", "website", "hẹn khám"),
    "doctor_schedule": ("bác sĩ", "bac si", "lịch khám", "lich kham", "schedule"),
    "service_pricing": ("giá", "gia", "chi phí", "chi phi", "pricing", "bảng giá", "bang gia"),
    "health_insurance": ("bhyt", "bảo hiểm", "bao hiem", "insurance"),
    "procedure_guidance": ("quy trình", "quy trinh", "thủ tục", "thu tuc", "procedure"),
    "admission": ("nhập viện", "nhap vien", "admission", "nội trú", "noi tru"),
    "follow_up": ("tái khám", "tai kham", "follow-up", "follow up", "hẹn lại"),
    "working_hours": ("giờ làm", "gio lam", "working hour", "mấy giờ", "may gio", "mở cửa"),
    "location": ("địa chỉ", "dia chi", "ở đâu", "o dau", "location", "khoa", "phòng"),
}

OUT_OF_SCOPE_PATTERN = re.compile(
    r"(?:chẩn\s*đoán|kê\s*đơn|uống\s*thuốc|điều\s*trị|bệnh\s*gì|triệu\s*chứng|"
    r"thuốc\s*gì|liều\s*lượng|"
    r"diagnos|prescri|medication|treatment|symptom|dosage)",
    flags=re.IGNORECASE | re.UNICODE,
)


class ChatResult(BaseModel):
    response: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    escalation_flag: bool
    unanswered_question_flag: bool
    topic: str | None = None


class HospitalRAGOrchestrator:
    def __init__(
        self,
        *,
        qdrant: AsyncQdrantClient,
        adk_agent: HospitalConciergeAgent,
        collection_name: str,
        minimum_similarity: float = 0.65,
    ) -> None:
        self._qdrant = qdrant
        self._adk_agent = adk_agent
        self._collection_name = collection_name
        self._minimum_similarity = minimum_similarity

    @classmethod
    def from_environment(cls) -> "HospitalRAGOrchestrator":
        qdrant = AsyncQdrantClient(
            host=os.getenv("QDRANT_HOST", "qdrant"),
            port=int(os.getenv("QDRANT_PORT", "6333")),
            api_key=os.getenv("QDRANT_API_KEY") or None,
            timeout=10.0,
        )

        adk_agent = HospitalConciergeAgent(
            api_key=os.getenv("FPT_AI_FACTORY_API_KEY", ""),
            base_url=os.getenv("FPT_AI_FACTORY_BASE_URL", "https://api.fpt.ai/v1"),
            chat_model=os.getenv("FPT_AI_FACTORY_MODEL", "gpt-4o-mini"),
            embedding_model=os.getenv(
                "FPT_AI_FACTORY_EMBEDDING_MODEL",
                "text-embedding-3-small",
            ),
        )

        return cls(
            qdrant=qdrant,
            adk_agent=adk_agent,
            collection_name=os.getenv(
                "QDRANT_COLLECTION_NAME",
                "hospital_approved_documents",
            ),
        )

    async def handle_chat(
        self,
        *,
        db: AsyncSession,
        session_id: str,
        user_message: str,
    ) -> ChatResult:
        started_at = time.perf_counter()
        topic = self._classify_topic(user_message)

        if self._is_out_of_scope(user_message):
            return await self._persist_result(
                db=db,
                session_id=session_id,
                user_message=user_message,
                bot_response=FALLBACK_MESSAGE,
                confidence_score=0.0,
                escalation_flag=True,
                unanswered_question_flag=True,
                topic=topic,
                latency_ms=self._elapsed_ms(started_at),
            )

        try:
            contexts = await self._retrieve_governed_context(user_message)
        except Exception:
            contexts = []

        if not contexts:
            return await self._persist_result(
                db=db,
                session_id=session_id,
                user_message=user_message,
                bot_response=FALLBACK_MESSAGE,
                confidence_score=0.0,
                escalation_flag=True,
                unanswered_question_flag=True,
                topic=topic,
                latency_ms=self._elapsed_ms(started_at),
            )

        try:
            decision = await self._adk_agent.generate_grounded_answer(
                user_message=user_message,
                contexts=contexts,
            )
        except (httpx.HTTPError, KeyError, TypeError, ValueError, ValidationError):
            return await self._persist_result(
                db=db,
                session_id=session_id,
                user_message=user_message,
                bot_response=FALLBACK_MESSAGE,
                confidence_score=0.0,
                escalation_flag=True,
                unanswered_question_flag=True,
                topic=topic,
                latency_ms=self._elapsed_ms(started_at),
            )

        escalation_flag = (
            decision.confidence_score < CONFIDENCE_THRESHOLD
            or self._requires_escalation(topic, decision)
        )
        bot_response = FALLBACK_MESSAGE if escalation_flag else decision.answer.strip()

        return await self._persist_result(
            db=db,
            session_id=session_id,
            user_message=user_message,
            bot_response=bot_response,
            confidence_score=decision.confidence_score,
            escalation_flag=escalation_flag,
            unanswered_question_flag=escalation_flag,
            topic=topic,
            latency_ms=self._elapsed_ms(started_at),
        )

    async def _retrieve_governed_context(
        self,
        user_message: str,
    ) -> list[GovernedContext]:
        query_vector = await self._adk_agent.embed(user_message)

        hits = await self._qdrant.search(
            collection_name=self._collection_name,
            query_vector=query_vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="approval_status",
                        match=MatchValue(value="approved"),
                    )
                ]
            ),
            limit=5,
            with_payload=True,
        )

        contexts: list[GovernedContext] = []
        for hit in hits:
            payload = dict(hit.payload or {})
            context = self._to_governed_context(
                payload=payload,
                score=float(hit.score),
            )
            if context is not None and context.score >= self._minimum_similarity:
                contexts.append(context)

        return contexts

    @staticmethod
    def _to_governed_context(
        *,
        payload: dict[str, Any],
        score: float,
    ) -> GovernedContext | None:
        required_fields = (
            "title",
            "owner",
            "approval_status",
            "effective_date",
            "review_date",
            "version",
            "version_history",
            "content",
        )

        if any(not payload.get(field) for field in required_fields):
            return None

        try:
            effective_date = date.fromisoformat(str(payload["effective_date"])[:10])
            review_date = date.fromisoformat(str(payload["review_date"])[:10])
        except ValueError:
            return None

        if (
            str(payload["approval_status"]).lower() != "approved"
            or effective_date > date.today()
            or review_date < date.today()
        ):
            return None

        version_history_payload = payload["version_history"]
        if isinstance(version_history_payload, str):
            try:
                version_history_payload = json.loads(version_history_payload)
            except json.JSONDecodeError:
                return None

        if not isinstance(version_history_payload, list):
            return None

        return GovernedContext(
            title=str(payload["title"]),
            owner=str(payload["owner"]),
            approval_status="approved",
            effective_date=effective_date,
            review_date=review_date,
            version=str(payload["version"]),
            version_history=[
                item for item in version_history_payload if isinstance(item, dict)
            ],
            content=str(payload["content"]),
            score=score,
        )

    @staticmethod
    async def _persist_result(
        *,
        db: AsyncSession,
        session_id: str,
        user_message: str,
        bot_response: str,
        confidence_score: float,
        escalation_flag: bool,
        unanswered_question_flag: bool,
        topic: str | None,
        latency_ms: int,
    ) -> ChatResult:
        chat_session = await db.scalar(
            select(ChatSession).where(ChatSession.session_id == session_id)
        )
        if chat_session is None:
            db.add(ChatSession(session_id=session_id))
        else:
            chat_session.last_seen_at = datetime.now(timezone.utc)

        db.add(
            ChatLog(
                session_id=session_id,
                user_query=user_message,
                bot_response=bot_response,
                confidence_score=confidence_score,
                escalation_flag=escalation_flag,
                unanswered_question_flag=unanswered_question_flag,
                topic=topic,
                service_name=topic if topic in SERVICE_TOPICS else None,
                latency_ms=latency_ms,
            )
        )

        try:
            await db.commit()
        except SQLAlchemyError:
            await db.rollback()
            raise

        return ChatResult(
            response=bot_response,
            confidence_score=confidence_score,
            escalation_flag=escalation_flag,
            unanswered_question_flag=unanswered_question_flag,
            topic=topic,
        )

    @staticmethod
    def _classify_topic(user_message: str) -> str:
        normalized_message = user_message.lower()
        for topic, keywords in TOPIC_KEYWORDS.items():
            if any(keyword in normalized_message for keyword in keywords):
                return topic
        return "other"

    @staticmethod
    def _is_out_of_scope(user_message: str) -> bool:
        return OUT_OF_SCOPE_PATTERN.search(user_message) is not None

    @staticmethod
    def _requires_escalation(topic: str, decision: AgentDecision) -> bool:
        if topic != "other" and topic in APPROVED_TOPICS:
            return False

        unavailable_markers = (
            "chưa có trong nguồn",
            "không có thông tin",
            "không thể xác nhận",
            "chưa được phê duyệt",
        )
        normalized_answer = decision.answer.lower()
        return any(marker in normalized_answer for marker in unavailable_markers)

    @staticmethod
    def _elapsed_ms(started_at: float) -> int:
        return max(0, int((time.perf_counter() - started_at) * 1000))

    async def aclose(self) -> None:
        await self._adk_agent.aclose()
        await self._qdrant.close()
