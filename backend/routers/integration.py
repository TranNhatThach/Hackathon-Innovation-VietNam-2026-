import os
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.models import Doctor, ServicePricing


router = APIRouter(prefix="/api/v1", tags=["Hospital Integration"])

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


class DoctorScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    department: str
    schedule: dict[str, object]


class ServicePricingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    service_name: str
    price: Decimal


class AppointmentRedirectRequest(BaseModel):
    channel: Literal["website", "zalo_mini_app", "hotline"] = Field(
        description="Preferred appointment booking channel.",
    )
    session_id: str | None = Field(default=None, max_length=128)


class AppointmentRedirectResponse(BaseModel):
    channel: str
    redirect_url: str
    instructions: list[str]


@router.get("/schedules", response_model=list[DoctorScheduleResponse])
async def get_appointment_schedules(db: DatabaseSession) -> list[DoctorScheduleResponse]:
    result = await db.execute(select(Doctor).order_by(Doctor.department, Doctor.name))
    return [
        DoctorScheduleResponse.model_validate(doctor)
        for doctor in result.scalars().all()
    ]


@router.get("/services/pricing", response_model=list[ServicePricingResponse])
async def get_service_pricing(db: DatabaseSession) -> list[ServicePricingResponse]:
    result = await db.execute(select(ServicePricing).order_by(ServicePricing.service_name))
    return [
        ServicePricingResponse.model_validate(service)
        for service in result.scalars().all()
    ]


@router.post("/appointments/redirect", response_model=AppointmentRedirectResponse)
async def create_appointment_redirect(
    request: AppointmentRedirectRequest,
) -> AppointmentRedirectResponse:
    redirect_urls = {
        "website": os.getenv(
            "HOSPITAL_BOOKING_WEBSITE_URL",
            "https://booking.hanoi-heart-hospital.example/appointments",
        ),
        "zalo_mini_app": os.getenv(
            "HOSPITAL_ZALO_MINI_APP_URL",
            "https://zalo.me/s/hanoi-heart-hospital-booking",
        ),
        "hotline": os.getenv("HOSPITAL_CUSTOMER_SERVICE_HOTLINE", "tel:19000000"),
    }

    instructions = {
        "website": [
            "Mở đường dẫn đặt lịch.",
            "Chọn chuyên khoa, ngày khám và khung giờ phù hợp.",
            "Điền thông tin người bệnh và xác nhận lịch hẹn.",
        ],
        "zalo_mini_app": [
            "Mở Zalo Mini App đặt lịch.",
            "Chọn dịch vụ khám và khung giờ.",
            "Xác nhận thông tin liên hệ để bệnh viện hỗ trợ.",
        ],
        "hotline": [
            "Bấm gọi tổng đài Chăm sóc khách hàng.",
            "Cung cấp họ tên, năm sinh, số điện thoại và nhu cầu khám.",
            "Nhân viên bệnh viện sẽ hướng dẫn bước tiếp theo.",
        ],
    }

    return AppointmentRedirectResponse(
        channel=request.channel,
        redirect_url=redirect_urls[request.channel],
        instructions=instructions[request.channel],
    )
