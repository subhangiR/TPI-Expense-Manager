-- Expenses: one row per expense request. `status` is the current workflow state.
-- employee_id = who the expense belongs to, created_by = who entered it.

CREATE TABLE expenses (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         VARCHAR(150)  NOT NULL,
  employee_id   BIGINT        NOT NULL REFERENCES users (id),
  department_id BIGINT        NOT NULL REFERENCES departments (id),
  category_id   BIGINT        NOT NULL REFERENCES categories (id),
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date  DATE          NOT NULL,
  description   TEXT,
  priority      VARCHAR(10)   NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
  status        VARCHAR(20)   NOT NULL DEFAULT 'DRAFT'
                CHECK (status IN (
                  'DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVAL_REQUIRED',
                  'APPROVED', 'COMPLETED', 'REJECTED', 'FAILED'
                )),
  created_by    BIGINT        NOT NULL REFERENCES users (id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for the columns we filter, sort and join on.
CREATE INDEX expenses_employee_id_idx   ON expenses (employee_id);
CREATE INDEX expenses_status_idx        ON expenses (status);
CREATE INDEX expenses_department_id_idx ON expenses (department_id);
CREATE INDEX expenses_expense_date_idx  ON expenses (expense_date);
CREATE INDEX expenses_created_at_idx    ON expenses (created_at);

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
