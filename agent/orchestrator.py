import json
import os
import time
from datetime import UTC, date, datetime
from typing import Any

import httpx
from pydantic import BaseModel, Field, ValidationError
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import FieldCondition, Filter, MatchValue
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from agent.config import FPT_API_KEY, FPT_BASE_URL, FPT_MODEL
from backend.models import ChatLog, ChatSession


CONFIDENCE_THRESHOLD = 0.7

FALLBACK_MESSAGE = (
    "Tôi chưa thể xác nhận câu trả lời này từ nguồn thông tin chính thức của "
    "Bệnh viện Tim Hà Nội. Yêu cầu của bạn đã được chuyển tới nhân viên hỗ trợ. "
    "Vui lòng liên hệ tổng đài Chăm sóc khách hàng của bệnh viện để được hỗ trợ."
)

GROUNDING_INSTRUCTION = """
Bạn là trợ lý số của Bệnh viện Tim Hà Nội.
Chỉ trả lời bằng OFFICIAL_CONTEXT đã được phê duyệt. Không sử dụng kiến thức Internet,
kiến thức y khoa chung, hoặc suy đoán.
Chỉ hỗ trợ các nhóm thông tin chính thức: đặt lịch khám, lịch bác sĩ, quy trình khám chữa bệnh,
BHYT, bảng giá dịch vụ, nhập viện, tái khám, vị trí khoa phòng và giờ làm việc.
Nếu OFFICIAL_CONTEXT không đủ để trả lời, hãy nói rõ thông tin chưa có trong nguồn chính thức.
Không chẩn đoán, không kê đơn, không hướng dẫn xử trí cấp cứu.
Viết tiếng Việt đơn giản, từng bước ngắn, phù hợp với người cao tuổi.
Trả về JSON hợp lệ duy nhất theo định dạng:
{"answer": "câu trả lời tiếng Việt", "confidence_score": 0.0}
confidence_score phải nằm trong khoảng từ 0 đến 1.
"""

SERVICE_TOPICS = {"appointment_booking", "doctor_schedule", "service_pricing"}

TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "appointment_booking": ("đặt lịch", "dat lich", "booking", "zalo", "website"),
    "doctor_schedule": ("bác sĩ", "bac si", "lịch khám", "lich kham", "schedule"),
    "service_pricing": ("giá", "gia", "chi phí", "chi phi", "pricing", "bảng giá"),
    "health_insurance": ("bhyt", "bảo hiểm", "bao hiem", "insurance"),
    "procedure_guidance": ("quy trình", "quy trinh", "thủ tục", "thu tuc", "procedure"),
    "working_hours": ("giờ làm", "gio lam", "working hour", "mấy giờ"),
    "location": ("địa chỉ", "dia chi", "ở đâu", "o dau", "location"),
}


class AgentDecision(BaseModel):
    answer: str = Field(min_length=1)
    confidence_score: float = Field(ge=0.0, le=1.0)


class GovernedContext(BaseModel):
    title: str
    owner: str
    approval_status: str
    effective_date: date
    review_date: date
    version: str
    version_history: list[dict[str, Any]]
    content: str
    score: float


class ChatResult(BaseModel):
    response: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    escalation_flag: bool
    unanswered_question_flag: bool
    topic: str | None = None


class FPTAIFactoryAsyncClient:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        chat_model: str,
        embedding_model: str,
    ) -> None:
        self._chat_model = chat_model
        self._embedding_model = embedding_model
        self._base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
        )

    async def embed(self, text: str) -> list[float]:
        response = await self._client.post(
            f"{self._base_url}/embeddings",
            headers=self._headers,
            json={
                "model": self._embedding_model,
                "input": text,
            },
        )
        response.raise_for_status()

        vector = response.json()["data"][0]["embedding"]
        if not isinstance(vector, list) or not vector:
            raise ValueError("FPT AI Factory returned an invalid embedding vector.")

        return [float(value) for value in vector]

    async def generate_grounded_answer(
        self,
        *,
        user_message: str,
        contexts: list[GovernedContext],
    ) -> AgentDecision:
        official_context = "\n\n".join(
            (
                f"[title={context.title}; owner={context.owner}; "
                f"approval_status={context.approval_status}; "
                f"effective_date={context.effective_date.isoformat()}; "
                f"review_date={context.review_date.isoformat()}; "
                f"version={context.version}; score={context.score:.3f}]\n"
                f"{context.content}"
            )
            for context in contexts
        )

        response = await self._client.post(
            f"{self._base_url}/chat/completions",
            headers=self._headers,
            json={
                "model": self._chat_model,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": GROUNDING_INSTRUCTION},
                    {
                        "role": "user",
                        "content": (
                            f"OFFICIAL_CONTEXT:\n{official_context}\n\n"
                            f"USER_MESSAGE:\n{user_message}"
                        ),
                    },
                ],
            },
        )
        response.raise_for_status()

        raw_content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(raw_content, str):
            raise ValueError("FPT AI Factory returned a non-text completion.")

        normalized_content = raw_content.strip()
        if normalized_content.startswith("```"):
            normalized_content = normalized_content.removeprefix("```json")
            normalized_content = normalized_content.removeprefix("```").strip()
            if normalized_content.endswith("```"):
                normalized_content = normalized_content[:-3].strip()

        decision = AgentDecision.model_validate(json.loads(normalized_content))
        if not decision.answer.strip():
            raise ValueError("FPT AI Factory returned an empty answer.")

        return decision

    async def aclose(self) -> None:
        await self._client.aclose()


class HospitalRAGOrchestrator:
    def __init__(
        self,
        *,
        qdrant: AsyncQdrantClient,
        fpt_client: FPTAIFactoryAsyncClient,
        collection_name: str,
        minimum_similarity: float = 0.65,
    ) -> None:
        self._qdrant = qdrant
        self._fpt_client = fpt_client
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

        fpt_client = FPTAIFactoryAsyncClient(
            api_key=FPT_API_KEY,
            base_url=FPT_BASE_URL,
            chat_model=FPT_MODEL,
            embedding_model=os.getenv(
                "FPT_AI_FACTORY_EMBEDDING_MODEL",
                "text-embedding-3-small",
            ),
        )

        return cls(
            qdrant=qdrant,
            fpt_client=fpt_client,
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
            decision = await self._fpt_client.generate_grounded_answer(
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

        escalation_flag = decision.confidence_score < CONFIDENCE_THRESHOLD
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
        query_vector = await self._fpt_client.embed(user_message)

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
            chat_session.last_seen_at = datetime.now(UTC)

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
    def _elapsed_ms(started_at: float) -> int:
        return max(0, int((time.perf_counter() - started_at) * 1000))

    async def aclose(self) -> None:
        await self._fpt_client.aclose()
        await self._qdrant.close()
