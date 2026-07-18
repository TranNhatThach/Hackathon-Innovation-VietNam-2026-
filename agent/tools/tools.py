import json
import logging
from datetime import date, timedelta
from typing import Dict, Any, List, Optional


logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# MOCK DOCTOR DATABASE
# Covers 10 doctors with realistic Vietnamese names, specialties, and 14-day
# schedule windows starting from 2026-07-18.
# ──────────────────────────────────────────────────────────────────────────────

def _generate_slots(weekday_slots: List[str], weekend_slots: List[str], days: int = 14) -> Dict[str, List[str]]:
    """Generate a dict of date -> available slots for the next `days` days."""
    schedule: Dict[str, List[str]] = {}
    start = date(2026, 7, 18)
    for i in range(days):
        d = start + timedelta(days=i)
        iso = d.isoformat()
        wd = d.weekday()  # 0=Mon, 5=Sat, 6=Sun
        if wd == 6:  # Sunday – no clinic
            continue
        elif wd == 5:  # Saturday
            schedule[iso] = weekend_slots[:]
        else:
            schedule[iso] = weekday_slots[:]
    return schedule


DOCTOR_DATABASE: Dict[str, Dict[str, Any]] = {
    "nguyễn văn hùng": {
        "full_name": "GS.TS.BS. Nguyễn Văn Hùng",
        "chuyên_khoa": "Tim mạch Can thiệp",
        "phòng": "Phòng 201, Tầng 2",
        "schedule": _generate_slots(
            weekday_slots=["08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00"],
            weekend_slots=[],  # GS Hùng không làm thứ Bảy
            days=14
        )
    },
    "trần thị lan": {
        "full_name": "PGS.TS.BS. Trần Thị Lan",
        "chuyên_khoa": "Tim mạch Nhi",
        "phòng": "Phòng 220, Tầng 2",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00"],
            weekend_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00"],
            days=14
        )
    },
    "lê minh tuấn": {
        "full_name": "TS.BS. Lê Minh Tuấn",
        "chuyên_khoa": "Rối loạn nhịp tim",
        "phòng": "Phòng 203, Tầng 2",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00"],
            weekend_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00"],
            days=14
        )
    },
    "phạm thị hoa": {
        "full_name": "BS.CKII. Phạm Thị Hoa",
        "chuyên_khoa": "Suy tim và Bệnh cơ tim",
        "phòng": "Phòng 205, Tầng 2",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "13:30 - 14:00", "14:00 - 14:30", "14:30 - 15:00", "15:00 - 15:30"],
            weekend_slots=[],
            days=14
        )
    },
    "hoàng văn nam": {
        "full_name": "BS.CKI. Hoàng Văn Nam",
        "chuyên_khoa": "Tim mạch Nội khoa tổng quát",
        "phòng": "Phòng 207, Tầng 2",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00", "13:30 - 14:00", "14:00 - 14:30", "14:30 - 15:00", "15:00 - 15:30", "15:30 - 16:00"],
            weekend_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30"],
            days=14
        )
    },
    "nguyễn thị bích ngọc": {
        "full_name": "BS.CKI. Nguyễn Thị Bích Ngọc",
        "chuyên_khoa": "Bệnh van tim",
        "phòng": "Phòng 208, Tầng 2",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "13:30 - 14:00", "14:00 - 14:30", "14:30 - 15:00"],
            weekend_slots=[],
            days=14
        )
    },
    "đặng quốc tuấn": {
        "full_name": "PGS.TS.BS. Đặng Quốc Tuấn",
        "chuyên_khoa": "Tim mạch Can thiệp (Chụp và can thiệp mạch vành)",
        "phòng": "Phòng 301, Tầng 3",
        "schedule": _generate_slots(
            weekday_slots=["08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00"],
            weekend_slots=[],
            days=14
        )
    },
    "nguyễn thị mai": {
        "full_name": "TS.BS. Nguyễn Thị Mai",
        "chuyên_khoa": "Tim mạch Can thiệp (Thông tim và động mạch ngoại biên)",
        "phòng": "Phòng 303, Tầng 3",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00"],
            weekend_slots=[],
            days=14
        )
    },
    "trần công bình": {
        "full_name": "BS.CKII. Trần Công Bình",
        "chuyên_khoa": "Tim mạch Can thiệp",
        "phòng": "Phòng 305, Tầng 3",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30"],
            weekend_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00"],
            days=14
        )
    },
    "vũ ngọc tú": {
        "full_name": "GS.TS.BS. Vũ Ngọc Tú",
        "chuyên_khoa": "Phẫu thuật Tim mạch",
        "phòng": "Phòng 401, Tầng 4",
        "schedule": _generate_slots(
            weekday_slots=["08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00"],
            weekend_slots=[],
            days=14
        )
    },
    "lê thị thu": {
        "full_name": "BS.CKII. Lê Thị Thu",
        "chuyên_khoa": "Tim mạch Nhi (Tim bẩm sinh)",
        "phòng": "Phòng 222, Tầng 2",
        "schedule": _generate_slots(
            weekday_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30"],
            weekend_slots=["07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00"],
            days=14
        )
    },
}

# In-memory list of created appointments (in production this would be a DB table)
APPOINTMENTS: List[Dict[str, Any]] = []


def _find_doctor_key(doctor_name: str) -> Optional[str]:
    """
    Fuzzy-match a doctor name input against the database keys.
    Returns the matching key or None.
    """
    name_lower = doctor_name.strip().lower()

    # 1. Exact match
    if name_lower in DOCTOR_DATABASE:
        return name_lower

    # 2. Substring match (handles "BS Hùng", "bác sĩ Hùng", "nguyễn hùng", etc.)
    for key in DOCTOR_DATABASE:
        key_parts = key.split()
        name_parts = name_lower.split()
        # Check if all parts of input are found in the key
        if all(part in key for part in name_parts):
            return key
        # Check the reverse (key part in input)
        if any(part in name_lower for part in key_parts if len(part) > 2):
            return key

    return None


# ──────────────────────────────────────────────────────────────────────────────
# TOOL FUNCTIONS
# ──────────────────────────────────────────────────────────────────────────────

def get_doctor_schedule(doctor_name: str, date: str) -> str:
    """
    Tra cứu các khung giờ làm việc còn trống của bác sĩ trong một ngày cụ thể.

    Args:
        doctor_name: Tên bác sĩ (hỗ trợ tên đầy đủ hoặc họ tên ngắn)
        date: Ngày cần tra cứu định dạng YYYY-MM-DD

    Returns:
        JSON string with available slots or an error message.
    """
    doctor_key = _find_doctor_key(doctor_name)
    if doctor_key is None:
        available_names = ", ".join(d["full_name"] for d in DOCTOR_DATABASE.values())
        return (
            f"Không tìm thấy bác sĩ '{doctor_name}' trong hệ thống. "
            f"Danh sách bác sĩ hiện có: {available_names}. "
            "Vui lòng kiểm tra lại tên hoặc gọi 024 3942 2430 để được hỗ trợ."
        )

    doctor = DOCTOR_DATABASE[doctor_key]
    schedule = doctor.get("schedule", {})
    available_slots = schedule.get(date, [])

    # Remove already-booked slots
    booked_slots = {
        appt["time_slot"]
        for appt in APPOINTMENTS
        if appt["doctor_name"].lower() == doctor_key and appt["date"] == date
    }
    free_slots = [s for s in available_slots if s not in booked_slots]

    if not free_slots:
        # Suggest nearby available dates
        suggestions = []
        for d_key in sorted(schedule.keys()):
            if d_key > date and len(schedule[d_key]) > 0:
                suggestions.append(d_key)
            if len(suggestions) >= 3:
                break

        msg = f"Bác sĩ {doctor['full_name']} hiện không có lịch khám trống vào ngày {date}."
        if suggestions:
            msg += f" Các ngày gần nhất còn lịch: {', '.join(suggestions)}."
        return msg

    return json.dumps({
        "doctor_name": doctor["full_name"],
        "chuyên_khoa": doctor["chuyên_khoa"],
        "phòng": doctor["phòng"],
        "date": date,
        "available_slots": free_slots
    }, ensure_ascii=False)


def book_appointment(patient_name: str, phone: str, doctor_name: str, date: str, time_slot: str) -> str:
    """
    Thực hiện lưu thông tin đăng ký hẹn khám bệnh của bệnh nhân.

    Args:
        patient_name: Họ và tên đầy đủ của bệnh nhân
        phone: Số điện thoại liên hệ
        doctor_name: Tên bác sĩ
        date: Ngày khám (YYYY-MM-DD)
        time_slot: Khung giờ (ví dụ: "08:30 - 09:00")

    Returns:
        JSON string with appointment confirmation or error message.
    """
    doctor_key = _find_doctor_key(doctor_name)
    if doctor_key is None:
        return f"Không tìm thấy bác sĩ '{doctor_name}'. Vui lòng kiểm tra lại tên bác sĩ hoặc gọi 024 3942 2430."

    doctor = DOCTOR_DATABASE[doctor_key]

    # Validate slot availability
    schedule = doctor.get("schedule", {})
    if date not in schedule:
        return f"Bác sĩ {doctor['full_name']} không làm việc vào ngày {date} (có thể là ngày nghỉ hoặc ngoài lịch)."

    available_slots = schedule.get(date, [])
    if time_slot not in available_slots:
        return (
            f"Khung giờ '{time_slot}' không có trong lịch của bác sĩ {doctor['full_name']} vào ngày {date}. "
            f"Các khung giờ còn lại: {', '.join(available_slots)}."
        )

    # Check if slot is already booked
    already_booked = any(
        appt["doctor_name"] == doctor_key and appt["date"] == date and appt["time_slot"] == time_slot
        for appt in APPOINTMENTS
    )
    if already_booked:
        return f"Khung giờ '{time_slot}' ngày {date} với bác sĩ {doctor['full_name']} đã có người đặt. Vui lòng chọn khung giờ khác."

    # Validate phone number (basic check)
    phone_clean = phone.strip().replace(" ", "").replace("-", "").replace(".", "")
    if len(phone_clean) < 10 or not phone_clean.isdigit():
        return f"Số điện thoại '{phone}' không hợp lệ. Vui lòng nhập số điện thoại gồm 10-11 chữ số."

    # Confirm booking
    appointment_id = f"HEN-{date.replace('-', '')}-{len(APPOINTMENTS) + 1:03d}"
    appointment = {
        "id": appointment_id,
        "patient_name": patient_name,
        "phone": phone_clean,
        "doctor_name": doctor_key,
        "doctor_full_name": doctor["full_name"],
        "chuyên_khoa": doctor["chuyên_khoa"],
        "phòng": doctor["phòng"],
        "date": date,
        "time_slot": time_slot,
        "status": "Đã xác nhận tạm thời"
    }
    APPOINTMENTS.append(appointment)
    logger.info(f"New appointment booked: {appointment}")

    return json.dumps({
        "status": "success",
        "message": (
            f"✅ Đặt lịch thành công!\n"
            f"Bệnh nhân: {patient_name}\n"
            f"Bác sĩ: {doctor['full_name']}\n"
            f"Chuyên khoa: {doctor['chuyên_khoa']}\n"
            f"Phòng: {doctor['phòng']}\n"
            f"Ngày: {date} – Giờ: {time_slot}\n"
            f"Mã lịch hẹn: {appointment_id}\n"
            f"📋 Vui lòng đến trước 15 phút và mang theo CCCD, thẻ BHYT (nếu có).\n"
            f"📞 Liên hệ hủy/đổi lịch: 024 3942 2430"
        ),
        "appointment": appointment
    }, ensure_ascii=False)


def search_doctors(specialty: str = "", name: str = "") -> str:
    """
    Tìm kiếm bác sĩ theo chuyên khoa hoặc tên.

    Args:
        specialty: Từ khóa chuyên khoa (ví dụ: "rối loạn nhịp", "nhi", "can thiệp")
        name: Tên bác sĩ cần tìm (ví dụ: "Lan", "Hùng")

    Returns:
        JSON string with list of matching doctors.
    """
    results = []
    spec_lower = specialty.strip().lower()
    name_lower = name.strip().lower()

    for key, doctor in DOCTOR_DATABASE.items():
        match = False
        if spec_lower and spec_lower in doctor["chuyên_khoa"].lower():
            match = True
        if name_lower and name_lower in key:
            match = True
        if not spec_lower and not name_lower:
            match = True  # Return all doctors if no filter

        if match:
            results.append({
                "full_name": doctor["full_name"],
                "chuyên_khoa": doctor["chuyên_khoa"],
                "phòng": doctor["phòng"],
            })

    if not results:
        return (
            f"Không tìm thấy bác sĩ phù hợp với tìm kiếm của bạn. "
            "Vui lòng thử từ khóa khác hoặc gọi 024 3942 2430 để được tư vấn."
        )

    return json.dumps({
        "total": len(results),
        "doctors": results,
        "note": "Để đặt lịch hẹn, vui lòng cung cấp tên bác sĩ, ngày và giờ mong muốn."
    }, ensure_ascii=False)
