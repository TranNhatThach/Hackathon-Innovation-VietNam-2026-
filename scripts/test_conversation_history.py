#!/usr/bin/env python
"""
Test script for Conversation History feature.
Tests saving and retrieving messages from the database.
"""
import logging
import sys
from pathlib import Path
import uuid

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.database import SessionLocal
from backend.app.models import Conversation, Message
from backend.app.services import ConversationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_conversation_history():
    """Test conversation history functionality"""
    db = SessionLocal()
    
    try:
        # 1. Create a new conversation
        logger.info("1. Testing create_conversation...")
        session_id = f"test_session_{uuid.uuid4().hex[:8]}"
        user_id = "test_user_123"
        
        conversation = ConversationService.create_conversation(
            db, user_id, session_id, "Test Conversation"
        )
        logger.info(f"   ✓ Created conversation {conversation.id}")
        
        # 2. Add messages to conversation
        logger.info("2. Testing add_message...")
        
        user_msg = ConversationService.add_message(
            db, session_id, "user", "Tôi muốn đặt lịch khám bệnh"
        )
        logger.info(f"   ✓ Added user message {user_msg.id}")
        
        assistant_msg = ConversationService.add_message(
            db, session_id, "assistant", "Xin chào! Tôi có thể giúp bạn đặt lịch khám. Vui lòng cho biết bác sĩ mà bạn muốn khám?"
        )
        logger.info(f"   ✓ Added assistant message {assistant_msg.id}")
        
        user_msg2 = ConversationService.add_message(
            db, session_id, "user", "Tôi muốn khám với bác sĩ Nguyễn Văn Hùng"
        )
        logger.info(f"   ✓ Added user message {user_msg2.id}")
        
        # 3. Retrieve conversation history
        logger.info("3. Testing get_conversation_history...")
        history = ConversationService.get_conversation_history(db, session_id)
        logger.info(f"   ✓ Retrieved {len(history)} messages from history")
        
        for idx, msg in enumerate(history, 1):
            logger.info(f"     {idx}. [{msg['role'].upper()}] {msg['content'][:50]}...")
        
        # 4. Get conversation by session
        logger.info("4. Testing get_conversation_by_session...")
        conv = ConversationService.get_conversation_by_session(db, session_id)
        logger.info(f"   ✓ Retrieved conversation: {conv.title} (ID: {conv.id})")
        
        # 5. List user conversations
        logger.info("5. Testing get_user_conversations...")
        user_conversations = ConversationService.get_user_conversations(db, user_id)
        logger.info(f"   ✓ Found {len(user_conversations)} conversation(s) for user")
        
        for conv in user_conversations:
            logger.info(f"     - {conv['title']} ({conv['message_count']} messages)")
        
        # 6. Test creating another conversation for same user
        logger.info("6. Testing multiple conversations for same user...")
        session_id2 = f"test_session_{uuid.uuid4().hex[:8]}"
        conversation2 = ConversationService.create_conversation(
            db, user_id, session_id2, "Second Conversation"
        )
        ConversationService.add_message(db, session_id2, "user", "Xin chào")
        ConversationService.add_message(db, session_id2, "assistant", "Xin chào bạn!")
        
        user_conversations = ConversationService.get_user_conversations(db, user_id)
        logger.info(f"   ✓ Now found {len(user_conversations)} conversation(s)")
        
        # 7. Test deletion
        logger.info("7. Testing delete_conversation...")
        success = ConversationService.delete_conversation(db, session_id2)
        logger.info(f"   ✓ Deleted conversation {session_id2}")
        
        user_conversations = ConversationService.get_user_conversations(db, user_id)
        logger.info(f"   ✓ Now found {len(user_conversations)} conversation(s)")
        
        logger.info("\n✓ ALL TESTS PASSED!\n")
        return True
        
    except Exception as e:
        logger.error(f"\n✗ TEST FAILED: {e}\n", exc_info=True)
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_conversation_history()
    sys.exit(0 if success else 1)
