"""Create missing visit journeys for real appointment requests."""

import uuid

from backend.app.database import SessionLocal
from backend.app.models import Appointment, Patient, Visit, VisitJourneyEvent


def main() -> None:
    db = SessionLocal()
    try:
        appointments = (
            db.query(Appointment)
            .join(Patient)
            .outerjoin(Visit, Visit.appointment_id == Appointment.id)
            .filter(Patient.is_demo.is_(False), Visit.id.is_(None))
            .all()
        )
        for appointment in appointments:
            visit = Visit(
                visit_code=f"LUOT-{appointment.created_at:%y%m%d}-{uuid.uuid4().hex[:6].upper()}",
                patient_id=appointment.patient_id,
                appointment_id=appointment.id,
                queue_number=f"H{appointment.id:03d}",
                stage="SCHEDULED",
                stage_label="Chờ xác nhận lịch",
                entered_stage_at=appointment.created_at,
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
                occurred_at=appointment.created_at,
                note="Đồng bộ từ yêu cầu đặt lịch của người bệnh",
            ))
        db.commit()
        print(f"Created {len(appointments)} missing visit journey records.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
