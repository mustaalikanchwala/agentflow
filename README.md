# AgentFlow – Agentic Task Automation API

A Node.js/TypeScript REST API featuring agentic LLM workflows powered by the Google Gemini API.
The AI autonomously plans, executes, and chains multi-step tasks via defined function schemas.

**Tech Stack:** Node.js · TypeScript · Express.js · PostgreSQL · Gemini API · JWT · Docker · GCP Cloud Run

---

## File Structure

```
agentflow/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts      # register, login, me
│   │   ├── tasks.controller.ts     # CRUD + admin
│   │   └── agent.controller.ts     # start/get agent runs
│   ├── middleware/
│   │   └── auth.ts                 # JWT authenticate + RBAC authorize
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── tasks.routes.ts
│   │   └── agent.routes.ts
│   ├── services/
│   │   └── agent.service.ts        # Gemini tool-calling agentic loop
│   ├── db/
│   │   └── pool.ts                 # node-postgres connection pool
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── utils/
│   │   ├── schemas.ts              # Zod validation schemas
│   │   └── response.ts             # Structured response helpers
│   └── index.ts                    # Express app entry point
├── migrations/
│   ├── 001_initial_schema.sql      # users, tasks, agent_runs tables
│   └── run.ts                      # Migration runner
├── .github/workflows/
│   └── deploy.yml                  # GitHub Actions CI/CD
├── Dockerfile
├── .dockerignore
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/agentflow.git
cd agentflow
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL: your local postgres URL
# - JWT_SECRET: any random string (e.g. openssl rand -hex 32)
# - GEMINI_API_KEY: get free key at https://aistudio.google.com
```

### 3. Create database & run migrations

```bash
createdb agentflow           # or use psql
npm run migrate
```

### 4. Start development server

```bash
npm run dev
# API running at http://localhost:3000
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (auth required) |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks` | List tasks (filter: ?status=&priority=) |
| GET | `/api/tasks/:id` | Get task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/admin/all` | All users' tasks (admin only) |

### Agent
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent/run` | Start an agentic run |
| GET | `/api/agent/runs` | List your agent runs |
| GET | `/api/agent/runs/:id` | Get a specific run |

### Example agent run request
```json
POST /api/agent/run
Authorization: Bearer <token>

{
  "prompt": "Create 3 tasks for building a REST API: design schema, implement endpoints, and write tests. Set the schema task to high priority and mark it as in_progress."
}
```

The agent will autonomously: call `create_task` × 3 → `update_task` × 2, then return a summary.

---

## GCP Deployment (Free Tier)

### Free tier limits used:
- **Cloud Run**: 2M requests/month free
- **Cloud SQL** (postgres): ~$7/month (cheapest option — use [Neon.tech](https://neon.tech) free tier instead for $0)
- **Container Registry**: free storage up to 0.5GB

### Recommended: Use Neon (free PostgreSQL) instead of Cloud SQL

```
# In .env for production, use your Neon connection string:
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/agentflow?sslmode=require
```

### Deploy steps

```bash
# 1. Install gcloud CLI and login
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com

# 3. Store secrets in Secret Manager
echo -n "YOUR_DB_URL" | gcloud secrets create agentflow-db-url --data-file=-
echo -n "YOUR_JWT_SECRET" | gcloud secrets create agentflow-jwt-secret --data-file=-
echo -n "YOUR_GEMINI_KEY" | gcloud secrets create agentflow-gemini-key --data-file=-

# 4. Build and deploy manually (or push to main to trigger CI/CD)
docker build -t gcr.io/YOUR_PROJECT_ID/agentflow .
docker push gcr.io/YOUR_PROJECT_ID/agentflow
gcloud run deploy agentflow \
  --image gcr.io/YOUR_PROJECT_ID/agentflow \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets "DATABASE_URL=agentflow-db-url:latest,..."
```

### GitHub Actions secrets to add:
- `GCP_PROJECT_ID`: your GCP project ID
- `GCP_SA_KEY`: JSON key of a service account with Cloud Run + GCR permissions

---

## Key Design Decisions

- **Agentic loop**: The Gemini model drives multi-step execution; our code just dispatches tool calls and feeds results back until the model returns a final text response (max 10 iterations).
- **RBAC**: `authenticate` middleware validates JWT; `authorize('admin')` guards admin-only routes.
- **Zod validation**: All request bodies are parsed through Zod schemas before reaching controllers — errors are returned as structured JSON with per-field messages.
- **Migration runner**: Tracks applied migrations in a `migrations` table; idempotent and safe to re-run.
