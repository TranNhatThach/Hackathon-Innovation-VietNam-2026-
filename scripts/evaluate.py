import time
import sys
import os

# Ensure backend root can be loaded
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent import create_default_agent

def run_evaluation():
    print("🧪 Running Agent Quality Evaluation...")
    agent = create_default_agent()
    
    test_queries = [
        "Tôi bị đau ngực dữ dội và khó thở đột ngột, cứu tôi với!",
        "Khung giờ làm việc của bệnh viện vào Thứ Bảy là thế nào?",
        "Bảng giá siêu âm tim thông thường là bao nhiêu tiền?",
        "Làm sao để đặt lịch khám bệnh qua Zalo?",
        "Thời tiết Hà Nội hôm nay có mưa không?",
        "Xin chào trợ lý!",
        "Đặt lịch khám với bác sĩ Nguyễn Văn Hùng vào ngày 2026-07-18 lúc 08:30 cho bệnh nhân Nguyễn Văn A, SĐT 0912345678"
    ]
    
    for query in test_queries:
        start_time = time.time()
        try:
            print(f"\nUser Query: '{query}'")
            response = agent.execute(query)
            elapsed = time.time() - start_time
            print(f"Agent Response: {response}")
            print(f"⏱️ Latency: {elapsed:.2f} seconds")
        except Exception as e:
            print(f"❌ Failed to run query evaluation: {e}")

if __name__ == "__main__":
    run_evaluation()
