// The workflow as data: for each status, which statuses may come next.
//
//   DRAFT -> SUBMITTED -> PROCESSING -> APPROVAL_REQUIRED -> APPROVED -> COMPLETED
//                              |                |
//                              |                +-> REJECTED   (admin rejects, final)
//                              +-> APPROVED      (amount below the threshold: auto-approved)
//                              +-> FAILED        (processing error, final)
const { STATUS } = require('./expense');

const TRANSITIONS = {
  [STATUS.DRAFT]: [STATUS.SUBMITTED],
  [STATUS.SUBMITTED]: [STATUS.PROCESSING],
  [STATUS.PROCESSING]: [STATUS.APPROVAL_REQUIRED, STATUS.APPROVED, STATUS.FAILED],
  [STATUS.APPROVAL_REQUIRED]: [STATUS.APPROVED, STATUS.REJECTED],
  [STATUS.APPROVED]: [STATUS.COMPLETED],
  [STATUS.COMPLETED]: [],
  [STATUS.REJECTED]: [],
  [STATUS.FAILED]: [],
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

module.exports = { canTransition };
