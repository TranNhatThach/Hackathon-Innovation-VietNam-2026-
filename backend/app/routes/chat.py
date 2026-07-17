from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from agent import create_default_agent, check_emergency

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Pre-instantiate General Agent
agent = create_default_agent()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    stream: Optional[bool] = False

@router.post("")
def chat_endpoint(request: ChatRequest):
    """
    Standard chat endpoint supporting direct text or streaming responses.
    """
    # 1. Check emergency guardrail
    emergency_warning = check_emergency(request.message)
    if emergency_warning:
        if request.stream:
            def event_generator():
                yield emergency_warning
            return StreamingResponse(event_generator(), media_type="text/plain")
        return {"response": emergency_warning}

    formatted_history = []
    if request.history:
        formatted_history = [{"role": msg.role, "content": msg.content} for msg in request.history]

    if request.stream:
        def event_generator():
            try:
                for chunk in agent.execute_stream(request.message, formatted_history):
                    yield chunk
            except Exception as e:
                yield f"Error: {str(e)}"
        return StreamingResponse(event_generator(), media_type="text/plain")

    try:
        response_text = agent.execute(request.message, formatted_history)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

