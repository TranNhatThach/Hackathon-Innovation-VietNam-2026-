#!/usr/bin/env python
"""Create the current application schema and seed deterministic demo data."""
import json
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.database import Base, SessionLocal, engine
from backend.app.models import (
    Appointment,
    HumanCase,
    Medication,
    MedicationReminder,
    Patient,
    Procedure,
    ProcedureStep,
    Visit,
    VisitJourneyEvent,
)


def get_or_create(db, model, defaults=None, **lookup):
    instance = db.query(model).filter_by(**lookup).one_or_none()
    if instance:
        return instance, False
    instance = model(**lookup, **(defaults or {}))
    db.add(instance)
    db.flush()
    return instance, True


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    created = {}
    try:
        patient, created["patients"] = get_or_create(
            db, Patient, patient_code="BN-DEMO-0042",
            defaults={"display_name": "Nguyễn Văn An", "date_of_birth": date(1968, 4, 12), "phone": "0987 000 042", "address": "Phường Cửa Nam, Hà Nội", "preferred_channel": "web", "is_demo": True},
        )
        appointment, created["appointments"] = get_or_create(
            db, Appointment, appointment_code="HEN-260717-042",
            defaults={"patient_id": patient.id, "scheduled_at": datetime(2026, 7, 17, 9, 30), "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1", "department": "Phòng khám Tim mạch tổng quát", "doctor": "BS. Nguyễn Minh Anh", "visit_type": "Khám lần đầu", "payment_type": "BHYT", "status": "Đã xác nhận", "required_documents": json.dumps(["Căn cước công dân", "Thẻ BHYT", "Giấy chuyển tuyến (nếu có)"], ensure_ascii=False)},
        )
        visit, created["visits"] = get_or_create(
            db, Visit, visit_code="VISIT-001",
            defaults={"patient_id": patient.id, "appointment_id": appointment.id, "queue_number": "A024", "stage": "PAYMENT", "stage_label": "Chờ thanh toán", "entered_stage_at": datetime(2026, 7, 17, 10, 5), "room": "Quầy thu ngân số 03", "payment_type": "BHYT", "payment_status": "Chờ thanh toán", "priority": "Bình thường", "alerts": json.dumps([], ensure_ascii=False), "next_action": "Thanh toán và đến khu đo sinh hiệu", "status": "ACTIVE"},
        )

        events = [
            ("ARRIVED", "Đã đến viện", "done", datetime(2026, 7, 17, 9, 20), "Quầy tiếp đón"),
            ("REGISTRATION", "Đăng ký", "done", datetime(2026, 7, 17, 9, 30), "Quầy đăng ký"),
            ("PAYMENT", "Thanh toán", "current", datetime(2026, 7, 17, 10, 5), "Quầy thu ngân số 03"),
        ]
        event_count = 0
        for stage, label, status, occurred_at, location in events:
            _, was_created = get_or_create(db, VisitJourneyEvent, visit_id=visit.id, stage=stage, occurred_at=occurred_at, defaults={"stage_label": label, "status": status, "location": location})
            event_count += int(was_created)
        created["visit_journey_events"] = event_count

        medication_rows = [
            ("MED-001", "Cardioval 5 mg", "1 viên", "Sau ăn sáng", "08:00", "Sắp đến giờ"),
            ("MED-002", "Aspirin 81 mg", "1 viên", "Sau ăn tối", "20:00", "Chưa phản hồi"),
        ]
        medication_count = reminder_count = 0
        for code, name, dosage, schedule, reminder_time, reminder_status in medication_rows:
            medication, was_created = get_or_create(db, Medication, medication_code=code, defaults={"patient_id": patient.id, "name": name, "dosage": dosage, "schedule": schedule, "instruction": "Dùng theo đơn đã được bác sĩ duyệt; không tự ý thay đổi liều.", "valid_from": date(2026, 7, 17), "valid_to": date(2026, 7, 31), "approved_by": "BS. Nguyễn Minh Anh", "is_active": True})
            medication_count += int(was_created)
            hour, minute = map(int, reminder_time.split(":"))
            _, was_created = get_or_create(db, MedicationReminder, medication_id=medication.id, scheduled_at=datetime(2026, 7, 17, hour, minute), defaults={"status": reminder_status})
            reminder_count += int(was_created)
        created["medications"] = medication_count
        created["medication_reminders"] = reminder_count

        case_rows = [
            ("CASE-2406", "Hỗ trợ tại viện", "Người bệnh chờ lâu và cần xác minh vị trí.", "P0", datetime(2026, 7, 17, 10, 30), None, "Mở"),
            ("CASE-2407", "Hỗ trợ thanh toán", "Cần giải thích bước thanh toán BHYT.", "P2", datetime(2026, 7, 17, 11, 20), "Lan Anh", "Đang xử lý"),
        ]
        case_count = 0
        for code, case_type, trigger, priority, due_at, owner, status in case_rows:
            _, was_created = get_or_create(db, HumanCase, case_code=code, defaults={"patient_id": patient.id, "visit_id": visit.id, "case_type": case_type, "trigger": trigger, "priority": priority, "sla_due_at": due_at, "owner": owner, "status": status})
            case_count += int(was_created)
        created["human_cases"] = case_count

        procedure, created["procedures"] = get_or_create(db, Procedure, code="QT.25.01", defaults={"title": "Quy trình khám và điều trị ngoại trú tại Khu Khám bệnh Tự nguyện 1", "issue": "Lần ban hành 01", "effective_date": date(2026, 7, 1), "source_url": "/documents/QT.25.01.pdf", "is_active": True})
        step_titles = ["Đăng ký khám và kiểm tra giấy tờ", "Lấy số tiếp nhận", "Đăng ký khám", "BHYT và thu phí", "Đo sinh hiệu", "Khám bác sĩ", "Cận lâm sàng", "Nhận kết quả", "Nhận thuốc và hoàn tất"]
        step_count = 0
        for order, title in enumerate(step_titles, 1):
            _, was_created = get_or_create(db, ProcedureStep, procedure_id=procedure.id, step_order=order, defaults={"slug": f"buoc-{order}", "title": title, "patient_instruction": f"Thực hiện bước: {title} theo hướng dẫn của nhân viên.", "responsible_role": "Nhân viên phụ trách công đoạn", "staff_actions": json.dumps(["Xác minh thông tin", "Ghi nhận trạng thái", "Chuyển bước khi đủ điều kiện"], ensure_ascii=False), "source_pages": f"Trang {order}"})
            step_count += int(was_created)
        created["procedure_steps"] = step_count

        db.commit()
        print(json.dumps({"status": "ok", "created": created}, ensure_ascii=False))
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
