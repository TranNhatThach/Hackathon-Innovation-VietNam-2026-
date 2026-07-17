import re
from typing import Optional

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

def check_emergency(user_query: str) -> Optional[str]:
    """
    Checks the user query for emergency cardiovascular symptoms.
    Returns the fixed emergency response if any keyword matches, otherwise None.
    """
    query_lower = user_query.lower()
    for pattern in EMERGENCY_KEYWORDS:
        if re.search(r'\b' + pattern + r'\b', query_lower) or pattern in query_lower:
            return EMERGENCY_RESPONSE
    return None
