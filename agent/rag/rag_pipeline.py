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

if QDRANT_HOST.startswith(("http://", "https://")):
    qdrant_client = QdrantClient(
        url=QDRANT_HOST,
        api_key=api_key
    )
else:
    use_https = (QDRANT_PORT == 443) or ("qdrant.io" in QDRANT_HOST)
    qdrant_client = QdrantClient(
        host=QDRANT_HOST, 
        port=QDRANT_PORT, 
        api_key=api_key,
        https=use_https
    )

def _collection_exists() -> bool:
    """Check if the Qdrant collection already exists."""
    try:
        existing = qdrant_client.get_collections()
        return any(c.name == COLLECTION_NAME for c in existing.collections)
    except Exception:
        return False


def init_qdrant_collection():
    """
    Creates or recreates the collection in Qdrant with the correct dimension
    and full-text index. Compatible with both old and new qdrant-client versions.
    """
    dim = get_embedding_dimension()
    logger.info(f"Initializing Qdrant collection '{COLLECTION_NAME}' with size={dim}")
    try:
        # Delete the collection if it exists (compatible replacement for recreate_collection)
        if _collection_exists():
            qdrant_client.delete_collection(collection_name=COLLECTION_NAME)
            logger.info(f"Deleted existing collection '{COLLECTION_NAME}'")

        # Create the collection fresh
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
        logger.info(f"Created collection '{COLLECTION_NAME}'")

        # Create text payload index for full-text search
        try:
            from qdrant_client.http import models as qdrant_models
            qdrant_client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="text",
                field_schema=qdrant_models.TextIndexParams(
                    type="text",
                    tokenizer=qdrant_models.TokenizerType.WORD,
                    lowercase=True,
                    min_token_len=2,
                    max_token_len=15
                )
            )
            logger.info("Created full-text payload index on field 'text'")
        except Exception as e:
            logger.warning(f"Could not create text index (non-critical): {e}")

        return True
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collection: {e}")
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
    if not chunks:
        logger.warning("index_chunks called with empty list")
        return False

    # Ensure collection exists before indexing
    if not _collection_exists():
        logger.info("Collection does not exist, initializing...")
        if not init_qdrant_collection():
            return False

    points = []
    for chunk in chunks:
        try:
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
        except Exception as e:
            logger.error(f"Failed to embed chunk {chunk.get('id')}: {e}")
            continue

    if not points:
        logger.error("No points to upsert (all embeddings failed)")
        return False

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


import json


def rerank_chunks(query: str, chunks: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """
    Re-ranks retrieved chunks using an LLM-based ranker or dedicated Rerank API (FPT AI Factory).
    Attempts to use BGE-Reranker-v2-m3 via the /rerank endpoint, falling back to prompt-based LLM ranking.
    """
    if not chunks:
        return []
    if len(chunks) <= 1:
        return chunks[:top_n]

    import httpx
    from agent.core.fpt_client import FPTAIFactoryClient
    client = FPTAIFactoryClient()

    # 1. Attempt to use FPT AI Factory BGE-Reranker-v2-m3 via /rerank API
    try:
        url = f"{client.base_url}/rerank"
        payload = {
            "model": "bge-reranker-v2-m3",
            "query": query,
            "documents": [chunk["text"] for chunk in chunks],
            "top_n": top_n
        }
        with httpx.Client(timeout=10.0) as http_client:
            response = http_client.post(url, headers=client.headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                if results:
                    reranked = []
                    seen = set()
                    for item in results:
                        idx = item.get("index")
                        if idx is not None and 0 <= idx < len(chunks) and idx not in seen:
                            reranked.append(chunks[idx])
                            seen.add(idx)
                    # Add any remaining chunks missed by the reranker
                    for idx, chunk in enumerate(chunks):
                        if idx not in seen:
                            reranked.append(chunk)
                    logger.info("Successfully reranked chunks using FPT bge-reranker-v2-m3 API")
                    return reranked[:top_n]
    except Exception as e:
        logger.warning(f"FPT /rerank API not available or failed, falling back to LLM Reranking: {e}")

    # 2. Fallback to prompt-based LLM reranker using FPT chat completions
    prompt = (
        "Bạn là hệ thống Reranking (đánh giá và xếp hạng tài liệu) thuộc RAG Pipeline của Google ADK 2.0.\n"
        "Nhiệm vụ của bạn là đánh giá mức độ liên quan của các đoạn văn bản (chunks) dưới đây đối với câu hỏi của người dùng.\n\n"
        f"Câu hỏi: \"{query}\"\n\n"
        "Danh sách các đoạn văn bản cần đánh giá:\n"
    )

    for idx, chunk in enumerate(chunks):
        prompt += f"--- ĐOẠN VĂN BẢN [{idx}] ---\nTiêu đề: {chunk['title']}\nNội dung: {chunk['text']}\n\n"

    prompt += (
        "Hãy đánh giá và trả về kết quả xếp hạng dưới dạng một mảng JSON chứa chỉ số (index) của các đoạn văn bản có ích nhất xếp theo thứ tự giảm dần về độ liên quan.\n"
        "Định dạng kết quả trả về chỉ chứa duy nhất khối JSON như ví dụ sau: [2, 0, 1]. Không giải thích gì thêm."
    )

    try:
        messages = [{"role": "user", "content": prompt}]
        response = client.chat_completion(messages, temperature=0.1)
        response_text = response.get("content", "").strip()

        # Find the JSON array in response
        start_idx = response_text.find("[")
        end_idx = response_text.find("]") + 1
        if start_idx != -1 and end_idx > start_idx:
            rankings = json.loads(response_text[start_idx:end_idx])
            reranked = []
            seen = set()
            for index in rankings:
                if isinstance(index, int) and 0 <= index < len(chunks) and index not in seen:
                    reranked.append(chunks[index])
                    seen.add(index)
            # Add any chunks the LLM missed
            for idx, chunk in enumerate(chunks):
                if idx not in seen:
                    reranked.append(chunk)
            return reranked[:top_n]
    except Exception as e:
        logger.error(f"Failed to rerank chunks using fallback: {e}")

    return chunks[:top_n]


def retrieve_context(query: str, limit: int = 3, threshold: float = 0.30) -> List[Dict[str, Any]]:
    """
    Retrieves document chunks using Hybrid Search (Dense Vector + Sparse Keyword),
    applies Reciprocal Rank Fusion (RRF), then performs LLM-based Reranking.
    Compatible with qdrant-client >=1.7.x and >=1.9.x.
    """
    if not _collection_exists():
        logger.warning(f"Collection '{COLLECTION_NAME}' does not exist. Run seed.py first.")
        return []

    candidate_limit = max(limit * 3, 10)
    query_vector = get_embedding(query)

    try:
        from qdrant_client.http import models as qdrant_models

        # 1. Dense Vector Search
        dense_hits = []
        try:
            # Try newer API first (qdrant-client >= 1.9.0)
            vector_results = qdrant_client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                limit=candidate_limit
            )
            for res in vector_results.points:
                if res.score >= threshold:
                    dense_hits.append({
                        "id": res.id,
                        "text": res.payload.get("text", ""),
                        "title": res.payload.get("title", ""),
                        "source": res.payload.get("source", ""),
                        "score": res.score
                    })
        except AttributeError:
            # Fallback for qdrant-client < 1.9.0 (uses search)
            try:
                vector_results = qdrant_client.search(
                    collection_name=COLLECTION_NAME,
                    query_vector=query_vector,
                    limit=candidate_limit,
                    score_threshold=threshold
                )
                for res in vector_results:
                    dense_hits.append({
                        "id": res.id,
                        "text": res.payload.get("text", ""),
                        "title": res.payload.get("title", ""),
                        "source": res.payload.get("source", ""),
                        "score": res.score
                    })
            except Exception as e:
                logger.error(f"Dense vector search failed: {e}")

        # 2. Keyword Search (Sparse) via payload MatchText filter
        keyword_hits = []
        try:
            scroll_res, _ = qdrant_client.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="text",
                            match=qdrant_models.MatchText(text=query)
                        )
                    ]
                ),
                limit=candidate_limit
            )
            for point in scroll_res:
                keyword_hits.append({
                    "id": point.id,
                    "text": point.payload.get("text", ""),
                    "title": point.payload.get("title", ""),
                    "source": point.payload.get("source", ""),
                    "score": 0.5  # Fixed score for keyword matches
                })
        except Exception as e:
            logger.debug(f"Keyword search failed or no text index: {e}")

        # 3. Reciprocal Rank Fusion (RRF) to merge both result sets
        rrf_scores: Dict[int, float] = {}
        doc_map: Dict[int, Dict] = {}

        for rank, doc in enumerate(dense_hits):
            doc_id = doc["id"]
            doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (60.0 + rank))

        for rank, doc in enumerate(keyword_hits):
            doc_id = doc["id"]
            if doc_id not in doc_map:
                doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (60.0 + rank))

        # Sort by RRF score descending
        sorted_doc_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        retrieved = [doc_map[doc_id] for doc_id in sorted_doc_ids]

        # Limit candidates for reranker to avoid excessive LLM calls
        retrieved_candidates = retrieved[:candidate_limit]

        if not retrieved_candidates:
            logger.info(f"No candidates found for query: '{query}'")
            return []

        # 4. LLM-based Reranking
        reranked_results = rerank_chunks(query, retrieved_candidates, top_n=limit)
        return reranked_results

    except Exception as e:
        logger.error(f"Failed to retrieve context from Qdrant: {e}")
        return []
