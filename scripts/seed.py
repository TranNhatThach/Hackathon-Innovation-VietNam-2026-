import asyncio
import hashlib
import os
import sys
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from backend.app.database import Base, _async_database_url  # noqa: E402
from backend.models import (  # noqa: E402
    ApprovalStatus,
    ChatLog,
    ChatSession,
    Doctor,
    DocumentMetadata,
    ServicePricing,
)

COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "hospital_approved_documents")
VECTOR_SIZE = 1536


def _deterministic_vector(text: str, size: int = VECTOR_SIZE) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    while len(values) < size:
        for index in range(0, len(digest), 4):
            chunk = digest[index : index + 4]
            if len(chunk) < 4:
                break
            values.append((int.from_bytes(chunk, "big") / 2**32) * 2 - 1)
            if len(values) >= size:
                break
        digest = hashlib.sha256(digest).digest()
    return values[:size]


APPROVED_DOCUMENTS = [
    {
        "title": "Hướng dẫn đặt lịch khám ngoại trú",
        "owner": "Phòng Chăm sóc khách hàng",
        "content": (
            "Bước 1: Chọn kênh đặt lịch (Website, Zalo Mini App hoặc tổng đài 19000000).\n"
            "Bước 2: Cung cấp họ tên, năm sinh, số điện thoại và chuyên khoa cần khám.\n"
            "Bước 3: Chọn ngày và khung giờ phù hợp.\n"
            "Bước 4: Xác nhận lịch hẹn qua SMS hoặc Zalo."
        ),
        "topic": "appointment_booking",
    },
    {
        "title": "Lịch khám chuyên khoa Tim mạch",
        "owner": "Khoa Tim mạch",
        "content": (
            "Bác sĩ Nguyễn Văn An: Thứ 2, 4, 6 — 8:00–11:30.\n"
            "Bác sĩ Trần Thị Bình: Thứ 3, 5 — 13:30–16:30.\n"
            "Khám theo lịch hẹn, ưu tiên bệnh nhân có giấy chuyển tuyến."
        ),
        "topic": "doctor_schedule",
    },
    {
        "title": "Quyền lợi BHYT tại Bệnh viện Tim Hà Nội",
        "owner": "Phòng Kế hoạch Tổng hợp",
        "content": (
            "Bước 1: Mang thẻ BHYT còn hiệu lực và giấy tờ tùy thân.\n"
            "Bước 2: Đăng ký tại quầy tiếp đón để xác thực quyền lợi.\n"
            "Bước 3: Chi phí trong phạm vi BHYT chi trả theo quy định hiện hành.\n"
            "Bước 4: Phần chi phí ngoài phạm vi BHYT do người bệnh tự chi trả."
        ),
        "topic": "health_insurance",
    },
    {
        "title": "Bảng giá dịch vụ khám ngoại trú",
        "owner": "Phòng Tài chính Kế toán",
        "content": (
            "Khám chuyên khoa Tim mạch: 300.000 VNĐ.\n"
            "Siêu âm tim: 450.000 VNĐ.\n"
            "Điện tim (ECG): 120.000 VNĐ.\n"
            "Giá đã bao gồm phí khám; chi phí cận lâm sàng tính riêng nếu có chỉ định."
        ),
        "topic": "service_pricing",
    },
    {
        "title": "Quy trình nhập viện nội trú",
        "owner": "Phòng Điều dưỡng",
        "content": (
            "Bước 1: Bác sĩ chỉ định nhập viện sau khám ngoại trú hoặc cấp cứu.\n"
            "Bước 2: Làm thủ tục tại quầy Nhập viện — xuất trình thẻ BHYT và CMND/CCCD.\n"
            "Bước 3: Đóng tạm ứng theo hướng dẫn của bệnh viện.\n"
            "Bước 4: Nhận phòng và được hướng dẫn quy trình điều trị nội trú."
        ),
        "topic": "admission",
    },
    {
        "title": "Hướng dẫn tái khám sau xuất viện",
        "owner": "Phòng Chăm sóc khách hàng",
        "content": (
            "Bước 1: Giữ phiếu hẹn tái khám trong giấy ra viện.\n"
            "Bước 2: Đặt lịch tái khám trước ngày hẹn ít nhất 1 ngày.\n"
            "Bước 3: Mang theo toa thuốc, kết quả cận lâm sàng và thẻ BHYT.\n"
            "Bước 4: Đến đúng giờ hẹn tại quầy tiếp đón khu ngoại trú."
        ),
        "topic": "follow_up",
    },
    {
        "title": "Giờ làm việc và địa chỉ bệnh viện",
        "owner": "Ban Giám đốc",
        "content": (
            "Địa chỉ: Số 1 Phố Giải Phóng, Phường Giải Phóng, Hà Nội.\n"
            "Giờ tiếp đón ngoại trú: Thứ 2–Thứ 7, 7:00–16:30.\n"
            "Tổng đài Chăm sóc khách hàng: 19000000 (7:00–20:00 hàng ngày).\n"
            "Khoa Cấp cứu: phục vụ 24/7."
        ),
        "topic": "location",
    },
]


async def seed_postgres() -> None:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        print("⚠️ DATABASE_URL not set — skipping PostgreSQL seed.")
        return

    engine = create_async_engine(_async_database_url(database_url), pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    today = date.today()
    effective_date = today - timedelta(days=30)
    review_date = today + timedelta(days=180)

    async with session_factory() as session:
        for document in APPROVED_DOCUMENTS:
            existing = await session.scalar(
                select(DocumentMetadata).where(
                    DocumentMetadata.title == document["title"],
                    DocumentMetadata.version == "1.0",
                )
            )
            if existing is None:
                session.add(
                    DocumentMetadata(
                        title=document["title"],
                        owner=document["owner"],
                        approval_status=ApprovalStatus.APPROVED,
                        effective_date=effective_date,
                        review_date=review_date,
                        version="1.0",
                        version_history=[
                            {
                                "version": "1.0",
                                "approved_by": document["owner"],
                                "approved_at": effective_date.isoformat(),
                            }
                        ],
                    )
                )

        doctors = [
            ("BS. Nguyễn Văn An", "Tim mạch", {"monday": "08:00-11:30", "wednesday": "08:00-11:30", "friday": "08:00-11:30"}),
            ("BS. Trần Thị Bình", "Tim mạch", {"tuesday": "13:30-16:30", "thursday": "13:30-16:30"}),
            ("BS. Lê Hoàng Cường", "Nội tim mạch", {"monday": "13:30-16:00", "friday": "08:00-11:00"}),
        ]
        for name, department, schedule in doctors:
            existing = await session.scalar(select(Doctor).where(Doctor.name == name))
            if existing is None:
                session.add(Doctor(name=name, department=department, schedule=schedule))

        services = [
            ("Khám chuyên khoa Tim mạch", Decimal("300000.00")),
            ("Siêu âm tim", Decimal("450000.00")),
            ("Điện tim (ECG)", Decimal("120000.00")),
            ("Holter 24h", Decimal("850000.00")),
        ]
        for service_name, price in services:
            existing = await session.scalar(
                select(ServicePricing).where(ServicePricing.service_name == service_name)
            )
            if existing is None:
                session.add(ServicePricing(service_name=service_name, price=price))

        demo_session = await session.scalar(
            select(ChatSession).where(ChatSession.session_id == "demo-session-001")
        )
        if demo_session is None:
            session.add(ChatSession(session_id="demo-session-001", channel="web_chat"))
            session.add(
                ChatLog(
                    session_id="demo-session-001",
                    user_query="Tôi muốn đặt lịch khám tim mạch",
                    bot_response="Bạn có thể đặt lịch qua Website, Zalo Mini App hoặc gọi 19000000.",
                    confidence_score=0.92,
                    escalation_flag=False,
                    unanswered_question_flag=False,
                    topic="appointment_booking",
                    service_name="appointment_booking",
                    latency_ms=420,
                )
            )

        await session.commit()

    await engine.dispose()
    print("✅ PostgreSQL seeded (DocumentMetadata, Doctors, ServicePricing, demo ChatLog).")


def seed_qdrant() -> None:
    qdrant_host = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))

    print(f"Connecting to Qdrant at {qdrant_host}:{qdrant_port}...")
    try:
        client = QdrantClient(host=qdrant_host, port=qdrant_port)
        client.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )

        today = date.today()
        effective_date = (today - timedelta(days=30)).isoformat()
        review_date = (today + timedelta(days=180)).isoformat()

        points: list[PointStruct] = []
        for document in APPROVED_DOCUMENTS:
            embed_text = f"{document['title']}\n{document['content']}"
            points.append(
                PointStruct(
                    id=str(uuid4()),
                    vector=_deterministic_vector(embed_text),
                    payload={
                        "title": document["title"],
                        "owner": document["owner"],
                        "approval_status": "approved",
                        "effective_date": effective_date,
                        "review_date": review_date,
                        "version": "1.0",
                        "version_history": [
                            {
                                "version": "1.0",
                                "approved_by": document["owner"],
                                "approved_at": effective_date,
                            }
                        ],
                        "content": document["content"],
                        "topic": document["topic"],
                    },
                )
            )

        client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"✅ Qdrant collection '{COLLECTION_NAME}' seeded with {len(points)} approved documents.")
    except Exception as error:
        print(f"⚠️ Qdrant seeding failed (ensure Qdrant container is active): {error}")


async def seed_databases() -> None:
    print("🌱 Initializing seeding process...")
    await seed_postgres()
    seed_qdrant()
    print("🎉 Seeding routine complete!")


if __name__ == "__main__":
    asyncio.run(seed_databases())
