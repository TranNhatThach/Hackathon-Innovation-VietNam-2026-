import re
from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp, Message


EMERGENCY_PATTERN = re.compile(
    r"(?:đau\s+ngực|khó\s+thở|ngất|severe\s+chest\s+pain|"
    r"shortness\s+of\s+breath|fainting)",
    flags=re.IGNORECASE | re.UNICODE,
)

EMERGENCY_INSTRUCTIONS = {
    "emergency": True,
    "status": "emergency_intercepted",
    "message": (
        "Các triệu chứng bạn mô tả có thể là tình huống cấp cứu. "
        "Chatbot không chẩn đoán và không đưa ra hướng dẫn điều trị."
    ),
    "instructions": [
        "Gọi 115 ngay nếu người bệnh có dấu hiệu nguy hiểm.",
        "Đưa người bệnh đến Khoa Cấp cứu của Bệnh viện Tim Hà Nội hoặc cơ sở cấp cứu gần nhất.",
        "Không tiếp tục chờ tư vấn qua chatbot trong tình huống khẩn cấp.",
        "Mang theo giấy tờ tùy thân, thẻ BHYT và hồ sơ bệnh án nếu có sẵn.",
    ],
    "handoff": {
        "team": "hospital_emergency_response_team",
        "priority": "life_critical",
    },
}


async def notify_emergency_contact(
    *,
    request: Request,
    matched_text: str,
) -> dict[str, Any]:
    return {
        "sent": True,
        "channel": "mock_internal_alert",
        "target": "hospital_emergency_response_team",
        "matched_text": matched_text,
        "request_path": request.url.path,
        "notified_at": datetime.now(UTC).isoformat(),
    }


class EmergencyFilterMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        chat_paths: set[str] | None = None,
    ) -> None:
        super().__init__(app)
        self._chat_paths = chat_paths or {"/chat", "/api/chat"}

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if request.method != "POST" or request.url.path not in self._chat_paths:
            return await call_next(request)

        body = await request.body()
        payload_text = body.decode("utf-8", errors="ignore")
        emergency_match = EMERGENCY_PATTERN.search(payload_text)

        if emergency_match:
            notification = await notify_emergency_contact(
                request=request,
                matched_text=emergency_match.group(0),
            )
            return JSONResponse(
                status_code=200,
                content={**EMERGENCY_INSTRUCTIONS, "notification": notification},
            )

        async def receive() -> Message:
            return {
                "type": "http.request",
                "body": body,
                "more_body": False,
            }

        request._receive = receive
        return await call_next(request)
