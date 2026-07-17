import io
import wave
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/v1/voice", tags=["Voice"])

AudioUpload = Annotated[UploadFile | None, File(description="Vietnamese speech audio buffer.")]
TextUpload = Annotated[str | None, Form(description="Optional transcript fallback for testing.")]


class ASRResponse(BaseModel):
    transcript: str
    language: str = "vi-VN"
    provider: str = "mock-vietnamese-asr"
    audio_bytes: int = 0


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2_000)
    voice: str = Field(default="vi-VN-standard-female", max_length=64)


def _silent_wav(duration_ms: int = 700, sample_rate: int = 16_000) -> bytes:
    frame_count = int(sample_rate * duration_ms / 1000)
    frames = b"\x00\x00" * frame_count
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(frames)

    return buffer.getvalue()


@router.post("/asr", response_model=ASRResponse)
async def speech_to_text(
    audio: AudioUpload = None,
    text: TextUpload = None,
) -> ASRResponse:
    audio_bytes = 0
    if audio is not None:
        audio_buffer = await audio.read()
        audio_bytes = len(audio_buffer)

    transcript = text or (
        "Đã nhận âm thanh. Kết quả ASR sẽ được tích hợp với dịch vụ giọng nói tiếng Việt."
    )
    return ASRResponse(
        transcript=transcript,
        audio_bytes=audio_bytes,
    )


@router.post("/tts", response_class=Response)
async def text_to_speech(request: TTSRequest) -> Response:
    audio_buffer = _silent_wav(max(700, min(len(request.text) * 20, 5000)))
    return Response(
        content=audio_buffer,
        media_type="audio/wav",
        headers={
            "X-Voice-Provider": "mock-vietnamese-tts",
            "X-Voice-Name": request.voice,
            "X-Text-Length": str(len(request.text)),
        },
    )
