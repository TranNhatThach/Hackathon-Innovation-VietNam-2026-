# Hanoi Heart Hospital - Frontend & AI Assistant Platform

**Status:** Active Development  
**Version:** 0.1.0  
**Branch:** FE (Frontend)  
**Last Updated:** July 17, 2026

> A comprehensive digital health platform for Hanoi Heart Hospital (Bệnh viện Tim Hà Nội) that streamlines patient journeys, enables real-time staff operations, and provides AI-powered chatbot assistance.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This project is a modern web-based platform designed to digitize and optimize the patient care journey at Hanoi Heart Hospital. It provides three key interfaces:

1. **Patient Portal** - Self-service check-in, appointment tracking, medication reminders, and FAQ support
2. **Staff Dashboard** - Real-time operations, patient workflow management, and analytics
3. **AI Assistant System** - Intelligent chatbot powered by RAG (Retrieval-Augmented Generation) for patient FAQs and staff operations support

The platform follows the official hospital patient care procedure (QT.25.01) from the Voluntary Unit 1 at the main facility, digitizing each step of the outpatient journey:

```
Pre-scheduling/Direct Visit → Reception → Registration & Documents
→ Insurance & Fees → Vital Signs Check → Doctor Examination
→ Lab/Clinical Procedures (if needed) → Results Review
→ Prescription/Follow-up Appointment/Hospitalization → Final Payment → Medication Pickup
```

---

## Key Features

### 👥 Patient Features
- **Smart Check-In** - Quick and intuitive check-in process with mobile-responsive design
- **Appointment Management** - View, schedule, and track appointments with real-time updates
- **Medical Profile** - Secure access to personal medical history and current prescriptions
- **Medication Reminders** - Automated notifications for medication schedules
- **AI-Powered FAQ Assistant** - Natural language chatbot for hospital procedures and common questions
- **Visit Tracking** - Real-time status updates during hospital visit
- **Procedure Information** - Detailed procedures guide with post-care instructions
- **Emergency Escalation** - Automatic flagging of concerning symptoms with 3-minute escalation protocol

### 👨‍⚕️ Staff Features
- **Operations Board (Kanban View)** - Drag-and-drop workflow for patient management across stages
- **Patient Dashboard** - Comprehensive view of patient status and medical history
- **Procedure Center** - Centralized procedure tracking and management
- **Staff Directory** - Quick access to colleague contacts and specializations
- **Human-in-the-Loop Dashboard** - Cases where AI cannot resolve sent for manual review
- **Staff Analytics** - Key metrics and operational insights
- **Internal Chatbot** - Access to procedures, metrics, and operational queries

### 🤖 AI & Automation
- **RAG-Powered Chatbot** - Retrieval-Augmented Generation for accurate, sourced responses
- **Multi-role Support** - Separate chat contexts for patients and staff
- **Human Handoff** - Intelligent escalation of complex queries to staff
- **Contextual Awareness** - Understanding of hospital workflows and Vietnamese healthcare standards

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15.2.4
- **UI Library:** React 19.0.0
- **Language:** TypeScript 5.8.2
- **Styling:** CSS Modules (with globals.css)
- **Testing:** Vitest 3.0.8 + Testing Library

### Backend/AI
- **Python 3.x** for AI agent implementation
- **RAG System** for document-based question answering
- **Tool-based Architecture** for AI operations

### Development Tools
- **Build:** Next.js built-in
- **Linting:** ESLint 9.22.0 with Next.js config
- **Type Checking:** TypeScript strict mode
- **Testing:** Vitest with jsdom environment
- **Package Manager:** npm

---

## Project Structure

```
.
├── app/                          # Next.js App Router - Pages & API Routes
│   ├── api/                      # Backend API routes
│   │   ├── appointments/route.ts
│   │   ├── cases/route.ts
│   │   ├── medications/route.ts
│   │   └── visits/route.ts
│   ├── appointments/             # Appointment management page
│   ├── assistant/                # AI chatbot page
│   ├── check-in/                 # Patient check-in page
│   ├── patient/                  # Patient portal pages
│   │   ├── profile/
│   │   └── medications/
│   ├── procedures/               # Hospital procedures info
│   ├── staff/                    # Staff-only pages
│   │   └── procedures/
│   ├── visit/[visitId]/          # Dynamic visit tracking page
│   ├── privacy/                  # Privacy policy page
│   ├── terms/                    # Terms of service page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
│
├── components/                   # Reusable React Components
│   ├── chat-drawer.tsx           # Chat UI component
│   ├── human-loop-dashboard.tsx  # Manual review interface
│   ├── operations-board.tsx      # Kanban-style staff view
│   ├── patient-faq.tsx           # FAQ interface
│   ├── patient-profile-complete.tsx
│   ├── patient-tools.tsx         # Patient utilities
│   ├── staff-analytics.tsx       # Analytics dashboard
│   ├── staff-directory.tsx       # Staff lookup
│   ├── staff-workflow.tsx        # Workflow management
│   ├── visit-companion.tsx       # Real-time visit support
│   └── *.test.tsx                # Component tests
│
├── lib/                          # Utility Functions & Mock Data
│   ├── mock-data.ts              # Sample patient/visit data
│   ├── analytics-data.ts         # Analytics datasets
│   ├── procedure-data.ts         # Procedure definitions
│   └── [utilities]
│
├── agent/                        # Python AI Agent System
│   ├── core/                     # Core agent logic
│   ├── rag/                      # RAG system & embedding logic
│   ├── tools/                    # Tool definitions for AI
│   └── __pycache__/
│
├── types/                        # TypeScript Type Definitions
│   └── index.ts
│
├── public/                       # Static assets
│
├── scripts/                      # Utility scripts
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── next.config.ts                # Next.js configuration
├── vitest.config.ts              # Test configuration
├── eslint.config.mjs             # Linting rules
│
├── hanoi_heart_hospital_ui_requirements.md  # Product requirements
├── AGENTS.md                     # AI agent documentation
└── README.md                     # This file
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+ (recommended 20+)
- npm or yarn
- Python 3.8+ (for AI agent)

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/TranNhatThach/Hackathon-Innovation-VietNam-2026-.git
cd Hackathon-Innovation-VietNam-2026-

# Checkout the FE branch
git checkout FE

# Install Node dependencies
npm install
```

### Step 2: Setup Environment Variables

```bash
# Create .env.local file in project root
cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# AI Agent Configuration (if using local Python agent)
PYTHON_AGENT_URL=http://localhost:8000

# Optional: Hospital Metadata
HOSPITAL_NAME=Bệnh viện Tim Hà Nội
HOSPITAL_CODE=HANOI_HEART_01
EOF
```

### Step 3: Verify Setup

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint
```

---

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Project Features by URL

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Public | Home page and introduction |
| `/check-in` | Patient | Pre-visit check-in and registration |
| `/appointments` | Patient | View and manage appointments |
| `/patient/profile` | Patient | Medical profile and history |
| `/patient/medications` | Patient | Current prescriptions and reminders |
| `/procedures` | Public | Hospital procedures information |
| `/assistant` | Public | AI chatbot for FAQs |
| `/staff/procedures` | Staff | Internal procedure documentation |
| `/visit/[visitId]` | Patient | Real-time visit tracking |
| `/privacy` | Public | Privacy policy |
| `/terms` | Public | Terms of service |

### Environment: Development vs. Production

The app uses mock data by default. To switch to real API:

1. Update `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
2. Configure backend API endpoints in `/app/api/**/route.ts`
3. Update TypeScript types in `/types/index.ts` if API schema changes

---

## Testing

### Run All Tests

```bash
npm test
```

### Watch Mode (Auto-rerun on file changes)

```bash
npm run test:watch
```

### Test Coverage

```bash
npm test -- --coverage
```

### Test Files

- `components/*.test.tsx` - Component unit tests
- Tests include UI interactions, data transformations, and workflow logic

---

## Deployment

### Build for Production

```bash
npm run build
```

### Verify Build

```bash
npm run type-check
npm run lint
```

### Static Export (if needed)

```bash
# Configure next.config.ts with:
# output: 'export'
npm run build
# Output in 'out/' directory
```

### Docker Deployment (Recommended)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm ci
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────┐
│         Browser / Mobile Client         │
├─────────────────────────────────────────┤
│        Next.js Frontend (React)         │
│  ├─ Pages (App Router)                  │
│  ├─ Components (Reusable UI)            │
│  ├─ Client State (React hooks)          │
│  └─ API Client Layer                    │
├─────────────────────────────────────────┤
│     Backend API Routes (Node.js)        │
│  ├─ /api/appointments                   │
│  ├─ /api/visits                         │
│  ├─ /api/medications                    │
│  └─ /api/cases                          │
├─────────────────────────────────────────┤
│  Python AI Agent (RAG + Tools)          │
│  ├─ Core Chat Logic                     │
│  ├─ RAG Document Retrieval              │
│  └─ Workflow Tools                      │
└─────────────────────────────────────────┘
```

### Data Flow

1. **Patient Interaction** → UI Component → API Route → Mock/Real Database
2. **Chat Query** → Chat Component → Backend API → Python Agent → RAG Engine → Response
3. **Staff Operations** → Operations Board → Workflow State → Database → Real-time Updates

---

## API Reference

### Appointments API

```typescript
GET  /api/appointments          // List all appointments
POST /api/appointments          // Create new appointment
GET  /api/appointments/:id      // Get specific appointment
PUT  /api/appointments/:id      // Update appointment
```

### Visits API

```typescript
GET  /api/visits                // List visits
POST /api/visits                // Create visit
GET  /api/visits/:id            // Get visit details
PUT  /api/visits/:id            // Update visit status
```

### Medications API

```typescript
GET  /api/medications           // List medications
GET  /api/medications/:patientId // Get patient medications
POST /api/medications           // Add medication
```

### Cases API

```typescript
GET  /api/cases                 // List cases (staff only)
POST /api/cases                 // Create case
PUT  /api/cases/:id/status      // Update case status
```

---

## Key Components Guide

### Chat Drawer
- **File:** `components/chat-drawer.tsx`
- **Purpose:** Floating chat UI for AI assistant
- **Props:** `isOpen`, `onClose`, `userRole` (patient/staff)

### Operations Board
- **File:** `components/operations-board.tsx`
- **Purpose:** Kanban-style workflow management for staff
- **Features:** Drag-and-drop, real-time updates

### Patient Profile
- **File:** `components/patient-profile-complete.tsx`
- **Purpose:** Comprehensive patient medical information
- **Data:** Medical history, current conditions, medications

### Human-Loop Dashboard
- **File:** `components/human-loop-dashboard.tsx`
- **Purpose:** Cases escalated from AI for manual review
- **Triggers:** Complex cases, ambiguous requests, emergency flags

---

## Contributing

### Branching Strategy

- `main` - Production-ready code
- `FE` - Frontend development (current)
- `feat/dat` - Feature-specific branches
- `gayto` - Development branch

### Code Style

- Use TypeScript for type safety
- Follow ESLint rules (`npm run lint`)
- Write tests for new components (`*.test.tsx`)
- Comment complex logic only

### Submitting Changes

1. Create feature branch from `FE`: `git checkout -b feat/your-feature`
2. Make changes and test: `npm run test`
3. Run linting: `npm run lint`
4. Commit with meaningful message: `git commit -m "feat: your feature description"`
5. Push and create Pull Request to `FE` branch

---

## Troubleshooting

### Port 3000 Already in Use
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

### TypeScript Errors
```bash
npm run type-check
```

### Build Failures
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Test Failures
```bash
npm run test:watch    # Run in watch mode to debug
```

---

## Documentation

- **Product Requirements:** See `hanoi_heart_hospital_ui_requirements.md`
- **AI Agent Details:** See `AGENTS.md`
- **Hospital Process:** See `QUY TRÌNH ĐÓN TIẾP BỆNH NHÂN VÀ KHÁM CHỮA BỆNH NGOẠI TRÚ TẠI KHU TỰ NGUYỆN 1 CS1.pdf`

---

## Performance Notes

- **Next.js Optimization:** Automatic code splitting and image optimization
- **Components:** Using React 19 with server components where applicable
- **Caching:** Mock data cached in `lib/`; consider Redis for production
- **AI:** RAG system indexed for fast document retrieval

---

## Security Considerations

⚠️ **Development Only** - This repo contains mock data and is for demonstration

For production deployment:
- ✅ Enable authentication (OAuth/JWT)
- ✅ Validate all API inputs server-side
- ✅ Encrypt sensitive data (medications, patient info)
- ✅ Use HTTPS only
- ✅ Implement rate limiting
- ✅ Follow HIPAA compliance if handling real patient data
- ✅ Audit all database access logs

---

## License

[Specify your license here]

---

## Contact & Support

**Project Lead:** TranNhatThach  
**Repository:** https://github.com/TranNhatThach/Hackathon-Innovation-VietNam-2026-

For questions or support:
1. Check existing issues on GitHub
2. Review documentation files above
3. Create a new GitHub issue with detailed context

---

**Last Updated:** July 17, 2026  
**Next Review:** [Set timeline]
