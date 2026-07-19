# 🚀 Hanoi Heart Hospital - AI Front Desk Platform
### *Vietnam AI Innovation Challenge 2026 — Advanced AI-Native Patient Care Platform*

[![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-teal.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2+-black.svg)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-compose-blue.svg)](https://www.docker.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-red.svg)](https://qdrant.tech/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An intelligent, trustworthy, and deployable AI Front Desk platform designed to assist patients throughout their healthcare journey at the **Hanoi Heart Hospital (Bệnh viện Tim Hà Nội)**. By combining grounded medical knowledge, clinical operations workflows (specifically the **QT.25.01 Outpatient Admission Protocol**), task-oriented AI agent tool calling, and safety-first decision support, this application provides an end-to-end prototype for hospital administration and patient experience.

---

## 🏗️ System Architecture & Workflow

The platform consists of a responsive Next.js frontend, a FastAPI backend orchestrator, and an agent system running on **Google ADK 2.0** rules, backed by **FPT AI Factory** LLMs & vector embeddings.

### Flowchart: Query & Voice Execution Loop
```
                                        [ User Query / Voice Input ]
                                                     │
                                                     ▼
                                            [ FastAPI Backend ]
                                                     │
                                       (Real-Time Guardrail Check)
                                                     │
                             ┌───────────────────────┴──────────────────────┐
                             │ Emergency?                                   │ No Emergency
                             ▼ Yes                                          ▼
                   [ Emergency Warning ]                            [ Google ADK Agent ]
               (Bypass LLM, direct to 115)                                  │
                                                                            ├────────────────────────────┐
                                                                            │ Greeting/Politeness        │ Appointment/Booking
                                                                            ▼                            ▼
                                                                      [ System Prompt ]          [ Tool Execution Loop ]
                                                                       (Bypass RAG)              - get_doctor_schedule()
                                                                            │                    - book_appointment()
                                                                            │                    - escalate_to_human()
                                                                            │                            │
                                                                            ▼                            ▼
                                                                    [ FPT AI Client ]            [ PostgreSQL DB ]
                                                                            │                            │
                                                                            ▼                            ▼
                            ┌─────────────────────────────────────── [ Stream Response ] ◄───────────────┘
                            │ (Informational RAG Query)
                            ▼
                   [ Hybrid Search Query ]
                   - Dense Vector (Qdrant)
                   - Sparse Keyword (Regex)
                            │
                            ▼
                   [ RRF Reciprocal Fusion ]
                            │
                            ▼
                   [ BGE Reranking (FPT) ]
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
                   [ Audio Synthesized ] (FPT TTS)
                            │
                            ▼
                   [ Stream Response / MP3 ]
```

---

## 🌟 Core Technical Features

This platform is upgraded to be production-ready with 6 major pillars:

### 1. 📂 Real-time PostgreSQL Synchronization
*   All AI Agent tools (`book_appointment`, `get_doctor_schedule`, `search_doctors`) are fully integrated with PostgreSQL.
*   `book_appointment` automatically checks patient registration by phone, saves the booking, registers a live `Visit` (stage="SCHEDULED"), and logs `VisitJourneyEvent` in the database. All AI-scheduled bookings instantly populate the staff Kanban dashboard.

### 2. 🔕 Human-in-the-Loop & Mute Control
*   **Escalation Tool**: Bypasses AI if the query is too complex or if the user requests human assistance, saving an escalation ticket into the `human_cases` table.
*   **AI Agent Mute Control**: The backend `/api/chat` router checks if the patient has an active `HumanCase` in the database. If so, it silences the AI Agent and routes the chat history to the staff queue for manual takeover.

### 3. 🎙️ Speech & Voice Interaction (TTS & STT)
*   **Speech-to-Text (STT) - Client-side native Web Speech API**: Uses browser-native speech recognition (`window.SpeechRecognition`), allowing users to speak Vietnamese clearly and converting it to text instantly on the client side with zero server overhead.
*   **Text-to-Speech (TTS) - Backend FPT AI Factory**: Integrates FPT's premium TTS engine (`FPT.AI-VITs` model with `"banmai"` voice model) through a secure POST endpoint `/api/speech/synthesize` on the backend, streaming compressed MP3 audio chunks back to the client Web Audio element.

### 4. 🔍 High-Precision Hybrid RAG Pipeline & BGE Reranker
*   **Dense Vector Search**: Qdrant query matches on FPT AI Factory `Vietnamese_Embedding` vectors.
*   **Sparse Keyword Search**: Regex matching filters run parallel over metadata payloads to capture abbreviations (e.g., *BHYT*) and official codes.
*   **FPT BGE Reranker Integration**: Candidate chunks are sent to the dedicated **BGE-Reranker-v2-m3** API hosted on FPT AI Factory to rank documents with high multilingual Vietnamese accuracy and minimal latency.
*   **Safe Fallback**: If the reranker API is unavailable, the pipeline automatically falls back to prompt-based LLM ranking.

### 5. 🚨 Safety-First Guardrails (Hybrid Emergency Mode)
For cardiovascular symptoms (e.g., chest pain, acute dyspnea, loss of consciousness, cold sweating), the backend instantly halts the LLM generation loop:
*   **Fast Keyword Match (Regex)**: Instantly matches common cardiovascular emergency terms in the user query.
*   **Semantic Similarity Guardrail**: Computes the cosine similarity between the user's query embedding (via FPT `Vietnamese_Embedding`) and cached emergency templates. If similarity exceeds `0.52`, it immediately serves the emergency redirection warning.
*   **Emergency Redirection**: Serves a structured alert directing patients to call **115** or the hospital's Emergency Hotline (**0243.8248362**).

### 6. 🔒 Transparent Column-Level Encryption (Compliance & Security)
*   Implements transparent, symmetric data encryption using a base64-encoded XOR cipher.
*   Automatically encrypts sensitive patient columns (`display_name`, `phone`, `address`) and medication instructions (`instruction`) at rest in PostgreSQL, while decrypting them on-the-fly when loaded into memory in Python.
*   Compatible with pre-existing plain text seed data (graceful fallback).

---

## 📁 Repository Structure

```filepath
├── FE/                              # React + Next.js App Router Frontend
│   ├── app/                         # App page routing
│   │   ├── appointments/            # Booking registration page
│   │   ├── assistant/               # Patient AI FAQ chatbot page
│   │   ├── check-in/                # Patient self check-in flow page
│   │   ├── patient/                 # Patient portal (medications, reminders & profile)
│   │   ├── procedures/              # Hospital outpatient admission guidelines (QT.25.01)
│   │   ├── staff/                   # Internal staff operations workspace & Kanban board
│   │   ├── visit/                   # Live queue status & patient companion page
│   │   └── globals.css              # Custom styled premium CSS (glassmorphism & responsive)
│   ├── components/                  # Shared React components (chat, panels, shells)
│   ├── hooks/
│   │   └── use-speech.ts            # Custom React hook for unified browser STT & FPT TTS
│   └── lib/                         # Mock data & API endpoint hooks
├── backend/                         # FastAPI Application server
│   └── app/
│       ├── routes/
│       │   ├── appointments.py      # Bookings and reservations endpoints
│       │   ├── chat.py              # Multi-agent chat router (patient FAQ / internal staff helper)
│       │   ├── doctors.py           # Doctor schedules query endpoints
│       │   ├── documents.py         # RAG PDF/Markdown uploader & parser
│       │   ├── human_cases.py       # Human takeover and escalation routing
│       │   ├── speech.py            # Text-To-Speech FPT AI Factory proxy endpoint
│       │   └── visits.py            # Live queue / Companion journey tracking endpoints
│       ├── database.py              # PostgreSQL database engine and session
│       ├── models.py                # SQL Alchemy schemas (conversations & messages)
│       ├── security.py              # Symmetric column-level encryption functions
│       ├── worker.py                # Background asyncio medication/appointment reminder loop
│       └── services.py              # DB operation services (conversation history persistence)
├── agent/                           # Google ADK 2.0 Inspired Agent core
│   ├── core/
│   │   ├── adk_agent.py             # ADKAgent & Tool wrapper classes, execution & stream loops
│   │   ├── fpt_client.py            # FPT AI Factory OpenAI-compatible API wrapper
│   │   └── guardrails.py            # Emergency cardiovascular keywords validator
│   ├── rag/
│   │   ├── embeddings.py            # FPT `Vietnamese_Embedding` caller
│   │   └── rag_pipeline.py          # Dense/Sparse Hybrid Search, RRF, & BGE Reranking
│   ├── tools/
│   │   └── tools.py                 # PostgreSQL doctor schedules & appointment tools
│   └── prompts/                     # Externalized System prompt configurations (.md files)
```

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
*   `FPT_AI_FACTORY_API_KEY`: API key for FPT AI Factory.
*   `FPT_AI_FACTORY_BASE_URL`: Endpoint url (usually `https://mkp-api.fptcloud.com`).
*   `FPT_AI_FACTORY_MODEL`: The LLM name supplied at the event (e.g. `GLM-5.2`).
*   `ENCRYPTION_KEY`: A secure 64-character hex key for patient data encryption (e.g. generated key in `.env.example`).
*   `FPT_TTS_MODEL` *(Optional)*: The Text-to-Speech model name (defaults to `FPT.AI-VITs`).
*   `FPT_TTS_VOICE` *(Optional)*: The voice speaker configuration (defaults to `banmai`).

### 3. Launch the Stack
Start all services (Next.js, FastAPI, PostgreSQL, Redis, Qdrant) in detached mode:
```bash
make up
# Or: docker compose up -d --build
```

The services will be available at:
* **Frontend Portal (Next.js)**: [http://localhost:3000](http://localhost:3000)
* **Backend Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Qdrant DB Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

### 4. Initialize Database & Seed Documents
Index raw hospital regulations and outpatient protocols into the Vector database and run SQL migrations:
```bash
# 1. Run migrations and seed PostgreSQL
python scripts/seed_postgres.py

# 2. Seed Qdrant collection
python scripts/seed.py
```

---

## 🧪 Testing & Evaluation

Run the automated integration tests to verify RAG performance, reranker accuracy, guardrail triggers, and database serialization:

```bash
# Test 1: Verify hybrid search, RRF merging, and BGE reranking
python scripts/test_hybrid_rag.py

# Test 2: Verify PostgreSQL multi-turn chat session saving and deleting
python scripts/test_conversation_history.py
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
