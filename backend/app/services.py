"""
Service layer for Conversation History management.
Handles saving, retrieving, and querying conversation history.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models import Conversation, Message

logger = logging.getLogger(__name__)


class ConversationService:
    """
    Service for managing conversation history in PostgreSQL.
    """
    
    @staticmethod
    def create_conversation(db: Session, user_id: str, session_id: str, title: str = None) -> Conversation:
        """
        Create a new conversation session.
        
        Args:
            db: Database session
            user_id: User identifier (can be IP, session token, etc.)
            session_id: Unique session identifier
            title: Optional title for the conversation
            
        Returns:
            Conversation object
        """
        try:
            conversation = Conversation(
                user_id=user_id,
                session_id=session_id,
                title=title or f"Chat Session {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            logger.info(f"Created conversation {conversation.id} for user {user_id}")
            return conversation
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating conversation: {e}")
            raise

    @staticmethod
    def get_conversation_by_session(db: Session, session_id: str) -> Optional[Conversation]:
        """
        Retrieve a conversation by session ID.
        
        Args:
            db: Database session
            session_id: Session identifier
            
        Returns:
            Conversation object or None
        """
        try:
            conversation = db.query(Conversation).filter(
                Conversation.session_id == session_id
            ).first()
            return conversation
        except Exception as e:
            logger.error(f"Error retrieving conversation: {e}")
            return None

    @staticmethod
    def get_conversation_history(db: Session, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all messages in a conversation, formatted as chat history.
        
        Args:
            db: Database session
            session_id: Session identifier
            limit: Maximum number of messages to retrieve
            
        Returns:
            List of message dicts with role and content
        """
        try:
            conversation = ConversationService.get_conversation_by_session(db, session_id)
            if not conversation:
                return []
            
            messages = db.query(Message).filter(
                Message.conversation_id == conversation.id
            ).order_by(Message.created_at).limit(limit).all()
            
            return [
                {
                    "role": msg.role,
                    "content": msg.content
                }
                for msg in messages
            ]
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}")
            return []

    @staticmethod
    def add_message(
        db: Session,
        session_id: str,
        role: str,
        content: str,
        tools_used: str = None,
        model: str = None
    ) -> Optional[Message]:
        """
        Add a message to a conversation.
        
        Args:
            db: Database session
            session_id: Session identifier
            role: "user" or "assistant"
            content: Message content
            tools_used: Comma-separated tool names used (optional)
            model: Model name used (optional)
            
        Returns:
            Message object or None if conversation doesn't exist
        """
        try:
            conversation = ConversationService.get_conversation_by_session(db, session_id)
            if not conversation:
                logger.warning(f"Conversation not found for session {session_id}")
                return None
            
            message = Message(
                conversation_id=conversation.id,
                role=role,
                content=content,
                tools_used=tools_used,
                model=model
            )
            db.add(message)
            db.commit()
            db.refresh(message)
            logger.debug(f"Added message to conversation {conversation.id}")
            return message
        except Exception as e:
            db.rollback()
            logger.error(f"Error adding message: {e}")
            return None

    @staticmethod
    def get_user_conversations(db: Session, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get all conversations for a user, sorted by most recent.
        
        Args:
            db: Database session
            user_id: User identifier
            limit: Maximum number of conversations
            
        Returns:
            List of conversation dicts
        """
        try:
            conversations = db.query(Conversation).filter(
                Conversation.user_id == user_id
            ).order_by(Conversation.updated_at.desc()).limit(limit).all()
            
            return [
                {
                    "id": c.id,
                    "session_id": c.session_id,
                    "title": c.title,
                    "created_at": c.created_at.isoformat(),
                    "updated_at": c.updated_at.isoformat(),
                    "message_count": len(c.messages)
                }
                for c in conversations
            ]
        except Exception as e:
            logger.error(f"Error retrieving user conversations: {e}")
            return []

    @staticmethod
    def delete_conversation(db: Session, session_id: str) -> bool:
        """
        Delete a conversation and all its messages.
        
        Args:
            db: Database session
            session_id: Session identifier
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            conversation = ConversationService.get_conversation_by_session(db, session_id)
            if not conversation:
                return False
            
            db.delete(conversation)
            db.commit()
            logger.info(f"Deleted conversation {conversation.id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting conversation: {e}")
            return False
