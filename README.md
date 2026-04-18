# 🚀 RepoMind AI

> **Production-grade AI system** that indexes any GitHub repository and answers developer questions with context-aware, cited responses — powered by GPT-4o + FAISS semantic search.

![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---|---|
| **GitHub Ingestion** | Shallow-clone any public or private repo via HTTPS or SSH |
| **Intelligent Chunking** | AST-based (Python/JS/TS), semantic (Markdown), sliding window fallback |
| **FAISS Semantic Search** | `IndexFlatIP` with cosine similarity, persisted to disk |
| **MMR Re-ranking** | Maximal Marginal Relevance for diverse, non-redundant results |
| **SSE Streaming** | Token-by-token streaming via Server-Sent Events |
| **Multi-intent Routing** | Auto-detects: explain / bug scan / README gen / file summary / general |
| **Source Citations** | Every answer includes file path + line range + syntax-highlighted snippet |
| **Bug Scanner** | Severity-classified findings: 🔴 CRITICAL / 🟡 WARNING / 🔵 INFO |
| **README Generator** | Auto-generates professional README with badges |
| **3-tier Caching** | Redis (query) + FAISS disk (index) + DB (summaries) |
| **Async Ingestion** | Celery + Redis background worker with retry logic |
| **Multi-repo** | Switch between indexed repos; namespaced FAISS indexes |

---

## 🏗️ Architecture

```
GitHub URL → Repo Cloner → File Filter → Code Chunker
         → Embedding Pipeline → FAISS Index → Persisted Storage
                                        ↓
User Query → Query Embedder → Similarity Search → MMR Re-rank
         → Context Builder → LLM Prompt → SSE Stream → Chat UI
```

### Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn (async) |
| Vector DB | FAISS `IndexFlatIP` (local, disk-persisted) |
| LLM / Embeddings | OpenAI GPT-4o-mini + `text-embedding-3-small` |
| Task Queue | Celery + Redis |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Cache | Redis (L1 query cache) |
| Frontend | Next.js 14 + Zustand + react-syntax-highlighter |
| Proxy | Nginx (prod) |

---

## 📁 Project Structure

```
repomind/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # Async SQLAlchemy
│   │   ├── models/              # ORM: Repository, ChatSession, ChatMessage
│   │   ├── routes/              # repo.py | chat.py | analysis.py
│   │   ├── services/
│   │   │   ├── github_service.py     # Shallow clone + progress
│   │   │   ├── chunking_service.py   # AST / sliding / semantic
│   │   │   ├── embedding_service.py  # OpenAI batch embed + FAISS
│   │   │   ├── retrieval_service.py  # Embed query + MMR + context
│   │   │   ├── llm_service.py        # Intent detect + streaming
│   │   │   └── cache_service.py      # Redis L1 cache
│   │   ├── utils/
│   │   │   ├── file_filter.py        # Extension + dir allowlists
│   │   │   ├── token_counter.py      # tiktoken utilities
│   │   │   └── prompt_templates.py   # All LLM prompt builders
│   │   └── workers/
│   │       └── ingestion_worker.py   # Celery async pipeline
│   ├── tests/
│   │   ├── test_chunking.py
│   │   ├── test_retrieval.py
│   │   └── test_api.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # Next.js 14 App Router
│       ├── components/          # RepoLoader | ChatWindow | MessageBubble | ...
│       ├── hooks/               # useStreamingChat | useRepoStatus
│       ├── store/               # Zustand chatStore
│       └── lib/api.ts           # Typed API client
├── nginx/nginx.conf
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- Redis (or Docker)
- OpenAI API key

### 1. Clone & configure

```bash
git clone <this-repo>
cd repomind
cp .env.example .env
# Edit .env — fill in OPENAI_API_KEY and SECRET_KEY
```

### 2. Backend (development)

```bash
cd backend

# Create virtual environment
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create data directories
mkdir -p data/faiss tmp/repos

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### 3. Celery Worker (separate terminal)

```bash
cd backend
source .venv/bin/activate
celery -A app.workers.ingestion_worker.celery_app worker --loglevel=info
```

### 4. Frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🐳 Docker (Production)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env ...

# Start all services
docker compose up -d

# View logs
docker compose logs -f backend worker

# Scale workers
docker compose up -d --scale worker=3
```

### Development with hot reload

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Services exposed:**
| Service | Port | Description |
|---|---|---|
| Frontend | 3000 | Next.js UI |
| Backend API | 8000 | FastAPI + Swagger at `/docs` |
| Nginx | 80 | Reverse proxy (prod) |
| Flower | 5555 | Celery monitoring |
| Redis | 6379 | Cache + broker |

---

## 🧪 Testing

```bash
cd backend
source .venv/bin/activate

# Run all tests with coverage
pytest tests/ -v --cov=app --cov-report=term-missing

# Run specific suites
pytest tests/test_chunking.py -v      # Chunking unit tests
pytest tests/test_retrieval.py -v     # Retrieval + MMR tests
pytest tests/test_api.py -v           # API integration tests
```

---

## 📡 API Reference

### Repository Endpoints

```
POST   /api/v1/repo/load              Load & index a GitHub repo
GET    /api/v1/repo/status/{repo_id}  Poll ingestion progress
GET    /api/v1/repo/list              List all indexed repos
DELETE /api/v1/repo/{repo_id}         Delete repo + index + history
```

### Chat Endpoints

```
POST /api/v1/chat/ask                 Ask a question (streaming SSE or JSON)
GET  /api/v1/chat/history/{sid}       Retrieve session message history
```

### Analysis Endpoints

```
POST /api/v1/analysis/bugs            Security & logic bug scan
POST /api/v1/analysis/readme          Auto-generate README.md
```

Full interactive docs at **`http://localhost:8000/docs`** (Swagger UI).

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | required | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `MAX_CONTEXT_TOKENS` | `6000` | LLM context budget |
| `TOP_K_RETRIEVAL` | `8` | Chunks retrieved per query |
| `GITHUB_ACCESS_TOKEN` | optional | PAT for private repos |
| `MAX_REPO_SIZE_MB` | `500` | Max repo size gate |
| `DATABASE_URL` | SQLite | Use `postgresql+asyncpg://…` for prod |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `FAISS_INDEX_DIR` | `./data/faiss` | Index storage root |
| `SECRET_KEY` | required | App secret (use `secrets.token_hex(32)`) |
| `DEBUG` | `false` | Enable debug mode + SQL echo |

---

## 🔐 Security Constraints

- API keys are **never** hardcoded — all from environment
- Repos are **never** sent raw to the LLM — always via RAG retrieval
- Every LLM response **must** include source citations
- All endpoints validate input with **Pydantic v2**
- Streaming is **cancellable** on client disconnect (AbortController + FastAPI disconnect detection)
- Non-root Docker users in all container images

---

## 🗺️ Roadmap

- [ ] Pinecone integration as alternative vector store
- [ ] GitHub webhook for auto re-indexing on push
- [ ] PostgreSQL full-text search hybrid retrieval
- [ ] Authentication (JWT / OAuth)
- [ ] Per-file tree view with on-click summaries
- [ ] VS Code extension

---

## 📄 Licence

MIT © 2025 — Built with FastAPI, FAISS, OpenAI, and Next.js.
