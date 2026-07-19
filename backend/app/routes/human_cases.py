from datetime import datetime, timezone
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import HumanCase, Patient, Visit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/human-cases", tags=["Human Cases"])

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

class PatientCaseResponse(BaseModel):
    id: int
    display_name: str
    phone: Optional[str] = None
    patient_code: Optional[str] = None

class HumanCaseResponse(BaseModel):
    id: int
    case_code: str
    case_type: str
    trigger: str
    priority: str
    status: str
    owner: Optional[str] = None
    created_at: datetime
    sla_due_at: datetime
    patient: Optional[PatientCaseResponse] = None

class HumanCaseUpdate(BaseModel):
    status: Optional[str] = None
    owner: Optional[str] = None
    priority: Optional[str] = None

def format_case_response(case: HumanCase) -> HumanCaseResponse:
    patient_data = None
    if case.patient:
        patient_data = PatientCaseResponse(
            id=case.patient.id,
            display_name=clean_legacy_text(case.patient.display_name) or "Không rõ",
            phone=case.patient.phone,
            patient_code=case.patient.patient_code
        )
    return HumanCaseResponse(
        id=case.id,
        case_code=case.case_code,
        case_type=clean_legacy_text(case.case_type) or "Hỗ trợ y tế",
        trigger=clean_legacy_text(case.trigger) or "",
        priority=case.priority,
        status=case.status,
        owner=clean_legacy_text(case.owner),
        created_at=utc_datetime(case.created_at),
        sla_due_at=utc_datetime(case.sla_due_at),
        patient=patient_data
    )

@router.get("", response_model=list[HumanCaseResponse])
def list_human_cases(
    status: Optional[str] = None,
    owner: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(HumanCase).join(Patient, isouter=True)
    
    if status:
        # Standardize matching status. Map UI status names to DB if necessary
        # The FE uses 'Mở' or 'Đã phân công' or 'Đã giải quyết', while DB seeds 'OPEN' or 'RESOLVED' or 'IN_PROGRESS'
        if status.lower() == "mở":
            query = query.filter(HumanCase.status.in_(["OPEN", "Mở"]))
        elif status.lower() == "đã giải quyết":
            query = query.filter(HumanCase.status.in_(["RESOLVED", "Đã giải quyết"]))
        elif status.lower() == "đã phân công":
            query = query.filter(HumanCase.status.in_(["IN_PROGRESS", "Đã phân công"]))
        else:
            query = query.filter(HumanCase.status == status)
            
    if owner is not None:
        if owner == "" or owner.lower() == "none" or owner.lower() == "null":
            query = query.filter(HumanCase.owner.is_(None))
        else:
            query = query.filter(HumanCase.owner == owner)
            
    if priority:
        query = query.filter(HumanCase.priority == priority)
        
    cases = query.order_by(HumanCase.created_at.desc()).all()
    return [format_case_response(case) for case in cases]

@router.patch("/{case_code}", response_model=HumanCaseResponse)
def update_human_case(
    case_code: str,
    payload: HumanCaseUpdate,
    db: Session = Depends(get_db)
):
    case = db.query(HumanCase).filter(HumanCase.case_code == case_code).first()
    if not case:
        # Also try to query by id if it's passed as a string representation of ID
        if case_code.isdigit():
            case = db.query(HumanCase).filter(HumanCase.id == int(case_code)).first()
            
    if not case:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự vụ can thiệp")
        
    if payload.status is not None:
        # Standardize UI status names to DB statuses
        new_status = payload.status
        if new_status.lower() in ("mở", "open"):
            new_status = "OPEN"
        elif new_status.lower() in ("đã giải quyết", "resolved", "đóng", "closed"):
            new_status = "RESOLVED"
        elif new_status.lower() in ("đã phân công", "in_progress", "in-progress"):
            new_status = "IN_PROGRESS"
        case.status = new_status
        
    if payload.owner is not None:
        case.owner = payload.owner if payload.owner else None
        
    if payload.priority is not None:
        case.priority = payload.priority
        
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    
    logger.info(f"Updated HumanCase {case.case_code}: status={case.status}, owner={case.owner}")
    return format_case_response(case)
