from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DoctorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    department: str
    schedule: dict[str, Any]


class ServicePricingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    service_name: str
    price: Decimal = Field(ge=0)
