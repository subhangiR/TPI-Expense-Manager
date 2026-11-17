-- Login credentials:
--   alice@tpi.com  /  Admin@123  (admin)
--   bob@tpi.com    /  User@123   (user)
--   carol@tpi.com  /  User@123   (user)
--   david@tpi.com  /  User@123   (user)
--
-- Passwords are stored as bcrypt hashes. Ids are predictable because
-- RESTART IDENTITY resets the counters, so history rows can reference them.

TRUNCATE expense_history, expenses, categories, departments, users RESTART IDENTITY CASCADE;

INSERT INTO departments (name) VALUES
  ('Sales'),
  ('Engineering'),
  ('Marketing'),
  ('HR'),
  ('Finance'),
  ('Operations');

INSERT INTO users (name, email, password_hash, role, department_id) VALUES
  ('Alice Anderson','alice@tpi.com', '$2b$10$8/97XIZ9vcehNgItDCRCzOxA8keK9DGe3l4h81dEoY0eqVt1ncNiO', 'admin', 5),
  ('Bob Brown',  'bob@tpi.com', '$2b$10$Z2CyF5UUdbfAtSxDys1Zee3BLwmyI3vLT4JsZyIDJS6PCt3ZDTYua', 'user', 1),
  ('Carol Clark', 'carol@tpi.com', '$2b$10$Z2CyF5UUdbfAtSxDys1Zee3BLwmyI3vLT4JsZyIDJS6PCt3ZDTYua', 'user', 3),
  ('David Davis',  'david@tpi.com',  '$2b$10$Z2CyF5UUdbfAtSxDys1Zee3BLwmyI3vLT4JsZyIDJS6PCt3ZDTYua', 'user', 2);

INSERT INTO categories (name) VALUES
  ('Travel'),
  ('Meals'),
  ('Office Supplies'),
  ('Software'),
  ('Training'),
  ('Accommodation');

INSERT INTO expenses (title, employee_id, department_id, category_id, amount, expense_date, description, priority, status, created_by) VALUES
  ('Client Meeting Travel', 2, 1, 1, 12500, '2026-11-10', 'Travel expenses for client meeting', 'high', 'APPROVAL_REQUIRED', 2),
  ('Team Lunch', 3, 3, 2, 3200, '2026-11-05', 'Quarterly team lunch', 'low', 'COMPLETED', 3),
  ('Office Stationery', 4, 6, 3, 1800, '2026-11-02', 'Notebooks and pens', 'low', 'COMPLETED', 4),
  ('Conference Registration', 2, 2, 5, 24000, '2026-10-28', 'React conference ticket', 'high', 'COMPLETED', 2),
  ('Cloud Software Licence', 3, 2, 4, 8999, '2026-10-30', 'Annual design tool licence', 'medium', 'REJECTED', 3),
  ('Hotel Stay Mumbai', 4, 1, 6, 15600, '2026-11-12', 'Two nights for customer visit', 'high', 'DRAFT', 4),
  ('Taxi Fare', 2, 1, 1, 950, '2026-11-11', 'Airport taxi', 'low', 'DRAFT', 2),
  ('Workshop Materials', 3, 3, 3, 5000, '2026-11-08', 'Exactly at the approval threshold', 'medium', 'APPROVAL_REQUIRED', 3),
  ('Payment Gateway Fee', 4, 5, 4, 2500, '2026-11-01', 'Payment processing failed', 'medium', 'FAILED', 4),
  ('Training Course', 3, 4, 5, 18000, '2026-11-07', 'Leadership training programme', 'medium', 'APPROVAL_REQUIRED', 3),
  ('Client Dinner', 2, 1, 2, 4800, '2026-11-03', 'Dinner with prospective client', 'medium', 'COMPLETED', 2),
  ('Laptop Accessories', 4, 2, 3, 6700, '2026-10-25', 'Monitor and keyboard', 'medium', 'COMPLETED', 4);

-- Give each expense its own created time (its expense date at 10:00 IST + a few minutes per id),
-- so sorting by "Created" shows a real order instead of ties.
UPDATE expenses
SET created_at = expense_date::timestamp AT TIME ZONE 'Asia/Kolkata' + INTERVAL '10 hours' + id * INTERVAL '7 minutes',
    updated_at = expense_date::timestamp AT TIME ZONE 'Asia/Kolkata' + INTERVAL '10 hours' + id * INTERVAL '7 minutes';

INSERT INTO expense_history (expense_id, from_status, to_status, action, comments, performed_by, created_at) VALUES
  (1, NULL, 'DRAFT', 'CREATE', NULL, 2, '2026-11-10 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (1, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 2, '2026-11-10 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (1, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 2, '2026-11-10 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (1, 'PROCESSING', 'APPROVAL_REQUIRED', 'REQUEST_APPROVAL', NULL, 2, '2026-11-10 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (2, NULL, 'DRAFT', 'CREATE', NULL, 3, '2026-11-05 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (2, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 3, '2026-11-05 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (2, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 3, '2026-11-05 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (2, 'PROCESSING', 'APPROVED', 'AUTO_APPROVE', NULL, 3, '2026-11-05 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (2, 'APPROVED', 'COMPLETED', 'COMPLETE', NULL, 3, '2026-11-05 10:00:00+05:30'::timestamptz + INTERVAL '60 minutes'),
  (3, NULL, 'DRAFT', 'CREATE', NULL, 4, '2026-11-02 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (3, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 4, '2026-11-02 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (3, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 4, '2026-11-02 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (3, 'PROCESSING', 'APPROVED', 'AUTO_APPROVE', NULL, 4, '2026-11-02 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (3, 'APPROVED', 'COMPLETED', 'COMPLETE', NULL, 4, '2026-11-02 10:00:00+05:30'::timestamptz + INTERVAL '60 minutes'),
  (4, NULL, 'DRAFT', 'CREATE', NULL, 2, '2026-10-28 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (4, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 2, '2026-10-28 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (4, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 2, '2026-10-28 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (4, 'PROCESSING', 'APPROVAL_REQUIRED', 'REQUEST_APPROVAL', NULL, 2, '2026-10-28 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (4, 'APPROVAL_REQUIRED', 'APPROVED', 'APPROVE', 'Approved for team upskilling', 1, '2026-10-28 10:00:00+05:30'::timestamptz + INTERVAL '60 minutes'),
  (4, 'APPROVED', 'COMPLETED', 'COMPLETE', NULL, 1, '2026-10-28 10:00:00+05:30'::timestamptz + INTERVAL '75 minutes'),
  (5, NULL, 'DRAFT', 'CREATE', NULL, 3, '2026-10-30 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (5, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 3, '2026-10-30 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (5, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 3, '2026-10-30 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (5, 'PROCESSING', 'APPROVAL_REQUIRED', 'REQUEST_APPROVAL', NULL, 3, '2026-10-30 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (5, 'APPROVAL_REQUIRED', 'REJECTED', 'REJECT', 'Please use the existing company licence', 1, '2026-10-30 10:00:00+05:30'::timestamptz + INTERVAL '60 minutes'),
  (6, NULL, 'DRAFT', 'CREATE', NULL, 4, '2026-11-12 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (7, NULL, 'DRAFT', 'CREATE', NULL, 2, '2026-11-11 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (8, NULL, 'DRAFT', 'CREATE', NULL, 3, '2026-11-08 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (8, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 3, '2026-11-08 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (8, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 3, '2026-11-08 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (8, 'PROCESSING', 'APPROVAL_REQUIRED', 'REQUEST_APPROVAL', NULL, 3, '2026-11-08 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (9, NULL, 'DRAFT', 'CREATE', NULL, 4, '2026-11-01 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (9, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 4, '2026-11-01 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (9, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 4, '2026-11-01 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (9, 'PROCESSING', 'FAILED', 'FAIL', 'Processing error', 4, '2026-11-01 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (10, NULL, 'DRAFT', 'CREATE', NULL, 3, '2026-11-07 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (10, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 3, '2026-11-07 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (10, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 3, '2026-11-07 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (10, 'PROCESSING', 'APPROVAL_REQUIRED', 'REQUEST_APPROVAL', NULL, 3, '2026-11-07 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (11, NULL, 'DRAFT', 'CREATE', NULL, 2, '2026-11-03 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (11, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 2, '2026-11-03 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (11, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 2, '2026-11-03 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (11, 'PROCESSING', 'APPROVED', 'AUTO_APPROVE', NULL, 2, '2026-11-03 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (11, 'APPROVED', 'COMPLETED', 'COMPLETE', NULL, 2, '2026-11-03 10:00:00+05:30'::timestamptz + INTERVAL '60 minutes'),
  (12, NULL, 'DRAFT', 'CREATE', NULL, 4, '2026-10-25 10:00:00+05:30'::timestamptz + INTERVAL '0 minutes'),
  (12, 'DRAFT', 'SUBMITTED', 'SUBMIT', NULL, 4, '2026-10-25 10:00:00+05:30'::timestamptz + INTERVAL '15 minutes'),
  (12, 'SUBMITTED', 'PROCESSING', 'PROCESS', NULL, 4, '2026-10-25 10:00:00+05:30'::timestamptz + INTERVAL '30 minutes'),
  (12, 'PROCESSING', 'APPROVAL_REQUIRED', 'REQUEST_APPROVAL', NULL, 4, '2026-10-25 10:00:00+05:30'::timestamptz + INTERVAL '45 minutes'),
  (12, 'APPROVAL_REQUIRED', 'APPROVED', 'APPROVE', 'Approved', 1, '2026-10-25 10:00:00+05:30'::timestamptz + INTERVAL '60 minutes'),
  (12, 'APPROVED', 'COMPLETED', 'COMPLETE', NULL, 1, '2026-10-25 10:00:00+05:30'::timestamptz + INTERVAL '75 minutes');
