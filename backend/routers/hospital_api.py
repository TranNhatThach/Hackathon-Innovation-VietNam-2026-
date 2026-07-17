from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.models import Doctor, ServicePricing
from backend.schemas.hospital import DoctorRead, ServicePricingRead


router = APIRouter(prefix="/api/v1/hospital", tags=["Hospital"])

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/doctors", response_model=list[DoctorRead])
async def list_doctors(db: DatabaseSession) -> list[Doctor]:
    result = await db.execute(
        select(Doctor).order_by(Doctor.department.asc(), Doctor.name.asc())
    )
    return list(result.scalars().all())


@router.get("/services", response_model=list[ServicePricingRead])
async def list_service_pricing(db: DatabaseSession) -> list[ServicePricing]:
    result = await db.execute(
        select(ServicePricing).order_by(ServicePricing.service_name.asc())
    )
    return list(result.scalars().all())
