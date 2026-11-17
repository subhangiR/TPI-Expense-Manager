# ER Diagram

Renders automatically on GitHub and in VS Code (Markdown Preview Mermaid extension).

```mermaid
erDiagram
    users ||--o{ expenses : "employee_id (owner)"
    users ||--o{ expenses : "created_by (entered by)"
    departments ||--o{ users : "department_id (home department)"
    departments ||--o{ expenses : "department_id"
    categories ||--o{ expenses : "category_id"
    expenses ||--o{ expense_history : "expense_id"
    users ||--o{ expense_history : "performed_by"

    users {
        bigint id PK
        varchar name
        varchar email UK "unique, case-insensitive"
        varchar password_hash "bcrypt"
        varchar role "user | admin"
        varchar status "active | inactive"
        bigint department_id FK "nullable, default department for new expenses"
        timestamptz created_at
        timestamptz updated_at
    }
    departments {
        bigint id PK
        varchar name UK
    }
    categories {
        bigint id PK
        varchar name UK
    }
    expenses {
        bigint id PK
        varchar title
        bigint employee_id FK
        bigint department_id FK
        bigint category_id FK
        numeric amount "must be > 0"
        date expense_date
        text description
        varchar priority "low | medium | high"
        varchar status "workflow state"
        bigint created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    expense_history {
        bigint id PK
        bigint expense_id FK "ON DELETE CASCADE"
        varchar from_status "NULL on creation"
        varchar to_status
        varchar action
        text comments
        bigint performed_by FK
        timestamptz created_at
    }
```

## Design notes
- **Normalized:** department and category names live in lookup tables; expenses and users store ids.
- **users.department_id:** the user's home department, pre-selected on new expenses. Nullable so a user can exist before one is assigned.
- **employee_id vs created_by:** both point to `users`. Only employees create expenses, so today both hold the same person. `created_by` is kept as the record of who entered it.
- **Status values:** `DRAFT, SUBMITTED, PROCESSING, APPROVAL_REQUIRED, APPROVED, COMPLETED, REJECTED, FAILED`. A CHECK constraint stops invalid values; the transition rules themselves live in the backend service (Module 6).
- **Indexes:** on the columns used for filtering, sorting and joining (`employee_id`, `status`, `department_id`, `expense_date`, `created_at`, and `expense_history.expense_id`).
- **History:** append-only audit log, one row per status change, which powers the timeline.
- **updated_at:** maintained by a database trigger, so the backend never has to set it.
