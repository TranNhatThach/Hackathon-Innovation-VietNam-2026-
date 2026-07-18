"""
SQLAlchemy ORM Models for Database Schema
"""
from datetime import datetime
from sqlalchemy import Boolean, Column, Date, Integer, String, Text, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.security import encrypt_value, decrypt_value

class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt_value(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return decrypt_value(value)
        return value

class EncryptedText(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt_value(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return decrypt_value(value)
        return value


class Conversation(Base):
    """
    Represents a conversation session between a user and the agent.
    """
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)  # Can be session ID or user identifier
    session_id = Column(String(255), nullable=False, index=True)  # Unique per conversation session
    title = Column(String(500), nullable=True)  # Optional title for conversation
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to messages
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_session', 'user_id', 'session_id'),
    )


class Message(Base):
    """
    Represents a single message in a conversation.
    Stores both user inputs and assistant responses.
    """
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Metadata for debugging/monitoring
    tools_used = Column(String(500), nullable=True)  # Comma-separated tool names
    model = Column(String(100), nullable=True)  # Which LLM model was used
    
    # Relationship back to conversation
    conversation = relationship("Conversation", back_populates="messages")
    
    __table_args__ = (
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
    )


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True)
    patient_code = Column(String(50), nullable=False, unique=True, index=True)
    display_name = Column(EncryptedString(255), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    phone = Column(EncryptedString(30), nullable=True)
    address = Column(EncryptedString(500), nullable=True)
    preferred_channel = Column(String(50), nullable=False, default="web")
    is_demo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    human_cases = relationship("HumanCase", back_populates="patient")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True)
    appointment_code = Column(String(50), nullable=False, unique=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    facility = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    doctor = Column(String(255), nullable=True)
    visit_type = Column(String(100), nullable=False)
    payment_type = Column(String(30), nullable=False)
    status = Column(String(50), nullable=False, index=True)
    required_documents = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    visits = relationship("Visit", back_populates="appointment")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True)
    doctor_code = Column(String(50), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False, index=True)
    department = Column(String(255), nullable=False, index=True)
    facility = Column(String(255), nullable=False, default="Bệnh viện Tim Hà Nội - Cơ sở 1")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True)
    visit_code = Column(String(50), nullable=False, unique=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    queue_number = Column(String(20), nullable=False, index=True)
    stage = Column(String(50), nullable=False, index=True)
    stage_label = Column(String(100), nullable=False)
    entered_stage_at = Column(DateTime, nullable=False)
    room = Column(String(100), nullable=True)
    doctor = Column(String(255), nullable=True)
    payment_type = Column(String(30), nullable=False)
    payment_status = Column(String(50), nullable=False)
    priority = Column(String(30), nullable=False, default="Bình thường")
    alerts = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="ACTIVE", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="visits")
    appointment = relationship("Appointment", back_populates="visits")
    events = relationship("VisitJourneyEvent", back_populates="visit", cascade="all, delete-orphan")
    human_cases = relationship("HumanCase", back_populates="visit")


class VisitJourneyEvent(Base):
    __tablename__ = "visit_journey_events"

    id = Column(Integer, primary_key=True)
    visit_id = Column(Integer, ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    stage_label = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False)
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    location = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)

    visit = relationship("Visit", back_populates="events")
    __table_args__ = (Index("idx_visit_stage_time", "visit_id", "stage", "occurred_at"),)


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True)
    medication_code = Column(String(50), nullable=False, unique=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    schedule = Column(String(255), nullable=False)
    instruction = Column(EncryptedText, nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    approved_by = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="medications")
    reminders = relationship("MedicationReminder", back_populates="medication", cascade="all, delete-orphan")


class MedicationReminder(Base):
    __tablename__ = "medication_reminders"

    id = Column(Integer, primary_key=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="Chưa phản hồi")
    response = Column(String(100), nullable=True)
    responded_at = Column(DateTime, nullable=True)

    medication = relationship("Medication", back_populates="reminders")
    __table_args__ = (UniqueConstraint("medication_id", "scheduled_at", name="uq_medication_reminder_time"),)


class HumanCase(Base):
    __tablename__ = "human_cases"

    id = Column(Integer, primary_key=True)
    case_code = Column(String(50), nullable=False, unique=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True)
    case_type = Column(String(255), nullable=False)
    trigger = Column(Text, nullable=False)
    priority = Column(String(10), nullable=False, index=True)
    sla_due_at = Column(DateTime, nullable=False, index=True)
    owner = Column(String(255), nullable=True, index=True)
    status = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="human_cases")
    visit = relationship("Visit", back_populates="human_cases")


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    title = Column(String(500), nullable=False)
    issue = Column(String(100), nullable=False)
    effective_date = Column(Date, nullable=False)
    source_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    steps = relationship("ProcedureStep", back_populates="procedure", cascade="all, delete-orphan", order_by="ProcedureStep.step_order")


class ProcedureStep(Base):
    __tablename__ = "procedure_steps"

    id = Column(Integer, primary_key=True)
    procedure_id = Column(Integer, ForeignKey("procedures.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False)
    slug = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    patient_instruction = Column(Text, nullable=False)
    responsible_role = Column(String(255), nullable=False)
    staff_actions = Column(Text, nullable=False)
    note = Column(Text, nullable=True)
    source_pages = Column(String(100), nullable=True)

    procedure = relationship("Procedure", back_populates="steps")
    __table_args__ = (
        UniqueConstraint("procedure_id", "step_order", name="uq_procedure_step_order"),
        UniqueConstraint("procedure_id", "slug", name="uq_procedure_step_slug"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    actor_id = Column(String(255), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=False, index=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
