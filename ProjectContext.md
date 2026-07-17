# PROJECT CONTEXT — AI Customer Care Assistant cho Hanoi Heart Hospital

> File này dùng làm ngữ cảnh (context) cho AI coding agent khi phát triển/sửa code
> trong repo `Hackathon-Innovation-VietNam-2026-`. Đọc kỹ trước khi generate code.

---

## 1. Bài toán (nguyên văn rút gọn từ đề bài)

**Đơn vị:** Hanoi Heart Hospital — bệnh viện chuyên khoa tim mạch hạng I,
~2.500–3.000 lượt khám ngoại trú/ngày. Lượng câu hỏi lặp lại lớn (đặt lịch,
lịch bác sĩ, quy trình khám, BHYT, giá dịch vụ, thủ tục nhập viện, tái khám,
dịch vụ chuyên khoa) đang gây quá tải tổng đài/lễ tân.

**Yêu cầu:** Xây AI Customer Care Assistant tích hợp vào website bệnh viện.

## 2. 6 yêu cầu chức năng của đề bài (bám sát để không lệch hướng)

1. **Trả lời dựa trên tri thức (Knowledge-based QA)** — đặt lịch khám, quy
   trình khám/điều trị, BHYT, giá dịch vụ, giờ làm việc, bác sĩ/khoa, thông
   tin chính thức khác của bệnh viện.
2. **Tích hợp hệ thống bệnh viện** — lấy lịch hẹn (mock API), điều hướng
   người dùng sang kênh đặt lịch thật (Website/Zalo Mini App/Hotline), lấy
   thông tin dịch vụ khi có thể.
3. **Trải nghiệm hội thoại** — bắt buộc chat text; ASR/TTS tiếng Việt là
   điểm cộng (không bắt buộc).
4. **Trustworthy AI (không hallucination)** — mọi câu trả lời phải bám sát
   knowledge base chính thức. Nếu không đủ thông tin → nói rõ và điều
   hướng sang kênh hỗ trợ khác, KHÔNG được bịa.
5. **Xử lý cấp cứu (Emergency Handling)** — khi phát hiện dấu hiệu cấp cứu
   (đau ngực dữ dội, khó thở, ngất...) → KHÔNG tư vấn điều trị, PHẢI hướng
   dẫn đến cấp cứu/Khoa Cấp cứu theo quy trình chính thức ngay lập tức.
6. **Sẵn sàng triển khai** — deploy được trên hạ tầng bệnh viện, tuân thủ
   bảo mật dữ liệu/an toàn thông tin/quy định dữ liệu y tế.

## 3. Trạng thái repo hiện tại

Repo là một **starter kit đã dựng sẵn hạ tầng**, chưa có logic nghiệp vụ.

```
Frontend (React + Vite + Tailwind)
        │ HTTP/WebSocket
FastAPI Backend
   ├── Google ADK 2.0  → Agent AI, gọi FPT AI Factory (LLM sponsor, OpenAI-compat)
   ├── Qdrant           → Vector DB (RAG knowledge base)
   ├── Redis            → Cache / rate-limit / lock
   └── PostgreSQL       → Dữ liệu quan hệ (hội thoại, appointment mock...)
```

Thư mục:
- `frontend/` — chat UI
- `backend/` — FastAPI, DB, caching, vector indexing endpoints
- `agent/` — cấu hình LLM Agent (Google ADK 2.0, FPT AI client)
- `prompts/` — system prompt & planner prompt (Markdown, tách riêng khỏi code)
- `scripts/` — seed DB, crawl data, validate model
- `docs/` — kiến trúc, slide, demo recording

Chạy bằng `make up` / `docker compose up -d --build`. Có sẵn `.env.example`.

**Team 4 người:** phân theo 4 mảng — Knowledge/Data, Backend-Agent,
Frontend, Fullstack/DevOps (chi tiết ở mục 6).

## 4. Phạm vi MVP cho demo (ưu tiên theo thứ tự — KHÔNG làm dàn trải)

**Bắt buộc (must-have):**
- RAG QA có trích dẫn nguồn tài liệu trong câu trả lời (chứng minh không
  hallucinate).
- Guardrail cấp cứu chạy TRƯỚC khi vào RAG/LLM tự do — rule-based/keyword
  match cho các triệu chứng cấp cứu, trả về câu trả lời cố định + hướng dẫn
  đến Cấp cứu, không đi qua LLM sinh tự do.
- Fallback "không đủ thông tin" khi điểm retrieval thấp → điều hướng sang
  hotline/kênh khác, không bịa câu trả lời.

**Nên có (should-have):**
- Mock API đặt lịch (trả về khung giờ trống giả lập) — agent gọi qua ADK
  function calling.
- Nút/link điều hướng sang Zalo Mini App hoặc Hotline khi muốn đặt lịch
  thật.

**Bonus (chỉ làm nếu dư thời gian):**
- ASR/TTS tiếng Việt — tận dụng FPT AI Factory Speech API sẵn có thay vì
  tự train.

**Không cần làm cho demo:** tích hợp thật với hệ thống HIS/lịch bác sĩ thật
của bệnh viện — dùng mock data là đủ, giám khảo hiểu đây là hackathon.

## 5. Nguyên tắc thiết kế agent (áp dụng khi sinh code trong `agent/` và `prompts/`)

- **Guardrail cấp cứu tách biệt khỏi LLM**: xử lý bằng rule/keyword-matching
  (hoặc classifier nhẹ) ở tầng backend TRƯỚC khi gọi LLM — không dựa hoàn
  toàn vào system prompt để LLM tự "biết" không tư vấn y khoa.
- **RAG bắt buộc trích nguồn**: mỗi câu trả lời liên quan đến giá/BHYT/quy
  trình phải kèm reference đến tài liệu trong Qdrant. Nếu không tìm được
  đoạn liên quan đủ tin cậy (threshold điểm similarity) → trả fallback,
  không để LLM tự sinh.
- **Tách computation khỏi LLM** (theo kinh nghiệm dự án trước của leader):
  routing/logic xác định loại câu hỏi (đặt lịch / hỏi giá / cấp cứu /
  chung) nên dùng rule-based hoặc classifier nhẹ trước, không giao hết cho
  LLM tự quyết định luồng.
- **Prompt tách khỏi code**: giữ nguyên convention của repo — system/
  planner prompt nằm trong `prompts/*.md`, không hardcode trong code Python.

## 6. Phân việc 4 người (map vào cấu trúc thư mục có sẵn)

| Người | Mảng | Thư mục | Việc chính |
|---|---|---|---|
| 1 | Knowledge/Data | `scripts/`, `data/` | Soạn/crawl dữ liệu bệnh viện (bảng giá, BHYT, giờ làm việc, khoa/bác sĩ), chunk, nạp Qdrant |
| 2 | Backend/Agent | `agent/`, `prompts/`, `backend/` | RAG pipeline, system prompt, guardrail cấp cứu, function-calling cho mock booking |
| 3 | Frontend | `frontend/` | Chat UI, hiển thị trích dẫn nguồn, nút hotline/đặt lịch, responsive |
| 4 | Fullstack/DevOps | `backend/`, `docker-compose.yml`, `docs/` | Postgres schema (hội thoại, appointment mock), Docker ổn định, seed data demo, slide kiến trúc |

## 7. Việc cần làm ngay (không phụ thuộc code, làm song song được)

1. Soạn 15–20 câu hỏi mẫu test (đặt lịch, BHYT, giá khám, giờ làm việc, và
   câu dạng cấp cứu như "tôi bị đau ngực dữ dội phải làm sao") — dùng làm
   golden test set.
2. Soạn system prompt + rule guardrail cấp cứu trong `prompts/`.
3. Chuẩn bị 10–15 tài liệu mẫu (giả lập nội dung website bệnh viện tim
   mạch thật) để nạp Qdrant.

---

**Khi agent code sinh code cho repo này, luôn ưu tiên:** (1) đúng phạm vi
MVP ở mục 4, (2) guardrail cấp cứu tách biệt LLM, (3) RAG có trích nguồn +
fallback an toàn, (4) giữ nguyên convention thư mục/prompt tách riêng đã có
sẵn trong repo.