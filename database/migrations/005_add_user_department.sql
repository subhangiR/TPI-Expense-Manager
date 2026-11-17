-- Every user belongs to one department. It is the default on their new expenses.
-- Nullable so existing users keep working until an admin assigns one.
ALTER TABLE users ADD COLUMN department_id BIGINT REFERENCES departments(id);
