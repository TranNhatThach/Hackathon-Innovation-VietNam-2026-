import re
import logging
from typing import Optional
from agent.rag.embeddings import get_embedding

logger = logging.getLogger(__name__)

# Predefined emergency response message
EMERGENCY_RESPONSE = (
    "⚠️ **CẢNH BÁO KHẨN CẤP:** Triệu chứng của bạn có thể là dấu hiệu của một tình trạng tim mạch khẩn cấp. \n\n"
    "Vui lòng **NGỪNG** đặt câu hỏi và thực hiện ngay các bước sau:\n"
    "1. **Gọi ngay Cấp cứu 115** hoặc Hotline Cấp cứu của Bệnh viện: **0243.8248362**.\n"
    "2. Di chuyển ngay lập tức đến **Khoa Cấp cứu - Bệnh viện Tim Hà Nội** (Địa chỉ: 92 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội hoặc Cơ sở 2: Đường Võ Chí Công, Tây Hồ, Hà Nội) hoặc cơ sở y tế gần nhất.\n"
    "3. Không tự lái xe, hãy nhờ người nhà hỗ trợ hoặc đợi xe cấp cứu.\n\n"
    "*Lưu ý: Trợ lý AI không thể đưa ra chẩn đoán y khoa hay tư vấn điều trị trong tình huống khẩn cấp.*"
)

# List of emergency keywords (both with and without accent marks for robust detection)
EMERGENCY_KEYWORDS = [
    # Chest pain
    r"đau ngực", r"dau nguc", r"tức ngực", r"tuc nguc", r"đau nhói tim", r"dau nhoi tim", r"ép ngực", r"ep nguc",
    # Breathing difficulties
    r"khó thở", r"kho tho", r"hụt hơi", r"hut hoi", r"ngạt thở", r"ngat tho",
    # Fainting & dizziness
    r"ngất", r"ngat", r"xỉu", r"xiu", r"hôn mê", r"hon me", r"mất ý thức", r"mat y thuc",
    # Sweating & other acute symptoms
    r"vã mồ hôi lạnh", r"va mo hoi lanh", r"vã mồ hôi", r"va mo hoi",
    # Acute terms
    r"cấp cứu", r"cap cuu", r"đột quỵ", r"dot quy", r"nhồi máu", r"nhoi mau", r"tai biến", r"tai bien"
]

# Semantic templates representing emergency cardiorespiratory conditions
EMERGENCY_TEMPLATES = [
    "tôi bị đau tức lồng ngực dữ dội đè nặng khó thở cấp",
    "bệnh nhân bị đột quỵ nhồi máu cơ tim ngất xỉu mất ý thức",
    "đau thắt vùng ngực trái lan ra bả vai vã mồ hôi lạnh",
    "cơn đau tim cấp tính nghẹt thở nguy kịch"
]

_cached_template_embeddings = None

def _get_template_embeddings():
    global _cached_template_embeddings
    if _cached_template_embeddings is None:
        try:
            logger.info("Computing emergency template embeddings for semantic guardrails...")
            _cached_template_embeddings = [get_embedding(t) for t in EMERGENCY_TEMPLATES]
            logger.info("Successfully cached emergency template embeddings.")
        except Exception as e:
            logger.error(f"Failed to cache template embeddings: {e}")
            _cached_template_embeddings = []
    return _cached_template_embeddings

def cosine_similarity(v1, v2) -> float:
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = sum(x * x for x in v1) ** 0.5
    norm_v2 = sum(x * x for x in v2) ** 0.5
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

def check_emergency(user_query: str) -> Optional[str]:
    """
    Checks the user query for emergency cardiovascular symptoms.
    Uses highly sensitive keyword regex first, then falls back to a semantic similarity check
    if cardiovascular-related keywords are spotted.
    """
    query_lower = user_query.lower()
    
    # 1. Fast Keyword Match (Highly sensitive, regex-based)
    for pattern in EMERGENCY_KEYWORDS:
        if re.search(r'\b' + pattern + r'\b', query_lower) or pattern in query_lower:
            logger.info(f"Emergency guardrail triggered by keyword: '{pattern}'")
            return EMERGENCY_RESPONSE
            
    # 2. Semantic Hybrid Check
    # Only triggered if the query contains words related to cardiac symptoms to save API cost and latency
    trigger_words = ["tim", "ngực", "nguc", "thở", "tho", "đau", "dau", "mệt", "met", "xỉu", "xiu", "vã", "va", "đột", "dot", "cấp", "cap"]
    if any(w in query_lower for w in trigger_words):
        try:
            templates = _get_template_embeddings()
            if templates:
                query_emb = get_embedding(user_query)
                max_sim = 0.0
                for temp_emb in templates:
                    sim = cosine_similarity(query_emb, temp_emb)
                    if sim > max_sim:
                        max_sim = sim
                
                # Threshold for FPT Vietnamese_Embedding (0.52 is optimized for emergency semantic match)
                if max_sim >= 0.52:
                    logger.warning(f"Emergency guardrail triggered semantically (similarity: {max_sim:.3f}) for query: '{user_query}'")
                    return EMERGENCY_RESPONSE
        except Exception as e:
            logger.error(f"Error in semantic emergency guardrail: {e}")
            
    return None
