from datetime import date
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Date, Enum as SQLEnum, Index, String, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REVOKED = "revoked"


class DocumentMetadata(Base):
    __tablename__ = "document_metadata"
    __table_args__ = (
        UniqueConstraint("title", "version", name="uq_document_metadata_title_version"),
        Index(
            "ix_document_metadata_approval_effective_date",
            "approval_status",
            "effective_date",
        ),
        Index("ix_document_metadata_review_date", "review_date"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    owner: Mapped[str] = mapped_column(String(255), nullable=False)
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        SQLEnum(
            ApprovalStatus,
            name="document_approval_status",
            values_callable=lambda statuses: [status.value for status in statuses],
        ),
        nullable=False,
        default=ApprovalStatus.PENDING_REVIEW,
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    review_date: Mapped[date] = mapped_column(Date, nullable=False)
    version: Mapped[str] = mapped_column(String(64), nullable=False)
    version_history: Mapped[list[dict[str, Any]]] = mapped_column(
        MutableList.as_mutable(JSONB),
        nullable=False,
        default=list,
    )
