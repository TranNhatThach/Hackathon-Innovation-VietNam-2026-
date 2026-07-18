from datetime import date, datetime, time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Appointment, Doctor, Patient, Visit, VisitJourneyEvent

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


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


class AppointmentCreate(BaseModel):
    patient_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=8, max_length=30)
    department: str = Field(min_length=2, max_length=255)
    payment_type: str = Field(min_length=2, max_length=30)
    preferred_date: date
    preferred_period: str = Field(min_length=2, max_length=30)


class AppointmentResponse(BaseModel):
    appointment_code: str
    patient_code: str
    scheduled_at: datetime
    status: str
    facility: str
    department: str
    doctor: str | None
    visit_type: str
    payment_type: str


class AppointmentHistoryResponse(BaseModel):
    items: list[AppointmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class StaffAppointmentResponse(AppointmentResponse):
    patient_name: str
    phone: str | None
    created_at: datetime


class AppointmentAssignment(BaseModel):
    doctor: str = Field(min_length=2, max_length=255)


class DoctorOption(BaseModel):
    name: str
    departments: list[str]


def to_response(appointment: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        appointment_code=appointment.appointment_code,
        patient_code=appointment.patient.patient_code,
        scheduled_at=appointment.scheduled_at,
        status=clean_legacy_text(appointment.status),
        facility=clean_legacy_text(appointment.facility),
        department=clean_legacy_text(appointment.department),
        doctor=clean_legacy_text(appointment.doctor),
        visit_type=clean_legacy_text(appointment.visit_type),
        payment_type=clean_legacy_text(appointment.payment_type),
    )


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    try:
        payment_value = clean_legacy_text(payload.payment_type.strip()) or payload.payment_type.strip()
        payment_type = "BHYT" if payment_value.upper() == "BHYT" else "Dịch vụ"
        period_value = payload.preferred_period.strip().lower()
        preferred_period = "afternoon" if period_value in {"afternoon", "chiều", "buổi chiều"} else "morning"
        patient = db.query(Patient).filter(Patient.phone == payload.phone.strip()).first()
        if patient is None:
            patient = Patient(
                patient_code=f"BN-{uuid.uuid4().hex[:10].upper()}",
                display_name=payload.patient_name.strip(),
                phone=payload.phone.strip(),
                preferred_channel="web",
                is_demo=False,
            )
            db.add(patient)
            db.flush()
        else:
            patient.display_name = payload.patient_name.strip()
            patient.is_demo = False

        pending_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.patient_id == patient.id,
                Appointment.status == "Chờ xác nhận",
            )
            .all()
        )
        for pending in pending_appointments:
            pending.status = "Đã thay thế"
            for pending_visit in pending.visits:
                if pending_visit.status == "ACTIVE":
                    pending_visit.status = "CANCELLED"

        scheduled_time = time(9, 0) if preferred_period == "morning" else time(14, 0)
        appointment = Appointment(
            appointment_code=f"HEN-{datetime.now():%y%m%d}-{uuid.uuid4().hex[:6].upper()}",
            patient_id=patient.id,
            scheduled_at=datetime.combine(payload.preferred_date, scheduled_time),
            facility="Bệnh viện Tim Hà Nội - Cơ sở 1",
            department=payload.department.strip(),
            visit_type="Yêu cầu đặt lịch trực tuyến",
            payment_type=payment_type,
            status="Chờ xác nhận",
        )
        db.add(appointment)
        db.flush()

        now = datetime.utcnow()
        visit = Visit(
            visit_code=f"LUOT-{datetime.now():%y%m%d}-{uuid.uuid4().hex[:6].upper()}",
            patient_id=patient.id,
            appointment_id=appointment.id,
            queue_number=f"H{appointment.id:03d}",
            stage="SCHEDULED",
            stage_label="Chờ xác nhận lịch",
            entered_stage_at=now,
            payment_type=appointment.payment_type,
            payment_status="Chờ thanh toán",
            priority="Bình thường",
            next_action="Chờ nhân viên xác nhận và phân công bác sĩ",
            status="ACTIVE",
        )
        db.add(visit)
        db.flush()
        db.add(VisitJourneyEvent(
            visit_id=visit.id,
            stage="SCHEDULED",
            stage_label="Chờ xác nhận lịch",
            status="current",
            occurred_at=now,
            note="Tạo trực tiếp từ yêu cầu đặt lịch của người bệnh",
        ))
        db.commit()
        db.refresh(appointment)
        return to_response(appointment)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Không thể lưu yêu cầu đặt lịch") from exc


@router.get("/staff", response_model=list[StaffAppointmentResponse])
def list_staff_appointments(db: Session = Depends(get_db)):
    appointments = (
        db.query(Appointment)
        .join(Patient)
        .filter(
            Patient.is_demo.is_(False),
            Appointment.status != "Đã thay thế",
        )
        .order_by(Appointment.created_at.desc(), Appointment.id.desc())
        .all()
    )
    return [
        StaffAppointmentResponse(
            **to_response(appointment).model_dump(),
            patient_name=clean_legacy_text(appointment.patient.display_name),
            phone=appointment.patient.phone,
            created_at=appointment.created_at,
        )
        for appointment in appointments
    ]


@router.get("/doctors", response_model=list[DoctorOption])
def list_doctors(db: Session = Depends(get_db)):
    rows = db.query(Doctor).filter(Doctor.is_active.is_(True)).order_by(Doctor.display_name).all()
    grouped: dict[str, set[str]] = {}
    for doctor in rows:
        grouped.setdefault(doctor.display_name, set()).add(doctor.department)
    return [DoctorOption(name=name, departments=sorted(departments)) for name, departments in grouped.items()]


@router.patch("/{appointment_code}/assign", response_model=AppointmentResponse)
def assign_appointment(
    appointment_code: str,
    payload: AppointmentAssignment,
    db: Session = Depends(get_db),
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.appointment_code == appointment_code)
        .first()
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch hẹn")
    registered_doctor = db.query(Doctor).filter(Doctor.display_name == payload.doctor.strip(), Doctor.is_active.is_(True)).first()
    if registered_doctor is None:
        raise HTTPException(status_code=422, detail="Bác sĩ không tồn tại hoặc đã ngừng hoạt động")
    appointment.doctor = payload.doctor.strip()
    appointment.status = "Đã xác nhận"
    visit = db.query(Visit).filter(Visit.appointment_id == appointment.id).first()
    if visit is None:
        now = datetime.utcnow()
        visit = Visit(
            visit_code=f"LUOT-{datetime.now():%y%m%d}-{uuid.uuid4().hex[:6].upper()}",
            patient_id=appointment.patient_id,
            appointment_id=appointment.id,
            queue_number=f"H{appointment.id:03d}",
            stage="SCHEDULED",
            stage_label="Đã xác nhận lịch",
            entered_stage_at=now,
            doctor=appointment.doctor,
            payment_type=appointment.payment_type,
            payment_status="Chờ thanh toán",
            priority="Bình thường",
            next_action="Chờ người bệnh đến viện",
            status="ACTIVE",
        )
        db.add(visit)
        db.flush()
        db.add(VisitJourneyEvent(
            visit_id=visit.id,
            stage="SCHEDULED",
            stage_label="Đã xác nhận lịch",
            status="current",
            occurred_at=now,
            note="Tạo khi nhân viên xác nhận lịch",
        ))
    else:
        now = datetime.utcnow()
        visit.doctor = appointment.doctor
        visit.stage = "SCHEDULED"
        visit.stage_label = "Đã xác nhận lịch"
        visit.entered_stage_at = now
        visit.next_action = "Chờ người bệnh đến viện"
        db.add(VisitJourneyEvent(
            visit_id=visit.id,
            stage="SCHEDULED",
            stage_label="Đã xác nhận lịch",
            status="current",
            occurred_at=now,
            note="Nhân viên xác nhận lịch và phân công bác sĩ",
        ))
    db.commit()
    db.refresh(appointment)
    return to_response(appointment)


@router.get("", response_model=AppointmentHistoryResponse)
def list_appointments(
    phone: str = Query(min_length=8, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment).join(Patient).filter(Patient.phone == phone.strip())
    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    appointments = (
        query.order_by(Appointment.scheduled_at.desc(), Appointment.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return AppointmentHistoryResponse(
        items=[to_response(appointment) for appointment in appointments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{appointment_code}", response_model=AppointmentResponse)
def get_appointment(
    appointment_code: str,
    phone: str = Query(min_length=8, max_length=30),
    db: Session = Depends(get_db),
):
    appointment = (
        db.query(Appointment)
        .join(Patient)
        .filter(Appointment.appointment_code == appointment_code, Patient.phone == phone.strip())
        .first()
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch hẹn")
    return to_response(appointment)
