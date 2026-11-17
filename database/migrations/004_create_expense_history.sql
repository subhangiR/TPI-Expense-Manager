-- Audit trail: one row for every status change of an expense.
-- from_status is NULL for the very first entry (expense creation).

CREATE TABLE expense_history (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expense_id   BIGINT       NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
  from_status  VARCHAR(20),
  to_status    VARCHAR(20)  NOT NULL,
  action       VARCHAR(30)  NOT NULL,
  comments     TEXT,
  performed_by BIGINT       NOT NULL REFERENCES users (id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX expense_history_expense_id_idx ON expense_history (expense_id, created_at);
