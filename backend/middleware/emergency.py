import re
from datetime import datetime, timezone
from typing import Any

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


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
        "notified_at": datetime.now(timezone.utc).isoformat(),
    }


async def _read_body(receive: Receive) -> bytes:
    body = b""
    more_body = True
    while more_body:
        message = await receive()
        body += message.get("body", b"")
        more_body = message.get("more_body", False)
    return body


def _replay_receive(body: bytes) -> Receive:
    sent = False

    async def receive() -> Message:
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.disconnect"}

    return receive


class EmergencyFilterMiddleware:
    """Pure ASGI middleware — avoids BaseHTTPMiddleware body-replay bugs."""

    def __init__(
        self,
        app: ASGIApp,
        chat_paths: set[str] | None = None,
    ) -> None:
        self.app = app
        self._chat_paths = chat_paths or {"/chat", "/api/chat"}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "")
        path = scope.get("path", "")

        if method != "POST" or path not in self._chat_paths:
            await self.app(scope, receive, send)
            return

        body = await _read_body(receive)
        payload_text = body.decode("utf-8", errors="ignore")
        emergency_match = EMERGENCY_PATTERN.search(payload_text)

        if emergency_match:
            request = Request(scope, receive=_replay_receive(body))
            notification = await notify_emergency_contact(
                request=request,
                matched_text=emergency_match.group(0),
            )
            response = JSONResponse(
                status_code=200,
                content={**EMERGENCY_INSTRUCTIONS, "notification": notification},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, _replay_receive(body), send)
