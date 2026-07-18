import asyncio
from datetime import datetime
import logging
from backend.app.database import SessionLocal
from backend.app.models import MedicationReminder, Medication, Appointment, Patient

logger = logging.getLogger(__name__)

async def run_reminder_worker():
    """
    Background worker loop that scans for medication and appointment reminders.
    Runs every 60 seconds in the background.
    """
    logger.info("Starting background reminder worker loop...")
    await asyncio.sleep(5)  # Brief delay to allow backend to finish startup
    
    while True:
        try:
            logger.info("Reminder worker: Scanning for pending notifications...")
            now = datetime.utcnow()
            
            with SessionLocal() as db:
                # 1. Scan for pending medication reminders
                pending_meds = db.query(MedicationReminder).join(Medication).join(Patient).filter(
                    MedicationReminder.status == "Chưa phản hồi",
                    MedicationReminder.scheduled_at <= now
                ).all()
                
                for r in pending_meds:
                    patient = r.medication.patient
                    logger.info(
                        f"📱 [SMS SIMULATION] Gửi nhắc lịch uống thuốc tới {patient.display_name} "
                        f"({patient.phone}): 'Nhắc bạn uống thuốc {r.medication.name} (Liều lượng: {r.medication.dosage}) "
                        f"lúc {r.scheduled_at.strftime('%H:%M')} theo hướng dẫn: {r.medication.instruction}'"
                    )
                    r.status = "Đã gửi"
                    r.responded_at = datetime.utcnow()
                
                # 2. Scan for today's confirmed appointments to simulate check-in reminders
                today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
                today_end = datetime.combine(datetime.utcnow().date(), datetime.max.time())
                
                today_appts = db.query(Appointment).join(Patient).filter(
                    Appointment.scheduled_at >= today_start,
                    Appointment.scheduled_at <= today_end,
                    Appointment.status == "Đã xác nhận"
                ).all()
                
                for appt in today_appts:
                    logger.info(
                        f"📱 [SMS SIMULATION] Gửi nhắc lịch hẹn khám tới {appt.patient.display_name} "
                        f"({appt.patient.phone}): 'Lịch khám của bạn với bác sĩ {appt.doctor} lúc "
                        f"{appt.scheduled_at.strftime('%H:%M')} hôm nay đã được xác nhận. Vui lòng chuẩn bị thẻ BHYT và đến trước 15 phút.'"
                    )
                
                db.commit()
                
        except Exception as e:
            logger.error(f"Error in background reminder worker loop: {e}")
            
        await asyncio.sleep(60)  # Run every 60 seconds
