"""
SQLAlchemy ORM Models for Database Schema
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base


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
