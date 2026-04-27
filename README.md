# Agentic TP Platform

> **AI-Powered Educational Platform for Programming Practicals**
> ENSET Challenge — Hackathon Submission

The **Agentic TP Platform** is an AI-powered educational system designed to transform how students complete practical programming assignments — known as **TPs** (*Travaux Pratiques*). It combines a modern Next.js web interface, a microservices backend, and a suite of specialized AI agents to deliver a fully guided, intelligent, and cheat-resistant coding environment.

🌐 **Live demo:** https://tp-front-seven.vercel.app/

---



## ✨ Highlights

| 🤖 **3 AI Agents** | 📚 **RAG-Grounded Knowledge** | 🛡️ **Anti-Cheat Mechanisms** | 📊 **Teacher Analytics** |
| :---: | :---: | :---: | :---: |

- **Personalized AI support** at every stage of the assignment lifecycle
- **Course-grounded responses** via a RAG system that reads the actual course materials
- **Academic integrity enforcement** through copy-paste prevention and session timing
- **Automated evaluation and teacher reporting**, reducing post-session workload

---

## 🧩 The Problem

Practical programming sessions are simultaneously the most valuable and the most difficult to supervise at scale:

| Pain Point | Current Impact | Platform Response |
| --- | --- | --- |
| No individual AI support | Students blocked, progress uneven | **Hint Agent** provides adaptive hints |
| Easy to copy solutions | Learning bypassed | Copy-paste disabled; IDE-only input |
| No end-of-session check | Understanding unverified | **Evaluation Agent** generates a quiz |
| Teacher workload | Manual grading, slow feedback | Automated report generation |

---

## 🏗️ System Architecture

The platform is a distributed system following a **microservices architecture**, containerised with Docker and orchestrated via Kubernetes (Minikube for development).

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js 14)                  │
│        Student Workspace  •  Teacher Dashboard          │
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│ Auth Service │   │ TP Mgmt Svc  │   │  Agent Gateway   │
│ (Spring Boot)│   │ (Spring Boot)│   │    (FastAPI)     │
└──────────────┘   └──────────────┘   └────────┬─────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                    ▼                    ▼
                 ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
                 │ Explanation     │  │   Hint Agent    │  │   Evaluation    │
                 │     Agent       │  │                 │  │     Agent       │
                 └─────────────────┘  └─────────────────┘  └─────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │  RAG Service         │
                                    │  (Spring AI +        │
                                    │   pgvector)          │
                                    └──────────────────────┘
```

### Layers

| Layer | Description |
| --- | --- |
| **Frontend** | Next.js application (TypeScript, SSR) serving the student workspace, teacher dashboard, and live HTML preview panel. |
| **Backend Services** | Two Spring Boot microservices handle authentication (Auth Service) and assignment lifecycle management (TP Management Service). |
| **AI Gateway** | A FastAPI Agent Gateway routes requests to the appropriate AI agent and manages communication with the RAG service. |
| **Infrastructure** | Docker + Kubernetes orchestration, optional Kafka message bus for asynchronous agent communication, and a PostgreSQL-backed vector database. |

---

## 🤖 The Three AI Agents

Each agent shares the same LLM backend but receives different system prompts, tool configurations, and RAG contexts tailored to its specific role.

### 1. Explanation Agent — *Onboarding*
Explains the TP statement before the student begins coding. Answers clarification questions about requirements, expected outputs, and concepts. **Deliberately constrained from providing any code** — only explanations and pointers.

### 2. Hint Agent — *In-Session Assistance*
Analyses the student's current code and provides a calibrated, **progressive hint**. Starts with high-level directional hints and gradually becomes more specific if the student remains stuck. Tracks hint history within a session to avoid repetition. **Explicitly prohibited from producing working code.**

### 3. Evaluation Agent — *Post-Session Assessment*
Generates a 3–5 question quiz based on the TP content and the student's code submission, then evaluates the student's answers to produce a final comprehension score. Closes the learning loop by testing whether the student can articulate **what they built and why**.

---

## 📚 RAG Knowledge System

All AI agent responses are grounded in course-specific knowledge using **Retrieval-Augmented Generation (RAG)**. This prevents hallucination, ensures curriculum alignment, and allows the platform to be re-deployed for any course simply by updating the knowledge base.

| Component | Choice |
| --- | --- |
| Embedding Model | `text-embedding-3-small` (OpenAI) or equivalent open-source model |
| Vector Store | **pgvector** (PostgreSQL extension) for dev; Pinecone for production scaling |
| RAG Framework | **Spring AI** — document loaders, chunking, embedding clients, vector store abstractions |
| Chunk Strategy | Recursive character-text-splitter with **512-token chunks** and **50-token overlap** |

Each document chunk is tagged with metadata (`course_id`, `tp_id`, `document_type`) to enable scoped retrieval — agents only retrieve context relevant to the active TP, preventing cross-contamination between assignments.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| Frontend | Next.js 14 (TypeScript) | SSR, performance, rich ecosystem |
| Code Editor | Monaco Editor | VS Code engine; syntax highlighting |
| Auth Service | Spring Boot 3 + Spring Security | JWT, role-based access control |
| TP Service | Spring Boot 3 + JPA | REST API, PostgreSQL persistence |
| Agent Gateway | FastAPI (Python) | Async I/O, ideal for LLM streaming |
| RAG Service | Spring AI + pgvector | Native Java RAG pipeline |
| LLM Provider | OpenAI GPT-4o / Anthropic Claude | SOTA reasoning for education |
| Message Bus | Apache Kafka *(optional)* | Async agent orchestration |
| Containerisation | Docker + docker-compose | Reproducible dev environment |
| Orchestration | Kubernetes / Minikube | Production-ready service scaling |
| Database | PostgreSQL | ACID, pgvector extension for RAG |

---

## 📁 Repository Structure

```
.
├── frontend/        # Next.js student workspace + teacher dashboard
├── backend/         # Spring Boot microservices (Auth + TP Management)
├── agents/          # FastAPI Agent Gateway and the 3 AI agents
├── rag-service/
│   └── spring-ai-rag/   # Spring AI RAG ingestion + retrieval pipelines
├── infra/           # Docker, Kubernetes manifests, deployment configs
└── docs/            # Architecture diagrams and project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18 and `npm` / `pnpm`
- **Java** 17+ and Maven
- **Python** 3.10+
- **Docker** and **docker-compose**
- **PostgreSQL** with the `pgvector` extension
- An **OpenAI** or **Anthropic** API key

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/embedding3x/enset-challenge-submission-embedding3x.git
cd enset-challenge-submission-embedding3x

# 2. Spin up the full stack with Docker Compose
cd infra
docker-compose up -d

# 3. Install and run the frontend
cd ../frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

> ⚠️ Configure your environment variables (LLM API keys, database URL, JWT secret) in the `.env` files of each service before running.

---

## 👥 User Workflows

### 🧑‍🏫 Teacher Workflow
1. **Create TP** — write the assignment in HTML/Markdown, set duration, configure anti-cheat
2. **Upload Materials** — lecture slides, notes, code references (ingested by RAG)
3. **Publish TP** — share session link with students
4. **Monitor Session** — live dashboard of student progress and hint usage
5. **Review Reports** — per-student code, quiz performance, hint history, comprehension summary

### 🧑‍🎓 Student Workflow
1. **Phase 1 — Orientation** — Explanation Agent presents the assignment; the student can ask clarification questions before the timer starts
2. **Phase 2 — Coding** — Monaco IDE with live HTML preview; copy-paste disabled; timer running
3. **Phase 3 — Hint Request** — Hint Agent analyses current code and returns a progressive, targeted hint
4. **Phase 4 — Submission** — final code snapshot saved
5. **Phase 5 — Evaluation** — Evaluation Agent generates a 3–5 question quiz; auto-scored; report sent to teacher

---

## ✅ MVP Status

| Feature | Status |
| --- | --- |
| User registration and JWT authentication | ✅ Complete |
| Teacher TP creation interface | ✅ Complete |
| Student workspace with Monaco IDE | ✅ Complete |
| Live HTML preview panel (sandboxed iframe) | ✅ Complete |
| Explanation Agent | ✅ Complete |
| Hint Agent (code-aware) | ✅ Complete |
| RAG ingestion + retrieval pipelines | ✅ Complete |
| Copy-paste prevention | ✅ Complete |
| Session countdown timer | ✅ Complete |
| Evaluation Agent (quiz generation) | ✅ Complete |
| Quiz scoring and report generation | ✅ Complete |
| Teacher dashboard — student reports | 🟡 Partial |
| Kafka async agent communication | 🟡 In Progress |
| Full Kubernetes deployment manifests | 🟡 Partial |

---

## ⚠️ Current Limitations

- **HTML-only assignments** — backend languages (Python, Java) are not yet supported
- **No code execution sandbox** — evaluation relies on the live preview and AI analysis
- **LLM cost** — rate-limiting and caching strategies not yet implemented
- **Synchronous Kafka pipeline** — fully async path partially implemented
- **Limited anti-cheat** — copy-paste prevention can be bypassed via DevTools

---

## 🔮 Roadmap

### Short-Term (1–3 months)
- Multi-language support via secure server-side execution sandbox (Judge0 / Piston)
- Full Kafka integration for async agent communication
- Real-time session monitoring with hint heatmaps and progress indicators
- Hybrid search (keyword + semantic) and re-ranking in the RAG pipeline

### Medium-Term (3–9 months)
- Adaptive hint depth via reinforcement learning
- Code similarity-based plagiarism detection across cohorts
- LMS integration (Moodle, Blackboard, Canvas) via LTI
- Offline mode using locally-hosted open-source LLMs

### Long-Term Vision
- Auto-generated TPs from learning objectives
- Cross-session longitudinal student profiles
- AI-guided structured peer review

---

## 🏆 Innovation

- **Multi-agent orchestration** in an educational context — three specialised agents instead of one monolithic AI
- **Session-scoped RAG** — retrieval scoped to the active TP and course
- **Code-aware hinting** — Hint Agent receives the student's live code as input
- **Evaluation-by-construction** — quiz questions derived from the student's *own* code submission

---

## 📄 License

Hackathon submission — see the `docs/` folder for the full technical report.

---

> ***Built with purpose. Grounded in knowledge. Guided by AI.***
> *Agentic TP Platform — ENSET Hackathon 2025*
