import logging
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from backend.app.config import QDRANT_HOST, QDRANT_PORT, QDRANT_API_KEY
from agent.rag.embeddings import get_embedding, get_embedding_dimension

logger = logging.getLogger(__name__)

COLLECTION_NAME = "hackathon_docs"

# Initialize Qdrant Client
api_key = QDRANT_API_KEY if QDRANT_API_KEY and not QDRANT_API_KEY.startswith("optional") else None
qdrant_client = QdrantClient(
    host=QDRANT_HOST, 
    port=QDRANT_PORT, 
    api_key=api_key,
    https=False
)

def init_qdrant_collection():
    """
    Creates the collection in Qdrant with the correct dimension.
    """
    dim = get_embedding_dimension()
    logger.info(f"Recreating Qdrant collection '{COLLECTION_NAME}' with size={dim}")
    try:
        qdrant_client.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
        return True
    except Exception as e:
        logger.error(f"Failed to recreate Qdrant collection: {e}")
        return False

def index_chunks(chunks: List[Dict[str, Any]]):
    """
    Indexes list of chunks into Qdrant.
    Each chunk should have:
    - id: int
    - text: str
    - title: str
    - source: str
    """
    points = []
    for chunk in chunks:
        vector = get_embedding(chunk["text"])
        points.append(
            PointStruct(
                id=chunk["id"],
                vector=vector,
                payload={
                    "text": chunk["text"],
                    "title": chunk["title"],
                    "source": chunk["source"]
                }
            )
        )
    
    try:
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        logger.info(f"Successfully indexed {len(points)} chunks into Qdrant.")
        return True
    except Exception as e:
        logger.error(f"Failed to upsert chunks into Qdrant: {e}")
        return False

def retrieve_context(query: str, limit: int = 3, threshold: float = 0.50) -> List[Dict[str, Any]]:
    """
    Retrieves the most similar chunks from Qdrant above the threshold.
    """
    query_vector = get_embedding(query)
    try:
        search_results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=limit
        )
        
        retrieved = []
        for res in search_results:
            if res.score >= threshold:
                retrieved.append({
                    "score": res.score,
                    "text": res.payload.get("text", ""),
                    "title": res.payload.get("title", ""),
                    "source": res.payload.get("source", "")
                })
        return retrieved
    except Exception as e:
        logger.error(f"Failed to retrieve context from Qdrant: {e}")
        return []
