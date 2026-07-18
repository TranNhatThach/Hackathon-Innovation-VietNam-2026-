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
    Creates the collection in Qdrant with the correct dimension and full-text index.
    """
    dim = get_embedding_dimension()
    logger.info(f"Recreating Qdrant collection '{COLLECTION_NAME}' with size={dim}")
    try:
        qdrant_client.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
        # Create text payload index for full-text search
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
        logger.info(f"Created full-text payload index on field 'text'")
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

import json

def rerank_chunks(query: str, chunks: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """
    Xếp hạng lại các đoạn văn bản truy xuất bằng mô hình LLM (Prompt-based Reranker).
    Đây là giai đoạn Reranking/Ranking RAG theo chuẩn Google ADK 2.0.
    """
    if not chunks:
        return []
    if len(chunks) <= 1:
        return chunks[:top_n]

    from agent.core.fpt_client import FPTAIFactoryClient
    client = FPTAIFactoryClient()

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

        # Tìm kiếm khối mảng JSON
        start_idx = response_text.find("[")
        end_idx = response_text.find("]") + 1
        if start_idx != -1 and end_idx != -1:
            rankings = json.loads(response_text[start_idx:end_idx])
            reranked = []
            seen = set()
            for index in rankings:
                if isinstance(index, int) and 0 <= index < len(chunks) and index not in seen:
                    reranked.append(chunks[index])
                    seen.add(index)
            # Bổ sung các chunk bị thiếu nếu LLM bỏ quên
            for idx, chunk in enumerate(chunks):
                if idx not in seen:
                    reranked.append(chunk)
            return reranked[:top_n]
    except Exception as e:
        logger.error(f"Failed to rerank chunks: {e}")

    return chunks[:top_n]

def retrieve_context(query: str, limit: int = 3, threshold: float = 0.30) -> List[Dict[str, Any]]:
    """
    Truy xuất các đoạn văn bản bằng phương thức Hybrid Search (Dense Vector + Sparse Keyword),
    sau đó thực hiện gom nhóm xếp hạng nghịch đảo RRF và cuối cùng chạy LLM Reranking.
    """
    candidate_limit = max(limit * 2, 8)
    query_vector = get_embedding(query)
    
    try:
        from qdrant_client.http import models as qdrant_models
        
        # 1. Nhánh 1: Vector Search (Dense)
        vector_results = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=candidate_limit
        )
        
        dense_hits = []
        for res in vector_results.points:
            if res.score >= threshold:
                dense_hits.append({
                    "id": res.id,
                    "text": res.payload.get("text", ""),
                    "title": res.payload.get("title", ""),
                    "source": res.payload.get("source", ""),
                    "score": res.score
                })
                
        # 2. Nhánh 2: Keyword Search (Sparse) dùng MatchText trên payload field 'text'
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
                    "score": 0.5  # Điểm số mặc định khi khớp từ khóa
                })
        except Exception as e:
            logger.debug(f"Keyword search failed or no text index: {e}")

        # 3. Trộn kết quả bằng thuật toán RRF (Reciprocal Rank Fusion)
        rrf_scores = {}
        doc_map = {}
        
        for rank, doc in enumerate(dense_hits):
            doc_id = doc["id"]
            doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (60.0 + rank))
            
        for rank, doc in enumerate(keyword_hits):
            doc_id = doc["id"]
            if doc_id not in doc_map:
                doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (60.0 + rank))
            
        # Sắp xếp các tài liệu theo điểm RRF giảm dần
        sorted_doc_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        retrieved = [doc_map[doc_id] for doc_id in sorted_doc_ids]
        
        # Cắt lấy số lượng ứng viên tối đa cho LLM Reranker
        retrieved_candidates = retrieved[:candidate_limit]

        # 4. Thực hiện bước Reranking cuối cùng sử dụng LLM
        reranked_results = rerank_chunks(query, retrieved_candidates, top_n=limit)
        return reranked_results
        
    except Exception as e:
        logger.error(f"Failed to retrieve context from Qdrant: {e}")
        return []

