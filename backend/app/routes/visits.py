from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Patient, Visit, VisitJourneyEvent

router = APIRouter(prefix="/api/visits", tags=["Visits"])


def clean_legacy_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value
    for _ in range(2):
        repaired = None
        for encoding in ("cp1252", "latin1"):
            try:
                candidate = cleaned.encode(encoding).decode("utf-8")
                if candidate != cleaned:
                    repaired = candidate
                    break
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
        if repaired is None:
            break
        cleaned = repaired
    return cleaned


def utc_datetime(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)

STAGES = {
    "SCHEDULED": ("Đã xác nhận lịch", "Chờ người bệnh đến viện"),
    "REGISTRATION": ("Đăng ký", "Hoàn tất đăng ký và kiểm tra giấy tờ"),
    "PAYMENT": ("Thanh toán", "Hoàn tất thanh toán"),
    "VITALS": ("Đo sinh hiệu", "Đến khu vực chờ bác sĩ"),
    "WAITING_DOCTOR": ("Chờ bác sĩ", "Chờ được gọi vào phòng khám"),
    "CONSULTATION": ("Đang khám", "Chờ chỉ định tiếp theo"),
    "TESTS": ("Cận lâm sàng", "Hoàn tất xét nghiệm/chẩn đoán"),
    "RESULTS": ("Nhận kết quả", "Quay lại bác sĩ kết luận"),
    "PHARMACY": ("Nhận thuốc", "Nhận thuốc và hướng dẫn sử dụng"),
    "COMPLETED": ("Hoàn tất", "Lượt khám đã hoàn thành"),
}


class VisitResponse(BaseModel):
    visit_code: str
    patient_name: str
    phone: str | None
    queue_number: str
    stage: str
    stage_label: str
    entered_stage_at: datetime
    room: str | None
    doctor: str | None
    next_action: str | None
    status: str


class VisitStageUpdate(BaseModel):
    stage: str
    room: str | None = Field(default=None, max_length=100)


def response_for(visit: Visit) -> VisitResponse:
    return VisitResponse(
        visit_code=visit.visit_code,
        patient_name=clean_legacy_text(visit.patient.display_name),
        phone=visit.patient.phone,
        queue_number=visit.queue_number,
        stage=visit.stage,
        stage_label=clean_legacy_text(visit.stage_label),
        entered_stage_at=utc_datetime(visit.entered_stage_at),
        room=clean_legacy_text(visit.room),
        doctor=clean_legacy_text(visit.doctor),
        next_action=clean_legacy_text(visit.next_action),
        status=visit.status,
    )


@router.get("/staff", response_model=list[VisitResponse])
def list_staff_visits(db: Session = Depends(get_db)):
    visits = (
        db.query(Visit)
        .join(Patient)
        .filter(Patient.is_demo.is_(False), Visit.status == "ACTIVE")
        .order_by(Visit.entered_stage_at.desc(), Visit.id.desc())
        .all()
    )
    return [response_for(visit) for visit in visits]


@router.patch("/{visit_code}/stage", response_model=VisitResponse)
def update_visit_stage(visit_code: str, payload: VisitStageUpdate, db: Session = Depends(get_db)):
    if payload.stage not in STAGES:
        raise HTTPException(status_code=422, detail="Bước khám không hợp lệ")
    visit = db.query(Visit).filter(Visit.visit_code == visit_code).first()
    if visit is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt khám")
    label, next_action = STAGES[payload.stage]
    now = datetime.utcnow()
    visit.stage = payload.stage
    visit.stage_label = label
    visit.entered_stage_at = now
    visit.next_action = next_action
    visit.room = payload.room.strip() if payload.room else visit.room
    if payload.stage == "COMPLETED":
        visit.status = "COMPLETED"
    db.add(VisitJourneyEvent(
        visit_id=visit.id,
        stage=payload.stage,
        stage_label=label,
        status="current",
        occurred_at=now,
        location=visit.room,
        note="Cập nhật bởi cổng nhân viên",
    ))
    db.commit()
    db.refresh(visit)
    return response_for(visit)
