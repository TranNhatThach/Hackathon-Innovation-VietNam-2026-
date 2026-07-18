"""Keep only the newest pending appointment for each real patient."""

from backend.app.database import SessionLocal
from backend.app.models import Appointment, Patient


def main() -> None:
    db = SessionLocal()
    collapsed = 0
    try:
        patients = db.query(Patient).filter(Patient.is_demo.is_(False)).all()
        for patient in patients:
            pending = (
                db.query(Appointment)
                .filter(
                    Appointment.patient_id == patient.id,
                    Appointment.status == "Chờ xác nhận",
                )
                .order_by(Appointment.created_at.desc(), Appointment.id.desc())
                .all()
            )
            for appointment in pending[1:]:
                appointment.status = "Đã thay thế"
                for visit in appointment.visits:
                    if visit.status == "ACTIVE":
                        visit.status = "CANCELLED"
                collapsed += 1
        db.commit()
        print(f"Collapsed {collapsed} duplicate pending appointments.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
