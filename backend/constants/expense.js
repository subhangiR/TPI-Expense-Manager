// Shared lists so validation, workflow and SQL all use the same values.
const STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PROCESSING: 'PROCESSING',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  APPROVED: 'APPROVED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
};

const STATUSES = Object.values(STATUS);

const STATUS_LABEL = {
  DRAFT: 'a draft',
  SUBMITTED: 'submitted',
  PROCESSING: 'being processed',
  APPROVAL_REQUIRED: 'waiting for approval',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  FAILED: 'marked as failed',
};
const PRIORITIES = ['low', 'medium', 'high'];

module.exports = { STATUS, STATUSES, STATUS_LABEL, PRIORITIES };
