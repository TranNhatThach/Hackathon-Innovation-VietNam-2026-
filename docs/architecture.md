# Architecture Design Document

This document outlines the software components and integration design of the AI-native application for the **Vietnam AI Innovation Challenge 2026**.

## 1. System Components

The stack consists of five primary components connected inside a unified Docker network:

1.  **Frontend (React + Vite)**
    *   Responsive single-page interface styled with Tailwind CSS.
    *   Lucide react icons and glassmorphic panels.
    *   Communicates with the backend using WebSockets or REST requests. Reads streamed HTTP bodies using JavaScript reader streams.
2.  **Backend (FastAPI)**
    *   High-performance Python web framework.
    *   Handles authentication, API routing, and orchestration.
    *   Interfaces with PostgreSQL, Redis, and Qdrant database clients.
3.  **Agent Module (Google ADK 2.0)**
    *   Implements agent classes (`ADKAgent`) and tools (`Tool`).
    *   Separate prompt directory keeping System instruction files out of python code blocks.
4.  **FPT AI Factory (LLM Client)**
    *   Orchestrated via `agent/fpt_client.py`.
    *   Uses OpenAI-compatible configuration settings.
5.  **Data Stores**
    *   **PostgreSQL**: Relational structured information storage.
    *   **Redis**: Caching, state, and rate limits.
    *   **Qdrant**: Vector storage engine hosting cosine similarity-based RAG documents.

---

## 2. Dynamic Run-loop Sequence

Below is the execution flowchart when a client submits a chat request:

```
[User Input] 
     │
     ▼
[Frontend UI] ─────────(POST /api/chat)─────────► [FastAPI Backend]
                                                         │
                                                         ▼
                                                  [Google ADK Agent]
                                                         │
                                     ┌───────────────────┴───────────────────┐
                                     ▼                                       ▼
                             [Load system.md]                        [Planner Agent]
                                     │                                       │
                                     ▼                                       ▼
                             [FPT AI Client]                     [Tool / Retrieval Loop]
                                     │                                       │
                         (Chat Completion Stream)                            ▼
                                     │                                [Qdrant Search]
                                     ▼                                       │
                                [Stream back] ◄──────────────────────────────┘
```
