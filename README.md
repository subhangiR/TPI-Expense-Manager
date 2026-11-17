# Expense Management & Approval Platform

Employees raise expense requests. Small ones are approved automatically; larger ones wait for an admin. Every status change is recorded and shown live.

## Architecture

```
Browser (React + MUI)  --/api-->  nginx (frontend container)  --->  Express API  --->  PostgreSQL
        ^                                                              |
        +------------------ Server-Sent Events (/api/events) ----------+
```

- **Frontend** (`frontend/`): React, TypeScript, Vite, React Router, Redux Toolkit (login state), Material UI, React Hook Form, Recharts.
- **Backend** (`backend/`): Express 5 with raw SQL (`pg`), layered as routes -> controllers -> services -> models. Input is validated with zod.
- **Database** (`database/`): plain SQL migrations and a seed file. Schema: [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md).
- **Real time**: Server-Sent Events push status changes to open browsers.
- **API docs**: [docs/openapi.yaml](docs/openapi.yaml), served at `/api-docs` on the backend.
- **Plan and status**: [docs/PLAN.md](docs/PLAN.md).

## Roles and workflow

- **Employee** (`user`): creates, edits, deletes and submits their own expenses. Sees only their own. New expenses start with the employee's own department (`users.department_id`) selected.
- **Admin**: sees every submitted expense and approves or rejects. Drafts stay private to their owner, and admins do not create expenses.

```
Draft -> Submitted -> Processing -> Approved -> Completed      (amount below 5,000: automatic)
                               \-> Approval Required -> Approved -> Completed   (admin approves)
                               |                    \-> Rejected                (admin rejects, comment required)
                               \-> Failed                                       (processing error)
```

Amounts of `APPROVAL_THRESHOLD` (default 5,000) or more stop at Approval Required. Only drafts can be edited or deleted. Rejected and Failed are final. Invalid transitions return 409.

## Run with Docker

```bash
cp .env.example .env        # then set DB_PASSWORD and a JWT_SECRET of 32+ random characters
docker compose up -d --build
docker compose exec backend npm run db:seed    # demo data; wipes existing data
```

Open http://localhost:3000. API docs: http://localhost:4000/api-docs.
To browse the database with Adminer (development only): `docker compose --profile dev up -d adminer`, then http://localhost:8080.

## Run locally (without Docker for the app)

Needs Node 22+ and a PostgreSQL database (`docker compose up -d db` provides one).

```bash
cp .env.example .env
cd backend  && npm install && npm run db:setup && npm run dev     # API on :4000
cd frontend && npm install && npm run dev                         # UI on :5173
```

## Environment variables (`.env`)

| Name | Purpose | Default |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection | `localhost`, `5432`; user, password and name have no default |
| `PORT` | API port | `4000` |
| `JWT_SECRET` | Token signing key, at least 32 characters. The API will not start without it. | none |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CORS_ORIGIN` | Frontend origin allowed to call the API | `http://localhost:5173` |
| `APPROVAL_THRESHOLD` | Amount at or above which an admin must approve | `5000` |

## Test credentials (from the seed)

| Role | Email | Password |
|---|---|---|
| Admin | alice@tpi.com | Admin@123 |
| Employee | bob@tpi.com | User@123 |
| Employee | carol@tpi.com | User@123 |
| Employee | david@tpi.com | User@123 |

## Tests

```bash
cd backend  && npm test     # Jest + Supertest
cd frontend && npm test     # Jest + React Testing Library
```

## Security notes

Passwords are hashed with bcrypt. Tokens are signed JWTs. Roles are enforced on the server for every route and re-read from the database on each request. Login is limited to 10 attempts per address per 15 minutes. CORS is limited to the frontend origin. Secrets live in `.env`, which is git-ignored.

Known limitations:
- The token is kept in `localStorage`, which any XSS could read.
- The live-update stream takes the token in the URL (`?token=`) because the browser's `EventSource` cannot send headers. Request logs hide it.
- An open live-update stream is not re-checked when the token expires.
- The login page lists the demo accounts. Remove them, and never run the seed, in a real deployment.
