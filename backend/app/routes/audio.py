import os
import logging
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from deepgram import (
    AsyncDeepgramClient,
    LiveTranscriptionEvents,
    LiveOptions,
    PrerecordedOptions,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Audio"])

# Retrieve FPT AI keys from environment for TTS (VITs)
FPT_API_KEY = os.getenv("FPT_AI_FACTORY_API_KEY", "")
FPT_BASE_URL = os.getenv("FPT_AI_FACTORY_BASE_URL", "https://mkp-api.fptcloud.com")

# Retrieve Deepgram API key from environment for STT (Whisper/Nova)
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")

class TTSRequest(BaseModel):
    text: str

@router.websocket("/stt/stream")
async def websocket_stt_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time STT streaming using Deepgram.
    Acts as a proxy/relay between the Next.js frontend and Deepgram API.
    """
    await websocket.accept()
    logger.info("STT WebSocket streaming connection accepted (Deepgram)")
    
    if not DEEPGRAM_API_KEY:
        logger.error("DEEPGRAM_API_KEY is not set. Closing WebSocket.")
        await websocket.close(code=1008, reason="Deepgram API key not configured")
        return
        
    try:
        # Initialize Deepgram async client
        deepgram_client = AsyncDeepgramClient(DEEPGRAM_API_KEY)
        
        # Configure Live options. 
        # Using model nova-3, language 'vi' for Vietnamese, with smart formatting enabled.
        options = LiveOptions(
            model="nova-3",
            language="vi",
            smart_format=True
        )
        
        # Establish connection with Deepgram's live transcription endpoint
        # Use dynamic version check to ensure compatibility with all deepgram-sdk versions (v3+)
        listen_attr = deepgram_client.listen.asynclive
        if hasattr(listen_attr, "v"):
            dg_socket = await listen_attr.v("1").connect(options)
        else:
            dg_socket = await listen_attr.v1.connect(options)
        
        # Define transcript event handler
        async def on_message(self, result, **kwargs):
            try:
                transcript = result.channel.alternatives[0].transcript
                if transcript and len(transcript.strip()) > 0:
                    logger.info(f"Deepgram live transcript: {transcript}")
                    await websocket.send_text(transcript)
            except Exception as e:
                logger.error(f"Error forwarding transcript to client: {str(e)}")

        async def on_error(self, error, **kwargs):
            logger.error(f"Deepgram WebSocket error event: {str(error)}")

        # Register event handlers
        dg_socket.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_socket.on(LiveTranscriptionEvents.Error, on_error)

        try:
            # Relay binary audio chunks from Next.js client to Deepgram
            while True:
                data = await websocket.receive_bytes()
                if data:
                    await dg_socket.send(data)
        except WebSocketDisconnect:
            logger.info("Next.js client disconnected from STT WebSocket stream")
        finally:
            await dg_socket.finish()
            
    except Exception as e:
        logger.error(f"STT Deepgram WebSocket proxy error: {str(e)}")
        try:
            await websocket.close()
        except Exception:
            pass

@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Standard POST STT endpoint using Deepgram's Prerecorded transcription.
    Accepts an audio file and returns the transcribed text.
    """
    logger.info(f"Received audio file for transcription: {file.filename}")
    if not DEEPGRAM_API_KEY:
        logger.error("DEEPGRAM_API_KEY not configured. Returning empty string.")
        return {"text": ""}
    
    try:
        content = await file.read()
        deepgram_client = AsyncDeepgramClient(DEEPGRAM_API_KEY)
        
        options = PrerecordedOptions(
            model="nova-3",
            language="vi",
            smart_format=True
        )
        
        # Dynamic version check for compatibility (v3+)
        rest_attr = deepgram_client.listen.rest
        if hasattr(rest_attr, "v"):
            response = await rest_attr.v("1").transcribe_file({"buffer": content}, options)
        else:
            response = await rest_attr.v1.transcribe_file({"buffer": content}, options)
            
        transcribed_text = response.results.channels[0].alternatives[0].transcript
        logger.info(f"Deepgram file transcription result: {transcribed_text}")
        return {"text": transcribed_text}
    except Exception as e:
        logger.error(f"STT file transcription error: {str(e)}")
        return {"text": ""}

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    TTS endpoint using FPT.AI-VITs (remains unchanged as per instruction).
    """
    text = request.text.strip()
    logger.info(f"Received TTS request for text: '{text}'")
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    if not FPT_API_KEY:
        return generate_silent_wav()
        
    try:
        url = f"{FPT_BASE_URL.rstrip('/')}/v1/audio/speech"
        headers = {
            "Authorization": f"Bearer {FPT_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "FPT.AI-VITs",
            "input": text,
            "response_format": "wav",
            "voice": "std_kimngan"
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            
        if response.status_code == 200:
            return StreamingResponse(response.iter_bytes(), media_type="audio/wav")
        return generate_silent_wav()
    except Exception as e:
        logger.error(f"TTS POST error: {str(e)}")
        return generate_silent_wav()

def generate_silent_wav():
    header = (
        b'RIFF\x44\x1f\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00'
        b'\x40\x1f\x00\x00\x40\x1f\x00\x00\x01\x00\x08\x00data\x40\x1f\x00\x00'
    )
    data = b'\x80' * 8000
    return StreamingResponse(io.BytesIO(header + data), media_type="audio/wav")
