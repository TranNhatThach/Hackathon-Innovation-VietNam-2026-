# 🚀 Hackathon AI Starter Kit - Vietnam AI Innovation Challenge 2026

[![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-teal.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-compose-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Actions CI](https://img.shields.io/badge/CI-GitHub%20Actions-orange.svg)](#)

A premium, AI-native template repository configured for the **Vietnam AI Innovation Challenge 2026**. Designed to skip infrastructure setup and start writing core logic immediately.

---

## 🏗️ System Architecture

```
                       ┌──────────────────────┐
                       │   React + Tailwind   │ (Frontend / Client)
                       └──────────┬───────────┘
                                  │ (HTTP / WebSocket)
                       ┌──────────▼───────────┐
                       │     FastAPI App      │ (Backend Server)
                       └─────┬──────────┬─────┘
                             │          │
         ┌───────────────────┘          └───────────────────┐
         │                                                  │
┌────────▼──────────┐                            ┌──────────▼──────────┐
│   Google ADK 2.0  │                            │     PostgreSQL      │ (Relational Data)
│    (AI Agent)     │                            └─────────────────────┘
└────────┬──────────┘
         │
         ├───────────────────┬───────────────────┐
         │ (OpenAI-Compat)   │                   │ (Cache)
┌────────▼──────────┐ ┌──────▼──────┐     ┌──────▼──────┐
│  FPT AI Factory   │ │   Qdrant    │     │    Redis    │
│  (Sponsor LLM)    │ │ (Vector DB) │     │ (Rate/Lock) │
└───────────────────┘ └─────────────┘     └─────────────┘
```

---

## ⚡ Quick Start

### 1. Requirements
Ensure you have installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Make (Optional, for Makefile shortcuts)

### 2. Setup environment variables
Copy the template `.env.example` file and fill in your API keys (FPT AI Factory, etc.):
```bash
cp .env.example .env
```

### 3. Spin up the whole stack
Run the following command to build and launch all containers (Frontend, Backend, PostgreSQL, Redis, Qdrant):
```bash
make up
# Or using standard Docker Compose:
# docker compose up -d --build
```
The services will be available at:
- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Qdrant Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

---

## 📁 Repository Structure

*   `frontend/` - React + Vite + Tailwind CSS landing & chat interface.
*   `backend/` - FastAPI with standard DB, caching, vector indexing endpoints.
*   `agent/` - LLM Agent configurations using **Google ADK 2.0** models and FPT AI clients.
*   `prompts/` - Externalized system and planner prompt Markdown files.
*   `scripts/` - Database seeding, data crawling, and model validation scripts.
*   `docs/` - Architecture diagrams, slides, and demo recordings.

---

## 👥 Members

*   **Tran Nhat Thach** - [GitHub](https://github.com/TranNhatThach) (Leader)
*   **Tran Trung Hieu 2** - [GitHub](https://github.com/dat-nnguyen) (AI Developer)
*   **Tuan Dat** - [GitHub](https://github.com/kutephomaique) (Fullstack Developer)

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


# GOAL 
Develop an intelligent, trustworthy, and deployable AI Front Desk platform that assists patients throughout their healthcare journey by combining grounded medical knowledge, hospital system integration, task-oriented AI agents, and safety-first decision support.