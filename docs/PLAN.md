# Expense Management & Approval Platform: Plan and Status

Single source of truth for scope, decisions and what is left. Last checked against the code on 2026-11-16.
Legend: DONE = built and tested. PARTIAL = works but incomplete. MISSING = not started.

## 1. Stack and decisions

| Area | Choice |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Redux Toolkit (auth), Material UI, Axios, React Hook Form, Recharts |
| Backend | Node.js + Express 5, raw SQL with `pg` (no ORM), zod validation, layered routes -> controllers -> services -> models |
| Database | PostgreSQL 16, plain SQL migrations (`database/migrations`) and seed (`database/seeds`) |
| Real-time | Server-Sent Events (one-way updates, simpler than WebSocket) |
| Tests | Jest + Supertest (backend), Jest + React Testing Library (frontend) |
| Delivery | Docker Compose: db, backend, frontend (nginx); adminer only with `--profile dev` |

Roles are `user` and `admin`. API docs live in `docs/openapi.yaml` and are served at `/api-docs`. Schema is in `docs/ER_DIAGRAM.md`.

Decisions:
1. Only employees create, edit, delete and submit expenses. Admins review them (approve or reject) and see every submitted expense. Drafts are private to their owner: the API hides them from admins in the list, dashboard numbers, details and history. `employee_id` and `created_by` both reference `users` and hold the same person.
2. Only Draft expenses can be edited or deleted. Rejected and Failed are final.
3. Processing -> Failed happens if the automatic processing step throws.
4. Approved -> Completed is automatic, in the same transaction as the approval (two history rows).
5. Amount below `APPROVAL_THRESHOLD` (5,000, set in `.env`) is auto-approved and completed. At or above it stops at Approval Required.
6. Each user has a home department (`users.department_id`), pre-selected when they open New expense. The seed assigns one to every user. A user with no department must pick one, and there is no admin screen to assign it yet (set it in the database).

## 2. Workflow

- Submit: Draft -> Submitted -> Processing, then automatically:
  - amount < threshold: Processing -> Approved -> Completed
  - amount >= threshold: Processing -> Approval Required (waits for an admin)
  - processing error: Processing -> Failed
- Admin approve: Approval Required -> Approved -> Completed.
- Admin reject (comment required): Approval Required -> Rejected.
- Invalid transitions return 409. Every step writes an `expense_history` row.

## 3. Status

| Area | Status | Notes |
|---|---|---|
| Database: migrations, seed, ER diagram | DONE | Migrations 001-005 |
| Auth, JWT, RBAC, `/api/users` | DONE | Login rate limited. Users API only, no admin Users screen |
| Expenses CRUD, search, filters, sort, pagination | DONE | Create/edit/view are dialogs on the Expenses page |
| Workflow engine and history | DONE | `backend/services/workflow.service.js` |
| Dashboard (KPIs, charts, date range, alerts) | DONE | Data from `GET /api/expenses/stats` |
| Admin approval queue | DONE | Approve, reject with comment |
| SSE live updates | DONE | `GET /api/events`, connection state in the layout |
| Accessible confirm dialog | DONE | `ConfirmDialog` |
| OpenAPI | DONE | Covers every endpoint |
| Automated tests | DONE | Backend 131 passing, frontend 37 passing |
| Docker Compose | DONE | Built and run on 2026-11-16: migrations, seed, login, RBAC and rate limit checked through nginx |
| README (architecture, setup, env vars, test credentials) | DONE | `README.md` |
| Demo recording | MISSING | Yours to record |
| Git history | MISSING | Repository has no commits yet |

## 4. What is left

1. First git commit. Confirm `.env` is not included (it is git-ignored).
2. Record the demo.

## 5. Security checklist

- [x] Passwords hashed with bcrypt.
- [x] JWT signed with HS256 only; the server refuses to start unless `JWT_SECRET` is at least 32 characters and not the placeholder.
- [x] Authorization enforced on the server for every route; roles and active status are re-read from the database on each request.
- [x] Login limited to 10 attempts per address per 15 minutes (429 after that).
- [x] CORS limited to the frontend origin; `helmet` security headers on the API; basic security headers on nginx.
- [x] `.env` is git-ignored; `.env.example` has placeholders only. Compose refuses to start without `JWT_SECRET` and `DB_PASSWORD`.
- [x] Backend container runs as a non-root user; the API port is bound to localhost; adminer is off unless `--profile dev` is used.
- [x] One JSON error shape that never leaks internals. Sort columns use a fixed allow-list; all SQL values are parameterised.
- [x] `npm audit --omit=dev` reports 0 vulnerabilities for the backend.
- [ ] Confirm no secrets in the first commit.

## 6. Known limitations (state these in the README)

- Token is stored in `localStorage` (readable by any XSS). Accepted for simplicity.
- The SSE endpoint takes the token in the URL (`?token=`) because `EventSource` cannot send headers. Request logs hide it.
- An open SSE connection is not re-checked when the token expires.
- Failed and Rejected expenses cannot be resubmitted.
- The login page lists the seeded demo accounts for reviewers. Remove them, and do not run the seed, in a real deployment.
