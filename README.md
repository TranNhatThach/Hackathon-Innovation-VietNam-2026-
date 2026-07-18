# 🚀 Hanoi Heart Hospital - AI Front Desk Platform
### *Vietnam AI Innovation Challenge 2026 — AI-Native Platform Starter Kit*

[![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-teal.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-compose-blue.svg)](https://www.docker.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-red.svg)](https://qdrant.tech/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An intelligent, trustworthy, and deployable AI Front Desk platform designed to assist patients throughout their healthcare journey at the **Hanoi Heart Hospital (Bệnh viện Tim Hà Nội)**. By combining grounded medical knowledge, clinical operations workflows (specifically the **QT.25.01 Outpatient Admission Protocol**), task-oriented AI agent tool calling, and safety-first decision support, this application provides an end-to-end prototype for hospital administration and patient experience.

---

## 🏗️ System Architecture & Workflow

The platform consists of a responsive Next.js frontend, a FastAPI backend orchestrator, and an agent system running on **Google ADK 2.0** rules, backed by **FPT AI Factory** LLMs & vector embeddings.

### Flowchart: Query Execution Loop
```
                                        [ User Query ]
                                               │
                                               ▼
                                      [ FastAPI Backend ]
                                               │
                                 (Real-Time Guardrail Check)
                                               │
                       ┌───────────────────────┴──────────────────────┐
                       │ Emergency Keywords?                          │ No Emergency
                       ▼ Yes                                          ▼
             [ Emergency Warning ]                            [ Google ADK Agent ]
         (Bypass LLM, direct to 115)                                  │
                                                                      ├────────────────────────────┐
                                                                      │ Greeting/Politeness        │ Appointment/Booking
                                                                      ▼                            ▼
                                                                [ System Prompt ]          [ Tool Execution Loop ]
                                                                 (Bypass RAG)              - get_doctor_schedule()
                                                                      │                    - book_appointment()
                                                                      │                            │
                                                                      ▼                            ▼
                                                              [ FPT AI Client ]            [ FPT AI Client ]
                                                                      │                            │
                                                                      ▼                            ▼
                      ┌─────────────────────────────────────── [ Stream Response ] ◄───────────────┘
                      │ (Informational RAG Query)
                      ▼
             [ Hybrid Search Query ]
             - Dense Vector (1024-dim)
             - Sparse Keyword (MatchText)
                      │
                      ▼
             [ RRF Reciprocal Fusion ]
                      │
                      ▼
             [ LLM Reranking (FPT) ]
                      │
            ┌─────────┴─────────┐
            ▼ Docs Found        ▼ No Docs Found
         [ Strict RAG Mode ]  [ Flexible Mode ]
         - Strict Citations   - General Knowledge
         - Context Bounded    - Caveats & Warning
            │                   │
            └─────────┬─────────┘
                      ▼
              [ FPT AI Client ]
                      │
                      ▼
             [ Stream Response ]
```

### Component Breakdown
1. **Frontend (Next.js 16 + React 19)**: Fully responsive interface with glassmorphic cards, live queue tracking, and chat assistants for both patients (external FAQs) and hospital staff (internal procedure inquiries & operational logs).
2. **Backend (FastAPI)**: Coordinates API routes, implements SQLite/PostgreSQL schema migrations, executes real-time emergency guardrails, and provides full stream-handling routes for OpenAI-compatible endpoints.
3. **Agent Core (Google ADK 2.0)**: Manages model system prompts, implements flexible/strict context loading, and runs recursive function-calling loops for tools.
4. **RAG Pipeline**: Integrates Qdrant vector store with FPT AI Factory’s `Vietnamese_Embedding` model (1024 dimensions) for hybrid search retrieval, Reciprocal Rank Fusion (RRF), and active LLM-based reranking.
5. **Database (PostgreSQL & Redis)**: Relational tables store full user chat session history; Redis manages caching layers, rate limiting, and temporary status locks.

---

## 📁 Repository Structure

```filepath
├── FE/                              # React + Next.js App Router Frontend
│   ├── app/                         # App page routing (patient homepage, appointments, visit companion)
│   │   ├── appointments/            # Booking registration page
│   │   ├── assistant/               # Patient AI FAQ chatbot page
│   │   ├── check-in/                # Visit check-in simulation
│   │   ├── visit/                   # Live queue status and room tracking (Companion)
│   │   ├── staff/                   # Internal staff operations workspace & Kanban board
│   │   └── globals.css              # Custom styled premium CSS (glassmorphism & responsive)
│   ├── components/                  # Shared React components (chat, panels, shells)
│   └── lib/                         # Mock data & API endpoint hooks
├── backend/                         # FastAPI Application server
│   └── app/
│       ├── routes/
│       │   ├── chat.py              # Multi-agent chat router (patient FAQ / internal staff helper)
│       │   └── documents.py         # RAG PDF/Markdown uploader & parser
│       ├── database.py              # PostgreSQL database engine and session
│       ├── models.py                # SQL Alchemy schemas (conversations & messages)
│       └── services.py              # DB operation services (conversation history persistence)
├── agent/                           # Google ADK 2.0 Inspired Agent core
│   ├── core/
│   │   ├── adk_agent.py             # ADKAgent & Tool wrapper classes, execution & stream loops
│   │   ├── fpt_client.py            # FPT AI Factory OpenAI-compatible API wrapper
│   │   └── guardrails.py            # Emergency cardiovascular keywords validator
│   ├── rag/
│   │   ├── embeddings.py            # FPT `Vietnamese_Embedding` caller & testing dummy vector generator
│   │   └── rag_pipeline.py          # Dense/Sparse Hybrid Search, RRF, & Prompt-based LLM Reranking
│   ├── tools/
│   │   └── tools.py                 # Doctor schedules & appointment registration hooks
│   └── prompts/                     # Externalized System prompt configurations (.md files)
│       ├── system.md                # System prompt for Patient AI Assistant (customer service)
│       └── employee.md              # System prompt for Staff Internal Coordinator (operations)
├── data/                            # Raw data store for hospital regulation documents
│   └── raw/                         # Raw text/markdown files for RAG database indexing
├── scripts/                         # Database migration, seeding, and hybrid evaluation scripts
│   ├── migrate_db.py                # Initial database migration script
│   ├── seed.py                      # Parses data/raw/ and index vectors into Qdrant collection
│   ├── import_file.py               # CLI tool to import, chunk, embed, and index a single file
│   ├── test_hybrid_rag.py           # Evaluates vector retrieval, keyword matching, and Reranker
│   └── test_conversation_history.py # Verifies PostgreSQL message saving & retrieval
├── Makefile                         # Unified CLI commands runner
└── docker-compose.yml               # Container configurations (Web, API, Postgres, Qdrant, Redis)
```

---

## ⚙️ Core Technical Features

### 1. Safety-First Guardrails (Emergency Mode)
For cardiovascular symptoms (e.g., chest pain, acute dyspnea, loss of consciousness, cold sweating), the backend instantly halts the LLM generation loop:
* **Immediate Redirection**: Serves a structured alert directing patients to call **115** or the hospital's Emergency Hotline (**0243.8248362**).
* **Prevention of Delay**: Prevents AI hallucination or conversation lag in critical life-threatening moments.

### 2. High-Precision Hybrid RAG Pipeline
* **Dense Vector Search**: Qdrant query matches on FPT AI Factory `Vietnamese_Embedding` vectors.
* **Sparse Keyword Search**: Regex matching filters run parallel over metadata payloads to capture abbreviations (e.g., *BHYT*) and official document codes (e.g., *QT.25.01*).
* **Reciprocal Rank Fusion (RRF)**: Merges the scores of vector and keyword results:
  $$RRF\_Score(d) = \sum_{m \in M} \frac{1}{60 + r_m(d)}$$
* **LLM Reranker**: The final candidate chunks are sent to FPT's model in a structured ranking prompt to return the top 3 most relevant segments.
* **Dynamic Mode Selection**:
  * **Strict RAG Mode**: If matching documents are found, responses are strictly bounded by document contexts and require exact source citation.
  * **Flexible Mode**: If no matching documents are found, responses are composed of general hospital knowledge, accompanied by an advice warning to contact hospital support directly.

### 3. Google ADK-Style Tools (Function Calling)
* `get_doctor_schedule`: Resolves physician slots by checking names and dates.
* `book_appointment`: Persists scheduled appointment logs back to database fields.

### 4. Conversation History Persistence
Saves all inputs, generated outputs, tool calls, and model metadata inside relational tables (`conversations`, `messages`).
Allows complete multi-turn conversation memory, chat restoration, and user session clean-up.

---

## ⚡ Quick Start

### 1. Prerequisites
Make sure you have installed:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* Python 3.10 or 3.11 (if running locally without containers)
* `make` (Optional, for easy command shortcuts)

### 2. Setup Environment Variables
Clone the configuration parameters by copying `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the API keys provided by the challenge sponsors:
* `FPT_AI_FACTORY_API_KEY`: API key for FPT AI Factory.
* `FPT_AI_FACTORY_BASE_URL`: Endpoint url (usually `https://api.fpt.ai/v1`).
* `FPT_AI_FACTORY_MODEL`: The LLM name supplied at the event.

### 3. Launch the Stack
Start all services (Next.js, FastAPI, PostgreSQL, Redis, Qdrant) in detached mode:
```bash
make up
# Or: docker compose up -d --build
```
Verify the stack status:
```bash
make ps
```

The services will be available at:
* **Frontend Portal (Next.js)**: [http://localhost:3000](http://localhost:3000)
* **Backend Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Qdrant DB Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

### 4. Initialize Database & Seed Documents
Index raw hospital regulations and outpatient protocols into the Vector database and run SQL migrations:
```bash
# 1. Run migrations
docker compose exec backend python scripts/migrate_db.py

# 2. Seed data
make seed
# Or: docker compose exec backend python scripts/seed.py
```

### 5. CLI: Import Custom Documents
To ingest additional hospital procedures or documents on the fly:
```bash
docker compose exec backend python scripts/import_file.py data/raw/your_new_document.md
```

---

## 🧪 Testing & Evaluation

Run the automated integration tests to verify RAG performance and database serialization:

```bash
# Test 1: Verify hybrid search, RRF merging, and LLM reranking
docker compose exec backend python scripts/test_hybrid_rag.py

# Test 2: Verify PostgreSQL multi-turn chat session saving and deleting
docker compose exec backend python scripts/test_conversation_history.py

# Run all backend unit tests
make evaluate
```

---

## 🛠️ Makefile Commands

| Command | Action |
|:---|:---|
| `make build` | Builds all docker containers in the docker compose file |
| `make up` | Boots up the entire stack (Next.js, FastAPI, Postgres, Redis, Qdrant) |
| `make down` | Shuts down all containers and networks |
| `make ps` | Displays the status of running containers |
| `make logs` | Streams logs from all active containers |
| `make clean` | Drops all active containers, removes database volumes, and deletes Pycache files |
| `make seed` | Creates the Qdrant schema and embeds files located in `data/raw` |
| `make evaluate` | Runs the backend unit/integration evaluation test suites |

---

## 👥 Members & Contributors

* **Tran Nhat Thach** - [GitHub](https://github.com/TranNhatThach) (Team Lead)
* **Nguyen Ngoc Minh Tam** - [GitHub](https://github.com/taminguyen04) (Project Manager)
* **Tran Trung Hieu** - [GitHub](https://github.com/dat-nnguyen) (AI Engineer / Backend Developer)
* **Nguyen Tuan Dat** - [GitHub](https://github.com/kutephomaique) (Frontend Engineer / Fullstack Developer)


---

## 📄 License
This repository is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
