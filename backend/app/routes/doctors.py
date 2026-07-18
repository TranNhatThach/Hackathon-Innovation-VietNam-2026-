from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Appointment, Doctor
from backend.app.routes.appointments import clean_legacy_text

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


class DoctorCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=255)
    department: str = Field(min_length=2, max_length=255)
    facility: str = Field(default="Bệnh viện Tim Hà Nội - Cơ sở 1", min_length=2, max_length=255)


class DoctorResponse(BaseModel):
    doctor_code: str
    display_name: str
    department: str
    facility: str
    is_active: bool
    created_at: datetime


class DoctorStatusUpdate(BaseModel):
    is_active: bool


def response_for(doctor: Doctor) -> DoctorResponse:
    return DoctorResponse(
        doctor_code=doctor.doctor_code,
        display_name=doctor.display_name,
        department=doctor.department,
        facility=doctor.facility,
        is_active=doctor.is_active,
        created_at=doctor.created_at,
    )


def import_legacy_doctors(db: Session) -> None:
    if db.query(Doctor).count() > 0:
        return
    rows = db.query(Appointment.doctor, Appointment.department).filter(Appointment.doctor.isnot(None), Appointment.doctor != "").distinct().all()
    seen: set[tuple[str, str]] = set()
    for raw_name, raw_department in rows:
        name = clean_legacy_text(raw_name)
        department = clean_legacy_text(raw_department)
        if not name or not department or (name, department) in seen:
            continue
        seen.add((name, department))
        db.add(Doctor(doctor_code=f"BS-{uuid.uuid4().hex[:8].upper()}", display_name=name, department=department, is_active=True))
    db.commit()


@router.get("", response_model=list[DoctorResponse])
def list_doctors(db: Session = Depends(get_db)):
    import_legacy_doctors(db)
    return [response_for(item) for item in db.query(Doctor).order_by(Doctor.is_active.desc(), Doctor.display_name).all()]


@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)):
    name = payload.display_name.strip()
    department = payload.department.strip()
    existing = db.query(Doctor).filter(Doctor.display_name == name, Doctor.department == department).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bác sĩ này đã tồn tại trong chuyên khoa")
    doctor = Doctor(doctor_code=f"BS-{uuid.uuid4().hex[:8].upper()}", display_name=name, department=department, facility=payload.facility.strip(), is_active=True)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return response_for(doctor)


@router.patch("/{doctor_code}/status", response_model=DoctorResponse)
def update_doctor_status(doctor_code: str, payload: DoctorStatusUpdate, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.doctor_code == doctor_code).first()
    if doctor is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
    doctor.is_active = payload.is_active
    db.commit()
    db.refresh(doctor)
    return response_for(doctor)
