import logging
import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/speech", tags=["Speech"])

FPT_BASE_URL = os.getenv("FPT_AI_FACTORY_BASE_URL", "https://api.fpt.ai/v1").rstrip("/")
FPT_API_KEY = os.getenv("FPT_AI_FACTORY_API_KEY", "")
TTS_MODEL = os.getenv("FPT_TTS_MODEL", "FPT.AI-VITs")
TTS_VOICE = os.getenv("FPT_TTS_VOICE", "banmai")


def auth_headers() -> dict[str, str]:
    if not FPT_API_KEY:
        raise HTTPException(status_code=503, detail="FPT AI Factory API key is not configured")
    return {"Authorization": f"Bearer {FPT_API_KEY}"}


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


@router.post("/synthesize")
async def synthesize(request: SpeechRequest):
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{FPT_BASE_URL}/audio/speech",
                headers={**auth_headers(), "Content-Type": "application/json"},
                json={
                    "model": TTS_MODEL,
                    "input": request.text,
                    "voice": TTS_VOICE,
                    "response_format": "mp3",
                },
            )
        response.raise_for_status()
        return Response(content=response.content, media_type=response.headers.get("content-type", "audio/mpeg"))
    except httpx.HTTPStatusError as exc:
        logger.error("FPT TTS error %s: %s", exc.response.status_code, exc.response.text[:500])
        raise HTTPException(status_code=502, detail="FPT text-to-speech request failed") from exc
    except httpx.HTTPError as exc:
        logger.error("FPT TTS error: %s", exc)
        raise HTTPException(status_code=502, detail="Unable to synthesize speech with FPT") from exc
