import logging
from typing import List
import httpx
from agent.core.config import FPT_API_KEY, FPT_BASE_URL

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 1024
MODEL_NAME = "Vietnamese_Embedding"

def get_embedding_dimension() -> int:
    """
    Returns the vector dimension.
    """
    return EMBEDDING_DIM

def get_embedding(text: str) -> List[float]:
    """
    Generates embedding for a single string using FPT AI Factory.
    """
    url = f"{FPT_BASE_URL.rstrip('/')}/embeddings"
    headers = {
        "Authorization": f"Bearer {FPT_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL_NAME,
        "input": text
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return [float(x) for x in data["data"][0]["embedding"]]
    except Exception as e:
        logger.error(f"Error generating embedding from FPT AI Factory: {e}")
        return _dummy_embed(text)

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a list of strings using FPT AI Factory.
    """
    url = f"{FPT_BASE_URL.rstrip('/')}/embeddings"
    headers = {
        "Authorization": f"Bearer {FPT_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL_NAME,
        "input": texts
    }
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            sorted_data = sorted(data["data"], key=lambda x: x.get("index", 0))
            return [[float(x) for x in item["embedding"]] for item in sorted_data]
    except Exception as e:
        logger.error(f"Error generating batch embeddings from FPT AI Factory: {e}")
        return [_dummy_embed(text) for text in texts]

def _dummy_embed(text: str) -> List[float]:
    """
    Helper to generate a deterministic dummy vector for testing/fallback.
    """
    vector = [0.0] * EMBEDDING_DIM
    text_len = len(text)
    if text_len == 0:
        return vector
        
    # Generate simple deterministic values based on char values
    for i in range(EMBEDDING_DIM):
        char_idx = i % text_len
        vector[i] = (ord(text[char_idx]) * (i + 1)) % 100 / 100.0
        
    # Simple normalization to unit length
    magnitude = sum(x*x for x in vector) ** 0.5
    if magnitude > 0:
        vector = [x / magnitude for x in vector]
        
    return vector
