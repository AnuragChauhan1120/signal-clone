# Signal Clone

A minimal Signal-style chat app with a Next.js frontend, FastAPI backend, SQLite persistence, and WebSocket-based realtime messaging.

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, lucide-react
- Backend: FastAPI, SQLAlchemy, Uvicorn
- Database: SQLite by default
- Realtime: FastAPI WebSockets

## Project Structure

```txt
signal-clone/
├── backend/
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── next.config.js
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── .env.example
├── render.yaml
└── DEPLOY.md
```

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --host 127.0.0.1 --port 8001
```

Backend runs at:

```txt
http://127.0.0.1:8001
```

API docs:

```txt
http://127.0.0.1:8001/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```txt
http://127.0.0.1:3000
```

Seeded login numbers:

```txt
+123456789
+987654321
```

## Environment Variables

### Backend

```txt
DATABASE_URL=sqlite:///./signal_clone.db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend

```txt
BACKEND_API_URL=http://127.0.0.1:8001
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_WS_BASE_URL=ws://127.0.0.1:8001
```

`BACKEND_API_URL` is used by `next.config.js` to proxy `/api/*` requests to the backend.

`NEXT_PUBLIC_WS_BASE_URL` is used by the browser for WebSocket connections.

## Architecture Overview

The frontend renders the chat UI and handles login, conversation selection, message fetching, and WebSocket events.

The backend exposes REST endpoints for login, conversations, and messages. It also exposes a WebSocket endpoint for realtime message sending and broadcasting.

SQLite stores users, conversations, conversation memberships, and messages. On startup, the backend seeds sample users and conversations if the database is empty.

## Database Schema

### users

| Column | Type | Notes |
|---|---|---|
| id | string | Primary key |
| phone_number | string | Unique, required |
| display_name | string | Required |
| avatar_url | string | Optional |
| last_seen | datetime | Defaults to current UTC time |

### conversations

| Column | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | Null for direct chats |
| is_group | boolean | Group flag |
| created_at | datetime | Defaults to current UTC time |

### conversation_members

| Column | Type | Notes |
|---|---|---|
| conversation_id | string | Primary key, foreign key |
| user_id | string | Primary key, foreign key |
| is_admin | boolean | Defaults to false |

### messages

| Column | Type | Notes |
|---|---|---|
| id | string | Primary key |
| conversation_id | string | Foreign key |
| sender_id | string | Foreign key |
| text | text | Required |
| status | string | sending, sent, delivered, read |
| created_at | datetime | Defaults to current UTC time |

## API Overview

### POST `/api/auth/login`

Mock login by phone number.

Request:

```json
{
  "phone_number": "+123456789"
}
```

Response:

```json
{
  "id": "user_alice",
  "display_name": "Alice (You)",
  "phone_number": "+123456789",
  "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Alice"
}
```

### GET `/api/conversations/{user_id}`

Returns conversations for a user, including last message preview and timestamp.

### GET `/api/messages/{conversation_id}`

Returns all messages in a conversation, ordered by creation time.

### WebSocket `/ws/{user_id}`

Connects a user to realtime messaging.

Send message payload:

```json
{
  "event_type": "send_message",
  "data": {
    "conversation_id": "conv_direct",
    "text": "Hello"
  }
}
```

Broadcast payload:

```json
{
  "event_type": "new_message",
  "data": {
    "id": "msg_2",
    "conversation_id": "conv_direct",
    "sender_id": "user_alice",
    "text": "Hello",
    "status": "sent",
    "created_at": "2026-06-26T00:00:00"
  }
}
```

## Deployment

Recommended deployment:

- Frontend: Netlify
- Backend: Render Web Service

### Render Backend

```txt
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Render env vars:

```txt
DATABASE_URL=sqlite:///./signal_clone.db
CORS_ORIGINS=https://your-netlify-site.netlify.app
```

### Netlify Frontend

```txt
Base directory: frontend
Build command: npm run build
Publish directory: .next
```

Netlify env vars:

```txt
BACKEND_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_WS_BASE_URL=wss://your-render-backend.onrender.com
```

Redeploy both services after changing environment variables.
