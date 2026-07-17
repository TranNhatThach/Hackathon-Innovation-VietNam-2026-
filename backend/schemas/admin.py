from pydantic import BaseModel, Field


class AdminMetricsResponse(BaseModel):
    total_chats: int = Field(ge=0)
    escalation_volume: int = Field(ge=0)
    average_confidence_score: float = Field(ge=0, le=1)
