import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Mock database of doctor schedules
DOCTOR_SCHEDULES = {
    "nguyễn văn hùng": {
        "chuyên_khoa": "Nội tim mạch",
        "2026-07-18": ["08:30 - 09:00", "09:30 - 10:00", "10:30 - 11:00"],
        "2026-07-19": ["14:00 - 14:30", "15:00 - 15:30"]
    },
    "trần thị lan": {
        "chuyên_khoa": "Tim mạch Nhi",
        "2026-07-18": ["09:00 - 09:30", "11:00 - 11:30"],
        "2026-07-19": ["08:30 - 09:00", "10:00 - 10:30"]
    }
}

# Mock database of created appointments
APPOINTMENTS = []

def get_doctor_schedule(doctor_name: str, date: str) -> str:
    """
    Tra cứu các khung giờ làm việc còn trống của bác sĩ trong một ngày cụ thể.
    """
    doc_lower = doctor_name.strip().lower()
    if doc_lower not in DOCTOR_SCHEDULES:
        return f"Không tìm thấy bác sĩ '{doctor_name}' trong danh sách của Bệnh viện Tim Hà Nội."
    
    schedule = DOCTOR_SCHEDULES[doc_lower]
    available_slots = schedule.get(date, [])
    
    if not available_slots:
        return f"Bác sĩ {doctor_name} hiện không có lịch khám trống vào ngày {date}."
        
    return json.dumps({
        "doctor_name": doctor_name,
        "chuyên_khoa": schedule["chuyên_khoa"],
        "date": date,
        "available_slots": available_slots
    }, ensure_ascii=False)

def book_appointment(patient_name: str, phone: str, doctor_name: str, date: str, time_slot: str) -> str:
    """
    Thực hiện lưu thông tin đăng ký hẹn khám bệnh của bệnh nhân.
    """
    appointment = {
        "id": len(APPOINTMENTS) + 1,
        "patient_name": patient_name,
        "phone": phone,
        "doctor_name": doctor_name,
        "date": date,
        "time_slot": time_slot,
        "status": "Đã xác nhận tạm thời"
    }
    APPOINTMENTS.append(appointment)
    logger.info(f"Đã đặt lịch hẹn thành công: {appointment}")
    
    return json.dumps({
        "status": "success",
        "message": f"Đặt lịch thành công cho bệnh nhân {patient_name}.",
        "appointment_details": appointment
    }, ensure_ascii=False)
