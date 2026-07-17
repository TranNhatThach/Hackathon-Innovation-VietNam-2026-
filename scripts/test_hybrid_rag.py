import os
import sys

# Ensure root directory is in python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

from agent.rag.rag_pipeline import retrieve_context

def test_queries():
    # 3 dạng câu hỏi kiểm thử đặc thù
    queries = [
        "Giấy tờ khám BHYT",                      # Dạng 1: Từ viết tắt (BHYT)
        "Quy trình đón tiếp bệnh nhân QT.25.01",   # Dạng 2: Mã quy trình chính xác (QT.25.01)
        "tức ngực đau tim"                        # Dạng 3: Tìm kiếm ngữ nghĩa (Đồng nghĩa)
    ]
    
    for q in queries:
        print("\n" + "="*70)
        print(f"🔎 THỬ NGHIỆM TRUY VẤN: '{q}'")
        print("="*70)
        
        # Gọi hàm retrieve_context nâng cấp
        results = retrieve_context(q, limit=3)
        
        if not results:
            print("❌ Không tìm thấy tài liệu phù hợp.")
            continue
            
        for idx, res in enumerate(results):
            print(f"\n[TOP {idx+1}] - Tiêu đề: {res.get('title')}")
            print(f"   Nguồn: {res.get('source')}")
            # Cắt ngắn nội dung để dễ theo dõi
            text_preview = res.get('text', '').replace('\n', ' ')[:200]
            print(f"   Nội dung: {text_preview}...")

if __name__ == "__main__":
    test_queries()
