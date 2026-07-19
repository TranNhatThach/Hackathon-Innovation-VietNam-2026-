import logging
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid
from agent import create_default_agent, check_emergency
from agent.core.adk_agent import is_greeting_query
from backend.app.database import get_db
from backend.app.services import ConversationService
from backend.app.models import Patient, HumanCase
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Pre-instantiate General Agents
patient_agent = create_default_agent("system.md")
employee_agent = create_default_agent("employee.md")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    stream: Optional[bool] = False
    session_id: Optional[str] = None  # Client can provide session_id, or we generate one
    user_id: Optional[str] = None  # Optional user identifier
    agent_type: Optional[str] = "patient"  # "patient" or "employee"

@router.post("")
def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(get_db),
    x_forwarded_for: Optional[str] = Header(None)
):
    """
    Chat endpoint with conversation history persistence.
    
    - If session_id is provided, messages are saved to existing conversation
    - If not provided, a new session is created automatically
    - All messages are persisted in PostgreSQL
    - Previous history can be retrieved from DB (optional)
    """
    # 1. Select the correct agent instance based on request
    agent = employee_agent if request.agent_type == "employee" else patient_agent

    # 2. Generate or use provided session_id
    session_id = request.session_id or str(uuid.uuid4())
    user_id = request.user_id or x_forwarded_for or "anonymous"
    
    # 2. Get or create conversation (wrapped – DB failure must NOT cause a 500)
    try:
        conversation = ConversationService.get_conversation_by_session(db, session_id)
        if not conversation:
            conversation = ConversationService.create_conversation(
                db, user_id, session_id
            )
    except Exception as db_err:
        logger.error(f"DB error creating/fetching conversation: {db_err}")
        conversation = None  # Continue without DB persistence

    # 3. Load history from DB if not provided by client
    formatted_history = []
    if request.history:
        formatted_history = [{"role": msg.role, "content": msg.content} for msg in request.history]
    elif conversation:
        # Load from database if available
        db_history = ConversationService.get_conversation_history(db, session_id, limit=20)
        if db_history:
            formatted_history = db_history

    # 4. Save user message to DB (best-effort, never raises)
    try:
        ConversationService.add_message(db, session_id, "user", request.message)
    except Exception:
        pass

    # 4b. Check if patient has an active HumanCase (AI Agent Muted/Escalated)
    try:
        patient = None
        if request.user_id:
            user_clean = request.user_id.strip()
            patient = db.query(Patient).filter(
                (Patient.phone == user_clean) | (Patient.patient_code == user_clean)
            ).first()
        
        if patient:
            active_case = db.query(HumanCase).filter(
                HumanCase.patient_id == patient.id,
                HumanCase.status.in_(["OPEN", "IN_PROGRESS"])
            ).first()
            
            if active_case:
                escalated_response = (
                    "Yêu cầu của bạn hiện đã được chuyển giao cho nhân viên hỗ trợ y tế. "
                    "Nhân viên sẽ phản hồi bạn trực tiếp trong cuộc hội thoại này hoặc liên hệ qua số điện thoại. Vui lòng đợi trong giây lát."
                )
                try:
                    ConversationService.add_message(db, session_id, "assistant", escalated_response)
                except Exception:
                    pass
                if request.stream:
                    def escalated_generator():
                        yield escalated_response
                    return StreamingResponse(escalated_generator(), media_type="text/plain")
                return {
                    "response": escalated_response,
                    "session_id": session_id,
                    "from_db": False
                }
    except Exception as e:
        logger.error(f"Error in HumanCase check: {e}")

    # 4c. Routing-level Smart Cache Check
    # Only cache if history is empty (first turn).
    is_eligible = (
        not formatted_history and
        not is_greeting_query(request.message) and
        not any(kw in request.message.lower() for kw in [
            "đặt lịch", "dat lich", "hẹn khám", "hen kham",
            "lịch bác sĩ", "lich bac si", "lịch khám", "lich kham",
            "bác sĩ nào", "bac si nao", "tìm bác sĩ", "tim bac si",
            "danh sách bác sĩ", "ds bac si", "chuyên khoa", "chuyen khoa",
            "khung giờ trống", "khung gio trong", "còn trống", "con trong",
        ])
    )
    if is_eligible:
        try:
            from agent.core.redis_client import redis_cache
            cache_key = redis_cache.get_cache_key(request.message)
            cached_val = redis_cache.get(cache_key)
            if cached_val:
                logger.info(f"Routing Level Cache HIT for message: {request.message.encode('ascii', errors='ignore').decode('ascii')}")
                try:
                    ConversationService.add_message(db, session_id, "assistant", cached_val)
                except Exception:
                    pass
                if request.stream:
                    def cached_generator():
                        yield cached_val
                    return StreamingResponse(cached_generator(), media_type="text/plain")
                return {
                    "response": cached_val,
                    "session_id": session_id,
                    "from_db": False
                }
        except Exception as e:
            logger.warning(f"Error checking cache at routing level: {e}")

    # 5. Check emergency guardrail
    emergency_warning = check_emergency(request.message)
    if emergency_warning:
        try:
            ConversationService.add_message(db, session_id, "assistant", emergency_warning)
        except Exception:
            pass
        if request.stream:
            def event_generator():
                yield emergency_warning
            return StreamingResponse(event_generator(), media_type="text/plain")
        return {
            "response": emergency_warning,
            "session_id": session_id,
            "from_db": False
        }

    # 6. Execute agent
    if request.stream:
        def event_generator():
            try:
                full_response = ""
                for chunk in agent.execute_stream(request.message, formatted_history):
                    full_response += chunk
                    yield chunk
                # Save full response to DB after streaming completes (best-effort)
                try:
                    ConversationService.add_message(db, session_id, "assistant", full_response)
                except Exception:
                    pass
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                error_msg = "Xin lỗi, đã xảy ra lỗi kết nối. Vui lòng thử lại hoặc gọi Hotline Bệnh viện: 19001082."
                yield error_msg
                try:
                    ConversationService.add_message(db, session_id, "assistant", error_msg)
                except Exception:
                    pass

        return StreamingResponse(event_generator(), media_type="text/plain")

    # Non-streaming path
    try:
        response_text = agent.execute(request.message, formatted_history)
        try:
            ConversationService.add_message(db, session_id, "assistant", response_text)
        except Exception:
            pass
        return {
            "response": response_text,
            "session_id": session_id,
            "from_db": False
        }
    except Exception as e:
        logger.error(f"Agent execution error: {e}")
        fallback = "Xin lỗi, đã xảy ra lỗi kết nối với mô hình AI. Vui lòng thử lại sau hoặc gọi Hotline Bệnh viện: 19001082."
        try:
            ConversationService.add_message(db, session_id, "assistant", fallback)
        except Exception:
            pass
        return {
            "response": fallback,
            "session_id": session_id,
            "from_db": False
        }


@router.get("/history/{session_id}")
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieve conversation history by session_id.
    """
    history = ConversationService.get_conversation_history(db, session_id)
    if not history:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"session_id": session_id, "messages": history}


@router.get("/conversations/{user_id}")
def list_user_conversations(user_id: str, db: Session = Depends(get_db)):
    """
    List all conversations for a user.
    """
    conversations = ConversationService.get_user_conversations(db, user_id, limit=20)
    return {"user_id": user_id, "conversations": conversations}


@router.delete("/history/{session_id}")
def delete_chat_history(session_id: str, db: Session = Depends(get_db)):
    """
    Delete a conversation and all its messages.
    """
    success = ConversationService.delete_conversation(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True, "message": "Conversation deleted"}

