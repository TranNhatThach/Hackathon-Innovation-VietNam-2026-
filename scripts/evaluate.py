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
        "Vietnam AI Innovation Challenge 2026 là gì?",
        "Làm sao tích hợp API FPT AI Factory?",
        "Cho tôi biết thông tin về ADK 2.0"
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
