# React Native + FastAPI + Supabase Template

A full-stack mobile app template with React Native (Expo), FastAPI backend, and Supabase (Auth, Database, Storage, Realtime). The app communicates with Supabase exclusively through FastAPI, making the backend easily swappable.

## Architecture

```
React Native App  →  FastAPI  →  Supabase (Auth / DB / Storage)
                  ↗
        Supabase Realtime (direct WebSocket — only exception)
```

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 55, React Native 0.83, React 19.2 |
| Routing | Expo Router (file-based) |
| State | Zustand (client) + TanStack Query (server) |
| HTTP | Axios with auth interceptors |
| Backend | FastAPI, Python 3.12, uv |
| Database | Supabase Postgres |
| Auth | Supabase Auth (proxied through FastAPI) |
| Storage | Supabase Storage (proxied through FastAPI) |
| Realtime | Supabase Realtime (direct from app) |
| Docker | Multi-stage build with uv |

## Project Structure

```
├── app/                          # React Native (Expo)
│   └── src/
│       ├── app/                  # Expo Router file-based routes
│       │   ├── (auth)/           # Login, Signup screens
│       │   ├── (app)/            # Notes list, Note editor
│       │   ├── _layout.tsx       # Root layout (providers)
│       │   └── index.tsx         # Auth redirect
│       ├── hooks/                # React Query hooks, realtime
│       ├── lib/                  # API client, Supabase client, Query client
│       ├── services/             # API service functions
│       └── stores/               # Zustand stores
├── backend/                      # FastAPI
│   ├── app/
│   │   ├── api/v1/              # Versioned API routes
│   │   │   ├── auth.py          # /auth/signup, /login, /refresh
│   │   │   ├── notes.py         # CRUD /notes
│   │   │   └── storage.py       # /storage/upload, /download, /delete
│   │   ├── core/                # Config, Supabase client, auth deps
│   │   └── schemas/             # Pydantic models
│   ├── Dockerfile               # Multi-stage with uv
│   └── pyproject.toml           # uv-managed dependencies
├── supabase/
│   ├── config.toml              # Local Supabase config
│   └── migrations/              # SQL migrations (schema + RLS)
└── docker-compose.yml           # FastAPI service
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- Docker (for containerized FastAPI)
- Expo Go app on your phone (optional)

### 1. Start Local Supabase

```bash
# Install Supabase CLI (if not installed)
npx supabase init  # only first time, config already exists in /supabase

# Start local Supabase (Postgres, Auth, Storage, Realtime, Studio)
npx supabase start

# Run migrations
npx supabase db push

# Note the output — you'll need SUPABASE_URL plus the publishable/secret keys
# (new projects use SUPABASE_PUBLISHABLE_DEFAULT_KEY / SUPABASE_SECRET_DEFAULT_KEY;
#  legacy projects still provide ANON_KEY / SERVICE_ROLE_KEY)
npx supabase status
```

Supabase Studio will be available at `http://localhost:54323`.

### 2. Start FastAPI Backend

```bash
cd backend

# Copy env and fill in Supabase keys from `supabase status`
cp .env.example .env

# Install dependencies
uv sync

# Run dev server
uv run uvicorn app.main:app --reload --port 8000
```

Or with Docker:

```bash
# From project root
docker compose up --build
```

API docs available at `http://localhost:8000/docs`.

### 3. Start React Native App

```bash
cd app

# Copy env and fill in Supabase keys (only needed for Realtime)
cp .env.example .env

# Install dependencies
npm install

# Start Expo dev server
npm start
```

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Create account |
| POST | `/api/v1/auth/login` | Sign in |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/notes` | List user's notes |
| POST | `/api/v1/notes` | Create note |
| GET | `/api/v1/notes/:id` | Get single note |
| PATCH | `/api/v1/notes/:id` | Update note |
| DELETE | `/api/v1/notes/:id` | Delete note |
| POST | `/api/v1/storage/upload/:note_id` | Upload attachment |
| GET | `/api/v1/storage/download/:note_id` | Get signed download URL |
| DELETE | `/api/v1/storage/delete/:note_id` | Delete attachment |

### Swapping the Backend

The app only knows about FastAPI endpoints. To swap Supabase for another provider:

1. Replace the Supabase client calls in `backend/app/core/supabase.py` and services
2. Keep the same FastAPI endpoint signatures
3. The React Native app requires zero changes
