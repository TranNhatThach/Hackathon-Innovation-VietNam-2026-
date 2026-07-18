#!/usr/bin/env python
import os
import sys
import logging
from datetime import datetime, date, timedelta
import uuid

# Set up project root in path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from backend.app.database import engine, SessionLocal
from backend.app.models import (
    Base, Doctor, Patient, Appointment, Visit, VisitJourneyEvent,
    Medication, MedicationReminder, HumanCase
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_postgres")

# Define mock doctors matching agent/tools/tools.py DOCTOR_DATABASE
MOCK_DOCTORS = [
    {
        "doctor_code": "BS-001",
        "display_name": "GS.TS.BS. Nguyễn Văn Hùng",
        "department": "Tim mạch Can thiệp",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-002",
        "display_name": "PGS.TS.BS. Trần Thị Lan",
        "department": "Tim mạch Nhi",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-003",
        "display_name": "TS.BS. Lê Minh Tuấn",
        "department": "Rối loạn nhịp tim",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-004",
        "display_name": "BS.CKII. Phạm Thị Hoa",
        "department": "Suy tim và Bệnh cơ tim",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-005",
        "display_name": "BS.CKI. Hoàng Văn Nam",
        "department": "Tim mạch Nội khoa tổng quát",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-006",
        "display_name": "BS.CKI. Nguyễn Thị Bích Ngọc",
        "department": "Bệnh van tim",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-007",
        "display_name": "PGS.TS.BS. Đặng Quốc Tuấn",
        "department": "Tim mạch Can thiệp (Chụp và can thiệp mạch vành)",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-008",
        "display_name": "TS.BS. Nguyễn Thị Mai",
        "department": "Tim mạch Can thiệp (Thông tim và động mạch ngoại biên)",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-009",
        "display_name": "BS.CKII. Trần Công Bình",
        "department": "Tim mạch Can thiệp",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-010",
        "display_name": "GS.TS.BS. Vũ Ngọc Tú",
        "department": "Phẫu thuật Tim mạch",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    },
    {
        "doctor_code": "BS-011",
        "display_name": "BS.CKII. Lê Thị Thu",
        "department": "Tim mạch Nhi (Tim bẩm sinh)",
        "facility": "Bệnh viện Tim Hà Nội - Cơ sở 1",
        "is_active": True
    }
]

# Define mock patients (is_demo=False to display on staff dashboard)
MOCK_PATIENTS = [
    {
        "patient_code": "BN-DEMO-001",
        "display_name": "Nguyễn Văn An",
        "date_of_birth": date(1985, 5, 20),
        "phone": "0912345678",
        "address": "12 Cát Linh, Đống Đa, Hà Nội",
        "preferred_channel": "web",
        "is_demo": False
    },
    {
        "patient_code": "BN-DEMO-002",
        "display_name": "Trần Thị Bình",
        "date_of_birth": date(1962, 10, 15),
        "phone": "0987654321",
        "address": "45 Lê Duẩn, Hoàn Kiếm, Hà Nội",
        "preferred_channel": "web",
        "is_demo": False
    },
    {
        "patient_code": "BN-DEMO-003",
        "display_name": "Phạm Minh Hùng",
        "date_of_birth": date(1990, 2, 8),
        "phone": "0901234567",
        "address": "88 Giải Phóng, Hai Bà Trưng, Hà Nội",
        "preferred_channel": "web",
        "is_demo": False
    }
]

def seed():
    db = SessionLocal()
    try:
        # Create tables if not exists
        logger.info("Verifying database tables...")
        Base.metadata.create_all(bind=engine)

        # 1. Clean old seed data to prevent Unique Constraint violations
        logger.info("Cleaning old mock data...")
        
        # Clean visits and journey events
        visit_codes = ["LUOT-DEMO-001", "LUOT-DEMO-002", "LUOT-DEMO-003"]
        db.query(VisitJourneyEvent).filter(
            VisitJourneyEvent.visit_id.in_(
                db.query(Visit.id).filter(Visit.visit_code.in_(visit_codes))
            )
        ).delete(synchronize_session=False)
        db.query(Visit).filter(Visit.visit_code.in_(visit_codes)).delete(synchronize_session=False)

        # Clean appointments
        appt_codes = ["HEN-DEMO-001", "HEN-DEMO-002", "HEN-DEMO-003"]
        db.query(Appointment).filter(Appointment.appointment_code.in_(appt_codes)).delete(synchronize_session=False)

        # Clean medications and reminders
        med_codes = ["DT-DEMO-001", "DT-DEMO-002"]
        db.query(MedicationReminder).filter(
            MedicationReminder.medication_id.in_(
                db.query(Medication.id).filter(Medication.medication_code.in_(med_codes))
            )
        ).delete(synchronize_session=False)
        db.query(Medication).filter(Medication.medication_code.in_(med_codes)).delete(synchronize_session=False)

        # Clean human cases
        db.query(HumanCase).filter(HumanCase.case_code.like("CASE-DEMO-%")).delete(synchronize_session=False)

        # Clean patients
        patient_codes = [p["patient_code"] for p in MOCK_PATIENTS]
        db.query(Patient).filter(Patient.patient_code.in_(patient_codes)).delete(synchronize_session=False)

        # Clean doctors
        doc_codes = [d["doctor_code"] for d in MOCK_DOCTORS]
        db.query(Doctor).filter(Doctor.doctor_code.in_(doc_codes)).delete(synchronize_session=False)
        
        db.commit()
        logger.info("Clean-up completed.")

        # 2. Insert Doctors
        logger.info("Seeding Doctors...")
        inserted_doctors = []
        for doc_data in MOCK_DOCTORS:
            doctor = Doctor(**doc_data)
            db.add(doctor)
            inserted_doctors.append(doctor)
        db.flush() # Get IDs

        # 3. Insert Patients
        logger.info("Seeding Patients...")
        patient_map = {}
        for p_data in MOCK_PATIENTS:
            patient = Patient(**p_data)
            db.add(patient)
            db.flush()
            patient_map[patient.patient_code] = patient.id
        
        # 4. Insert Appointments
        logger.info("Seeding Appointments...")
        now = datetime.utcnow()
        
        # Appt 1: Nguyễn Văn An - Scheduled for Today, Confirmed
        appt1 = Appointment(
            appointment_code="HEN-DEMO-001",
            patient_id=patient_map["BN-DEMO-001"],
            scheduled_at=now + timedelta(hours=2),
            facility="Bệnh viện Tim Hà Nội - Cơ sở 1",
            department="Tim mạch Can thiệp",
            doctor="GS.TS.BS. Nguyễn Văn Hùng",
            visit_type="Khám lại",
            payment_type="BHYT",
            status="Đã xác nhận",
        )
        db.add(appt1)

        # Appt 2: Trần Thị Bình - Scheduled for Today, Completed
        appt2 = Appointment(
            appointment_code="HEN-DEMO-002",
            patient_id=patient_map["BN-DEMO-002"],
            scheduled_at=now - timedelta(hours=3),
            facility="Bệnh viện Tim Hà Nội - Cơ sở 1",
            department="Tim mạch Nhi",
            doctor="PGS.TS.BS. Trần Thị Lan",
            visit_type="Khám mới",
            payment_type="Dịch vụ",
            status="Đã khám",
        )
        db.add(appt2)

        # Appt 3: Phạm Minh Hùng - Scheduled for Today, Pending
        appt3 = Appointment(
            appointment_code="HEN-DEMO-003",
            patient_id=patient_map["BN-DEMO-003"],
            scheduled_at=now + timedelta(hours=4),
            facility="Bệnh viện Tim Hà Nội - Cơ sở 1",
            department="Rối loạn nhịp tim",
            doctor="TS.BS. Lê Minh Tuấn",
            visit_type="Khám mới",
            payment_type="Dịch vụ",
            status="Chờ xác nhận",
        )
        db.add(appt3)
        db.flush()

        # 5. Insert Visits and Visit Journey Events
        logger.info("Seeding Visits & Events...")
        
        # Visit 1 (Nguyễn Văn An): Active Visit - Currently Waiting for Doctor
        visit1 = Visit(
            visit_code="LUOT-DEMO-001",
            patient_id=patient_map["BN-DEMO-001"],
            appointment_id=appt1.id,
            queue_number="A024",
            stage="WAITING_DOCTOR",
            stage_label="Chờ bác sĩ",
            entered_stage_at=now - timedelta(minutes=15),
            room="Phòng 201",
            doctor="GS.TS.BS. Nguyễn Văn Hùng",
            payment_type="BHYT",
            payment_status="Đã thanh toán",
            priority="Bình thường",
            alerts="Bệnh nhân tăng huyết áp mãn tính",
            next_action="Vui lòng đợi gọi tên vào Phòng 201, Tầng 2 Khu A",
            status="ACTIVE"
        )
        db.add(visit1)
        db.flush()

        # Events for Visit 1
        db.add(VisitJourneyEvent(
            visit_id=visit1.id,
            stage="SCHEDULED",
            stage_label="Đã xác nhận lịch",
            status="completed",
            occurred_at=now - timedelta(hours=2),
            location="Hệ thống trực tuyến",
            note="Lịch hẹn đặt thành công trực tuyến."
        ))
        db.add(VisitJourneyEvent(
            visit_id=visit1.id,
            stage="REGISTRATION",
            stage_label="Đăng ký",
            status="completed",
            occurred_at=now - timedelta(minutes=45),
            location="Quầy đón tiếp số 2",
            note="Đã kiểm tra thẻ BHYT và CCCD."
        ))
        db.add(VisitJourneyEvent(
            visit_id=visit1.id,
            stage="PAYMENT",
            stage_label="Thanh toán",
            status="completed",
            occurred_at=now - timedelta(minutes=30),
            location="Quầy thu tiền số 3",
            note="Đã nộp tạm ứng khám BHYT."
        ))
        db.add(VisitJourneyEvent(
            visit_id=visit1.id,
            stage="WAITING_DOCTOR",
            stage_label="Chờ bác sĩ",
            status="current",
            occurred_at=now - timedelta(minutes=15),
            location="Phòng 201, Tầng 2",
            note="Hệ thống xếp hàng tự động phân vào Phòng 201."
        ))

        # Visit 2 (Trần Thị Bình): Completed Visit
        visit2 = Visit(
            visit_code="LUOT-DEMO-002",
            patient_id=patient_map["BN-DEMO-002"],
            appointment_id=appt2.id,
            queue_number="B005",
            stage="COMPLETED",
            stage_label="Hoàn tất",
            entered_stage_at=now - timedelta(hours=1),
            room="Phòng 220",
            doctor="PGS.TS.BS. Trần Thị Lan",
            payment_type="Dịch vụ",
            payment_status="Đã thanh toán",
            priority="Ưu tiên",
            alerts=None,
            next_action="Lượt khám hoàn thành, ra về và uống thuốc theo đơn",
            status="COMPLETED"
        )
        db.add(visit2)
        db.flush()

        db.add(VisitJourneyEvent(
            visit_id=visit2.id,
            stage="COMPLETED",
            stage_label="Hoàn tất",
            status="completed",
            occurred_at=now - timedelta(hours=1),
            location="Phòng khám 220",
            note="Khám xong, đã nhận đơn thuốc điện tử."
        ))

        # Visit 3 (Phạm Minh Hùng): Active Visit - Check-in stage (waiting confirmation)
        visit3 = Visit(
            visit_code="LUOT-DEMO-003",
            patient_id=patient_map["BN-DEMO-003"],
            appointment_id=appt3.id,
            queue_number="H003",
            stage="SCHEDULED",
            stage_label="Chờ xác nhận lịch",
            entered_stage_at=now - timedelta(minutes=5),
            room=None,
            doctor=None,
            payment_type="Dịch vụ",
            payment_status="Chờ thanh toán",
            priority="Bình thường",
            alerts=None,
            next_action="Chờ nhân viên xác nhận và phân công bác sĩ",
            status="ACTIVE"
        )
        db.add(visit3)
        db.flush()

        db.add(VisitJourneyEvent(
            visit_id=visit3.id,
            stage="SCHEDULED",
            stage_label="Chờ xác nhận lịch",
            status="current",
            occurred_at=now - timedelta(minutes=5),
            note="Tạo từ lịch hẹn chờ duyệt"
        ))

        # 6. Insert Medications & Reminders
        logger.info("Seeding Medications & Reminders...")
        
        # Medication for Patient 2 (Trần Thị Bình)
        med1 = Medication(
            medication_code="DT-DEMO-001",
            patient_id=patient_map["BN-DEMO-002"],
            name="Concor 5mg (Bisoprolol fumarate)",
            dosage="1 viên / ngày",
            schedule="Uống sáng sau ăn 8:00",
            instruction="Hạn chế vận động mạnh sau uống thuốc, theo dõi nhịp tim.",
            valid_from=date.today(),
            valid_to=date.today() + timedelta(days=30),
            approved_by="PGS.TS.BS. Trần Thị Lan",
            is_active=True
        )
        db.add(med1)
        
        med2 = Medication(
            medication_code="DT-DEMO-002",
            patient_id=patient_map["BN-DEMO-002"],
            name="Amlodipin 5mg",
            dosage="1 viên / ngày",
            schedule="Uống tối 20:00",
            instruction="Tránh dùng chung với nước bưởi.",
            valid_from=date.today(),
            valid_to=date.today() + timedelta(days=30),
            approved_by="PGS.TS.BS. Trần Thị Lan",
            is_active=True
        )
        db.add(med2)
        db.flush()

        # Reminders for Med 1
        db.add(MedicationReminder(
            medication_id=med1.id,
            scheduled_at=datetime.combine(date.today(), datetime.min.time()) + timedelta(hours=8), # Today 08:00 AM
            status="Chưa phản hồi"
        ))
        db.add(MedicationReminder(
            medication_id=med2.id,
            scheduled_at=datetime.combine(date.today(), datetime.min.time()) + timedelta(hours=20), # Today 08:00 PM
            status="Chưa phản hồi"
        ))

        # 7. Insert a demo Human Case for testing staff escalation
        logger.info("Seeding Human Case Escalation...")
        db.add(HumanCase(
            case_code="CASE-DEMO-001",
            patient_id=patient_map["BN-DEMO-001"],
            visit_id=visit1.id,
            case_type="Hỗ trợ y tế",
            trigger="Bệnh nhân hỏi về việc gộp BHYT trái tuyến nhưng hệ thống RAG không có thông tin chi tiết.",
            priority="HIGH",
            sla_due_at=now + timedelta(minutes=30),
            owner=None,
            status="OPEN"
        ))

        db.commit()
        logger.info("🎉 PostgreSQL Database Seeding Completed Successfully!")
        
        # Verify and log summary
        logger.info(f"Summary of Seeded Data:")
        logger.info(f"  - Doctors: {db.query(Doctor).count()} total")
        logger.info(f"  - Patients: {db.query(Patient).count()} total")
        logger.info(f"  - Appointments: {db.query(Appointment).count()} total")
        logger.info(f"  - Active/Completed Visits: {db.query(Visit).count()} total")
        logger.info(f"  - Medications: {db.query(Medication).count()} total")
        logger.info(f"  - Active Human Cases: {db.query(HumanCase).filter(HumanCase.status=='OPEN').count()} open")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Seeding failed: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
