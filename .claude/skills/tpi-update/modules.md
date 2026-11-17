# TPI Expense Manager: module map

Used by the `tpi-update` pickers. Paths are relative to the project root. `BE` = `backend/`, `FE` = `frontend/src/`. Tests: `tests/backend/*.test.js` and `FE` `*.test.tsx` files.

Business context: employees create, edit, delete and submit their own expenses; admins only view submitted expenses, approve and reject (drafts are private to the employee). Amount below `APPROVAL_THRESHOLD` (5,000) is auto-approved; at or above it waits for an admin. Full rules: `docs/PLAN.md`.

## Area 1: Access and users

### Auth and session
Files: BE `routes/auth.routes.js`, `controllers/auth.controller.js`, `services/auth.service.js`, `middleware/authenticate.js`, `middleware/loginLimiter.js`; FE `pages/LoginPage.tsx`, `store/authSlice.ts`, `api/auth.ts`, `api/client.ts`, `components/ProtectedRoute.tsx`.
Features:
- Login form and error messages
- Session: logout and expired token handling
- Route guards by role (`ProtectedRoute`, `RoleRoute`)
- Login rate limit (10 per 15 minutes)
- Demo account shortcuts on the login page

### Users and roles
Files: BE `routes/user.routes.js`, `controllers/user.controller.js`, `services/user.service.js`, `models/user.model.js`, `middleware/authorize.js`. API only; there is no admin Users screen.
Features:
- List and search users (admin API)
- Change a user's role or status (admin API)
- Department per user (`users.department_id`, pre-selects the New expense form)
- Add an admin Users screen (not built)

## Area 2: Expenses

### Expense list
Files: FE `pages/ExpensesPage.tsx`, `components/ExpenseCard.tsx` (phone layout), `components/StatusChip.tsx`, `api/expenses.ts`; BE `routes/expense.routes.js`, `controllers/expense.controller.js`, `services/expense.service.js`, `models/expense.model.js`, `validators/expense.validator.js`.
Features:
- Search and filters (status, department, category, dates)
- Sorting and pagination
- Row actions (view, edit, submit, delete; admins see view only and never see drafts)
- Phone layout (cards and collapsible filters)

### Expense form and details
Files: FE `components/ExpenseFormDialog.tsx`, `ExpenseDetailsDialog.tsx`, `ExpenseDetails.tsx`, `ConfirmDialog.tsx`, `ModalTitle.tsx`; BE same expense files as above plus `utils/describeChanges.js`.
Features:
- New and edit form with validation (employees only)
- Save as draft and Submit buttons
- Details dialog with activity timeline
- Delete draft confirmation

## Area 3: Workflow and approvals

### Workflow engine and history
Files: BE `services/workflow.service.js`, `constants/workflow.js`, `constants/expense.js`, `controllers/workflow.controller.js`, `models/history.model.js`, `utils/transaction.js`; FE `components/HistoryTimeline.tsx`; DB `database/migrations/004_create_expense_history.sql`.
Features:
- Submit and automatic processing (threshold rule)
- Approve and reject rules (comment required to reject)
- History and audit text
- Failed processing and race protection

### Approvals
Files: FE `pages/ApprovalsPage.tsx`, `components/ReviewButtons.tsx`; BE approve and reject routes in `routes/expense.routes.js`.
Features:
- Approval queue (admin)
- Approve and reject with comment dialog
- Pending approvals banner and alerts

### Real-time updates
Files: BE `services/sse.service.js`, `routes/events.routes.js`, `controllers/events.controller.js`, `utils/eventBus.js`; FE `hooks/useExpenseEvents.ts`, connection and toasts in `components/Layout.tsx`.
Features:
- Event stream and who receives what
- Live notice messages (`utils/messages.ts`)
- Pages refreshing on events
- Connection status in the layout

## Area 4: Dashboard and platform

### Dashboard
Files: FE `pages/DashboardPage.tsx`, `components/charts/*`, `components/DateRangeFilter.tsx`, `components/AttentionAlerts.tsx`, `hooks/useOutcomeNotices.ts`, `hooks/useAwaitingPreview.ts`, `utils/dateRange.ts`; BE stats in `services/expense.service.js` (`getStats`) and `models/expense.model.js`.
Features:
- KPI cards
- Charts (trend, donut, bars)
- Date range filter
- Alerts and outcome notices for employees

### Layout and theme
Files: FE `components/Layout.tsx`, `theme/theme.ts`, `theme/ThemeModeProvider.tsx`, `components/Notice.tsx`, `utils/messages.ts`, `utils/format.ts`, empty, error and loading state components.
Features:
- Navigation and header
- Light and dark mode
- Messages and notices wording
- Accessibility (focus, contrast, labels)

### Database
Files: `database/migrations/*.sql`, `database/seeds/001_seed.sql`, `backend/scripts/migrate.js`, `backend/scripts/seed.js`, `backend/models/lookup.model.js`, `docs/ER_DIAGRAM.md`.
Features:
- Tables and migrations (add a new numbered file only)
- Seed data and demo accounts
- Departments and categories lookups
- ER diagram

### Docker, security, docs and tests
Files: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `.env.example`, `backend/app.js`, `backend/server.js`, `docs/openapi.yaml`, `docs/PLAN.md`, `README.md`, `tests/backend/*`.
Features:
- Docker and nginx setup
- Security (JWT, CORS, headers, rate limit)
- API docs (OpenAPI at `/api-docs`) and README
- Automated tests
