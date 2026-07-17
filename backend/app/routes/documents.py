import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from agent import index_chunks

router = APIRouter(prefix="/api/documents", tags=["Documents"])

# Resolve paths relative to project root
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
RAW_DATA_DIR = os.path.join(ROOT_DIR, "data", "raw")

class UploadResponse(BaseModel):
    status: str
    message: str
    filename: str
    chunks_indexed: int

def chunk_text(text: str, max_chars: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    if len(text) <= max_chars:
        return [text]
        
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        
        # Try to find a nice breaking point (like a newline, period, or space) near the end
        if end < len(text):
            lookback = int(max_chars * 0.15)
            break_points = [
                text.rfind('\n', end - lookback, end),
                text.rfind('. ', end - lookback, end),
                text.rfind(' ', end - lookback, end)
            ]
            valid_breaks = [bp for bp in break_points if bp != -1]
            if valid_breaks:
                end = max(valid_breaks) + 1
                
        chunks.append(text[start:end].strip())
        start = end - overlap
        if start >= len(text) or end == len(text):
            break
    return chunks

def chunk_file_content(filename: str, content: str) -> List[Dict[str, Any]]:
    """
    Splits the text content into semantically dense chunks of max 1000 chars with 200 chars overlap.
    """
    chunks = []
    base_id = hash(filename) % 10000000
    chunk_id = base_id
    
    if filename.endswith(".md"):
        # Split by markdown headers first
        sections = content.split("\n## ")
        for section in sections:
            section = section.strip()
            if not section:
                continue
            
            lines = section.split("\n")
            title = lines[0].strip().replace("## ", "")
            
            # Sub-chunk the section if it is too long
            sub_chunks = chunk_text(section, max_chars=1000, overlap=200)
            for j, sub_text in enumerate(sub_chunks):
                text = f"Tài liệu: {filename}\nPhần: {title} (Đoạn {j+1})\n\n{sub_text}"
                chunks.append({
                    "id": chunk_id,
                    "text": text,
                    "title": f"{title} - Đoạn {j+1}" if len(sub_chunks) > 1 else title,
                    "source": filename
                })
                chunk_id += 1
    else:
        # Split text files by paragraphs first
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        for i, para in enumerate(paragraphs):
            first_line = para.split("\n")[0]
            title = first_line[:40] + "..." if len(first_line) > 40 else first_line
            
            sub_chunks = chunk_text(para, max_chars=1000, overlap=200)
            for j, sub_text in enumerate(sub_chunks):
                text = f"Tài liệu: {filename}\nPhần: {title} (Phân đoạn {j+1})\n\n{sub_text}"
                chunks.append({
                    "id": chunk_id,
                    "text": text,
                    "title": f"{filename} - {title} ({j+1})" if len(sub_chunks) > 1 else f"{filename} - {title}",
                    "source": filename
                })
                chunk_id += 1
                
    return chunks

@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Uploads a text or markdown document, saves it to data/raw/,
    creates embeddings, and indexes it into Qdrant vector database.
    """
    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Only .txt and .md files are supported.")
        
    # Ensure raw directory exists
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    file_path = os.path.join(RAW_DATA_DIR, file.filename)
    
    # 2. Save the uploaded file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file on disk: {str(e)}")
        
    # 3. Read saved content
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file content (ensure UTF-8 encoding): {str(e)}")
        
    # 4. Chunk content
    chunks = chunk_file_content(file.filename, content)
    if not chunks:
        raise HTTPException(status_code=400, detail="No content or paragraphs extracted from the file.")
        
    # 5. Embed and index into Qdrant
    try:
        success = index_chunks(chunks)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to index document chunks into Qdrant.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error indexing chunks: {str(e)}")
        
    return UploadResponse(
        status="success",
        message=f"Tài liệu '{file.filename}' đã được tải lên và nạp vào CSDL Vector thành công.",
        filename=file.filename,
        chunks_indexed=len(chunks)
    )
