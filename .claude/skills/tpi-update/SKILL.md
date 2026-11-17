---
name: tpi-update
description: Guided way to explain, enhance, fix or otherwise change the TPI Expense Manager app. Asks selectable questions (no typing needed) for intent, module and feature, then makes the change to the project's standards and updates tests and docs. Use when the user wants to understand this app or a module, add or improve a feature or module, fix a bug, or make any other change here.
argument-hint: "[explain|enhance|bug|other] [module]  (optional, skips questions already answered)"
---

# tpi-update

One entry point for every change to this app. Ask with **AskUserQuestion** (selectable options). Ask only what you still need, in as few calls as possible. Free text is the automatic "Other" choice, never a first resort.

Read `modules.md` (same folder) for the module and feature lists used by the pickers, and the files each module owns. Do not re-explore the codebase for what it already says.

If the user passed arguments (for example `bug login`), treat them as answers and skip those questions.

## Step 1: Intent (one call, one question)

Header `Task`, question "What would you like to do?":

| Option | Meaning |
|---|---|
| Explain | Understand the app or a module |
| Enhance | Add or improve a feature, or add a module |
| Bug fix | Something is broken or looks wrong |
| Other | Anything else (cleanup, docs, tests, data, DevOps) |

## Picker used by the flows below (module, then feature)

Questions allow at most 4 options, so narrow down in steps. Use the groups in `modules.md`.

1. **Area** (header `Area`): Access and users / Expenses / Workflow and approvals / Dashboard and platform.
2. **Module** (header `Module`): the 1 to 4 modules inside that area.
3. **Feature** (header `Feature`): that module's features from `modules.md` (4 or fewer, pick the most relevant, "Other" covers the rest).

Each step depends on the previous answer, so ask them one call at a time. Skip a step when only one option is left.

## Flow A: Explain (everything is selectable)

1. Scope (header `Scope`): The whole app / One module / Roles and workflow rules / A request end to end.
2. If "One module": run the picker down to Module (feature optional).
3. If "A request end to end": ask which (header `Flow`): Login / Create and submit an expense / Admin approves or rejects / Live update (SSE).
4. Depth (header `Depth`): Quick summary / Walkthrough with files / Deep dive with code.
5. Answer from the code, citing `file:line`. Keep it simple and spoken-style: the owner may need to explain this app in an interview. Plain words, short sentences, one idea at a time. Offer, do not force, a follow-up.

Explain never edits files.

## Flow B: Enhance

1. Target (header `Target`): Improve an existing module / Add a feature to a module / Add a new module.
2. Existing or add-feature: run the picker to Module, then Feature (use "Improve" to pick the feature, or "Add a feature" to describe a new one).
3. New module: ask Area it belongs to (header `Area`), then Layers needed (header `Layers`, multi-select): Database table / Backend API / Frontend page / Real-time events.
4. Change type (header `Change`): Behaviour / Look and layout / Data or fields / Rules or permissions.
5. If the request is still unclear, ask once for a one-line description (the "Other" text). Do not interview.
6. Summarise the plan in 3 to 5 bullets, then implement. For a new module or anything touching the database, roles or the workflow, confirm the plan first.

## Flow C: Bug fix

1. Picker to Module, then Feature (header `Feature`).
2. Symptom (header `Symptom`): Does nothing or wrong result / Looks or lays out wrong / Wrong message or data / Error or crash.
3. Reproduce first: read the module files, run its tests, and for UI bugs look at it in the browser if a dev server is running. Find the root cause before editing. Add or adjust a test that fails without the fix when the module has tests.
4. Fix the cause, not the symptom. Do not change unrelated look and feel.

## Flow D: Other

Ask (header `Kind`): Refactor or cleanup / Docs only / Tests only / DevOps, Docker or security. Add a data or seed change through "Other". Then do it under the same standards. For cleanup, never change behaviour or appearance.

## Project standards (apply to every change)

Simple, explainable code beats clever code. No over-engineering: no new libraries, layers, abstractions or config unless the task needs them.

**Backend** (`backend/`, plain JS, Express 5, raw SQL):
- Keep the layers: routes -> controllers -> services -> models. Controllers only translate HTTP. Business rules live in services. SQL only in models, always parameterised. Sort or filter columns come from a fixed allow-list.
- Validate input with a zod schema in `validators/` and the `validate` middleware. Errors use `ApiError` and the one JSON shape from `errorHandler`.
- Authorization is enforced on the server (`authenticate`, `authorize`, ownership checks in services). Never rely on the UI hiding something.
- Roles: employees (`user`) create, edit, delete and submit their own expenses. Admins only review (approve or reject) and view submitted expenses. Drafts are private to their owner, so admins never see them. Do not give admins a create flow.
- Workflow rules are data in `constants/workflow.js` and logic in `services/workflow.service.js`. Status changes write `expense_history` in the same transaction.
- Schema changes are a **new** numbered file in `database/migrations/`. Never edit a migration that already exists. Update `database/seeds/001_seed.sql` if sample data must change.

**Frontend** (`frontend/src/`, React, TypeScript, MUI):
- Function components and hooks, React Hook Form for forms, Redux Toolkit only for login state, Axios through `api/`, shared types in `types/index.ts`, user-facing wording in `utils/messages.ts`.
- Keep the existing look and feel: reuse existing components and theme, no inline restyling, keep accessibility (labels, `role="alert"`, focus handling, contrast).
- Business rules stay in the backend. The UI only shows state and the actions allowed.

**General**:
- Comments only where a reader would ask "why?". No dead code, no leftover debug logs.
- Match existing naming and file layout. One responsibility per file.
- Never commit, push, or touch `.env` unless asked. No secrets in code.

## Definition of done (do all that apply, then report)

1. Code change finished and small.
2. Tests: add or update in `tests/backend/` (Jest + Supertest) or next to the frontend code (Jest + RTL).
3. Run, and report real results:
   - `cd backend && npx jest`
   - `cd frontend && npx tsc --noEmit && npx jest && npx vite build`
4. Docs, only the ones affected, with no duplicate files:
   - API changed -> `docs/openapi.yaml`
   - Schema changed -> new migration, `docs/ER_DIAGRAM.md` (diagram and notes), seed if needed
   - Scope, decision, status or limitation changed -> `docs/PLAN.md` (the single plan file; edit it in place)
   - Setup, env vars, roles or credentials changed -> `README.md`, `.env.example`, `docker-compose.yml`
5. Docker or env changes: verify with an isolated project (`docker compose -p tpicheck ... up -d --build`), then tear it down with `down -v --rmi local`. Do not disturb the user's running dev containers.
6. Finish with a short summary: what changed, how it was verified, anything the user must decide or do. Say plainly if something was not verified.

## New module checklist

Backend: migration, model, validator, service, controller, route registered in `routes/index.js`, tests. Frontend: `api/` file, types, page, route in `App.tsx` (with `RoleRoute` if role-limited), nav item in `components/Layout.tsx`, tests. Then the docs in step 4 above and a new entry in `modules.md`.

## Keep this skill current

When a module or feature is added, renamed or removed, update `modules.md` in the same change.
