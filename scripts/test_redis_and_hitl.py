import time
import sys
import os
import requests

# Adjust path to import backend modules if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BACKEND_URL = "http://localhost:8000"

def test_redis_caching():
    print("\n--- Test 1: Testing Redis Caching for RAG Queries ---")
    
    import uuid
    session1 = f"test-cache-s1-{uuid.uuid4().hex[:6]}"
    session2 = f"test-cache-s2-{uuid.uuid4().hex[:6]}"
    
    # We choose an informational query about hospital location which triggers RAG and not a greeting or tool
    payload1 = {
        "message": "Địa chỉ cơ sở 1 của Bệnh viện Tim Hà Nội ở đâu?",
        "history": [],
        "stream": False,
        "session_id": session1,
        "user_id": "test_user"
    }
    
    print("Sending first query (Cache Miss / LLM Execution)...")
    start_time = time.time()
    response1 = requests.post(f"{BACKEND_URL}/api/chat", json=payload1)
    elapsed1 = time.time() - start_time
    print(f"First response received in: {elapsed1:.2f} seconds")
    print(f"Response: {response1.json().get('response', '')[:100].encode('ascii', errors='ignore').decode('ascii')}...")
    
    payload2 = {
        "message": "Địa chỉ cơ sở 1 của Bệnh viện Tim Hà Nội ở đâu?",
        "history": [],
        "stream": False,
        "session_id": session2,
        "user_id": "test_user"
    }
    
    print("\nSending second identical query with a new session ID (Expected Cache Hit)...")
    start_time = time.time()
    response2 = requests.post(f"{BACKEND_URL}/api/chat", json=payload2)
    elapsed2 = time.time() - start_time
    print(f"Second response received in: {elapsed2:.2f} seconds")
    print(f"Response: {response2.json().get('response', '')[:100].encode('ascii', errors='ignore').decode('ascii')}...")
    
    if elapsed2 < elapsed1 / 2 or elapsed2 < 2.0:
        print("[SUCCESS] Redis Caching Success! The cached query is significantly faster.")
    else:
        print("[WARNING] Warning: Cache speedup was not as expected. Please check Redis connection or logs.")

def test_human_in_the_loop():
    print("\n--- Test 2: Testing Human-in-the-loop Database Mute/Unmute Flow ---")
    
    # Check if we can list cases
    print("Listing active human cases...")
    res = requests.get(f"{BACKEND_URL}/api/human-cases")
    if res.status_code == 200:
        cases = res.json()
        print(f"Fetched {len(cases)} cases successfully.")
    else:
        print(f"[FAILED] Failed to fetch cases: {res.text}")
        return
    
    # Simulate a user trigger escalation
    # We will invoke chat with an escalation request
    # FPT AI Factory agent uses tools. Let's see if we can trigger escalation by creating a case directly
    # Or by posting to the database directly or requesting a human
    print("\nCreating a demo HumanCase in PostgreSQL...")
    db_cases_before = len(cases)
    from backend.app.database import SessionLocal
    from backend.app.models import HumanCase, Patient
    from datetime import datetime, timedelta
    import uuid
    
    patient_phone = "0912345678"
    case_code = f"CASE-TEST-{uuid.uuid4().hex[:6].upper()}"
    
    print(f"Directly inserting active HumanCase {case_code} into database for phone {patient_phone}...")
    with SessionLocal() as db:
        patient = db.query(Patient).filter(Patient.phone == patient_phone).first()
        if not patient:
            patient = Patient(
                patient_code=f"BN-TEST-{uuid.uuid4().hex[:6].upper()}",
                display_name="Benh Nhan Test",
                phone=patient_phone,
                is_demo=True
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            
        # Clean any old open cases for this patient to ensure clean test
        db.query(HumanCase).filter(
            HumanCase.patient_id == patient.id,
            HumanCase.status.in_(["OPEN", "IN_PROGRESS"])
        ).delete(synchronize_session=False)
        
        new_case = HumanCase(
            case_code=case_code,
            patient_id=patient.id,
            case_type="Ho tro y te",
            trigger="Yeu cau ho tro khan cap (kiem thu tu dong)",
            priority="HIGH",
            sla_due_at=datetime.utcnow() + timedelta(minutes=15),
            status="OPEN"
        )
        db.add(new_case)
        db.commit()
        print(f"Successfully inserted case {case_code} in database.")

    # 1. Test if AI agent is muted now for subsequent messages from this user (0912345678)
    print(f"\nSending subsequent message while case is OPEN for phone {patient_phone} (AI should be muted)...")
    mute_res = requests.post(f"{BACKEND_URL}/api/chat", json={
        "message": "Hello? Có ai ở đó không?",
        "history": [],
        "stream": False,
        "session_id": "test-hitl-session-456",
        "user_id": patient_phone
    })
    response_text = mute_res.json().get("response", "")
    print(f"Response: {response_text.encode('ascii', errors='ignore').decode('ascii')}")
    if "chuyển giao cho nhân viên hỗ trợ y tế" in response_text:
        print("[SUCCESS] AI Agent Muting Success! AI is properly muted when case is active.")
    else:
        print("[FAILED] AI Agent Muting Failed! AI answered normally.")
        
    # 2. Simulate staff resolving the case via our PATCH API endpoint
    print(f"\nSimulating staff resolving case {case_code} via PATCH API...")
    resolve_res = requests.patch(f"{BACKEND_URL}/api/human-cases/{case_code}", json={
        "status": "RESOLVED",
        "owner": "Lan Anh"
    })
    if resolve_res.status_code == 200:
        print("[SUCCESS] Case marked as RESOLVED in Database via API.")
    else:
        print(f"[FAILED] Failed to resolve case: {resolve_res.text}")
        
    # 3. Test if AI agent is unmuted now
    print(f"\nSending message after case is RESOLVED for phone {patient_phone} (AI should be unmuted and answer)...")
    unmute_res = requests.post(f"{BACKEND_URL}/api/chat", json={
        "message": "Chào bạn, tôi muốn hỏi lịch làm việc của cơ sở 2",
        "history": [],
        "stream": False,
        "session_id": "test-hitl-session-456",
        "user_id": patient_phone
    })
    response_text_unmuted = unmute_res.json().get("response", "")
    print(f"Response: {response_text_unmuted[:150].encode('ascii', errors='ignore').decode('ascii')}...")
    if "chuyển giao cho nhân viên hỗ trợ y tế" not in response_text_unmuted:
        print("[SUCCESS] AI Agent Unmuting Success! AI is active again.")
    else:
        print("[FAILED] AI Agent Unmuting Failed!")

if __name__ == "__main__":
    print("Testing backend connection...")
    try:
        requests.get(BACKEND_URL)
        test_redis_caching()
        test_human_in_the_loop()
    except requests.exceptions.ConnectionError:
        print(f"Could not connect to backend at {BACKEND_URL}. Please make sure the FastAPI server is running (`make dev` or `python -m uvicorn backend.app.main:app --port 8000`).")
