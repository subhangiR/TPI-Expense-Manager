// The approval workflow. The backend alone decides every status change;
// the frontend only displays the status it gets back.
//
// Submit:  DRAFT -> SUBMITTED -> PROCESSING, then automatically:
//            amount <  threshold : PROCESSING -> APPROVED -> COMPLETED
//            amount >= threshold : PROCESSING -> APPROVAL_REQUIRED   (waits for an admin)
//            processing error    : PROCESSING -> FAILED
// Admin:   APPROVAL_REQUIRED -> APPROVED -> COMPLETED   (approve)
//          APPROVAL_REQUIRED -> REJECTED                (reject, comment required)
const env = require('../config/env');
const expenseModel = require('../models/expense.model');
const historyModel = require('../models/history.model');
const expenseService = require('./expense.service');
const withTransaction = require('../utils/transaction');
const eventBus = require('../utils/eventBus');
const ApiError = require('../utils/ApiError');
const { STATUS, STATUS_LABEL } = require('../constants/expense');
const { canTransition } = require('../constants/workflow');

// Must run inside a transaction so the status and the history are saved together.
async function changeStatus(client, { expenseId, from, to, action, comments, userId }) {
  if (!canTransition(from, to)) {
    throw new ApiError(409, 'This action is not available for the expense in its current status.');
  }

  const changed = await expenseModel.changeStatus(expenseId, from, to, client);
  if (!changed) {
    // Someone else (e.g. another admin) changed it a moment ago.
    throw new ApiError(409, 'This expense was just updated by someone else. Please refresh to see the latest status.');
  }

  await historyModel.add(
    { expense_id: expenseId, from_status: from, to_status: to, action, comments, performed_by: userId },
    client
  );
}

// Applies a list of steps in ONE transaction (all succeed or none are saved),
// then announces the change so connected browsers update.
async function applySteps(expense, steps, userId) {
  await withTransaction(async (client) => {
    let from = expense.status;
    for (const step of steps) {
      await changeStatus(client, { expenseId: expense.id, from, userId, ...step });
      from = step.to;
    }
  });

  const finalStatus = steps[steps.length - 1].to;
  eventBus.emit(eventBus.EXPENSE_CHANGED, {
    expenseId: expense.id,
    title: expense.title,
    employeeId: expense.employee_id,
    createdBy: expense.created_by,
    status: finalStatus,
  });
  return finalStatus;
}

// The automatic part after submitting. Kept separate because it can fail on its own.
async function processExpense(expense, userId) {
  const processing = { ...expense, status: STATUS.PROCESSING };

  try {
    if (expense.amount < env.approvalThreshold) {
      await applySteps(
        processing,
        [
          { to: STATUS.APPROVED, action: 'AUTO_APPROVE', comments: `Below the approval threshold of ${env.approvalThreshold}` },
          { to: STATUS.COMPLETED, action: 'COMPLETE' },
        ],
        userId
      );
    } else {
      await applySteps(processing, [{ to: STATUS.APPROVAL_REQUIRED, action: 'REQUEST_APPROVAL' }], userId);
    }
  } catch (error) {
    console.error(`Processing expense ${expense.id} failed:`, error);
    // The failed attempt was rolled back, so record the failure in its own transaction.
    await applySteps(
      processing,
      [{ to: STATUS.FAILED, action: 'FAIL', comments: 'Processing error' }],
      userId
    );
  }
}

async function submit(user, id) {
  const expense = await expenseService.getOwnExpense(user, id, 'You can only submit your own expenses.');

  if (expense.status !== STATUS.DRAFT) {
    throw new ApiError(409, `This expense is already ${STATUS_LABEL[expense.status]}. Only drafts can be submitted.`);
  }

  await applySteps(
    expense,
    [
      { to: STATUS.SUBMITTED, action: 'SUBMIT' },
      { to: STATUS.PROCESSING, action: 'PROCESS' },
    ],
    user.id
  );
  await processExpense(expense, user.id);

  return expenseModel.findById(id);
}

// Admin-only (the route enforces the role). The service still checks the status.
async function approve(user, id, comment) {
  const expense = await expenseModel.findById(id);
  if (!expense) throw new ApiError(404, 'We could not find this expense. It may have been deleted.');
  if (expense.status !== STATUS.APPROVAL_REQUIRED) {
    throw new ApiError(409, `This expense is ${STATUS_LABEL[expense.status]}, so it cannot be approved. Only expenses waiting for approval can be approved.`);
  }

  await applySteps(
    expense,
    [
      { to: STATUS.APPROVED, action: 'APPROVE', comments: comment },
      { to: STATUS.COMPLETED, action: 'COMPLETE' },
    ],
    user.id
  );
  return expenseModel.findById(id);
}

async function reject(user, id, comment) {
  const expense = await expenseModel.findById(id);
  if (!expense) throw new ApiError(404, 'We could not find this expense. It may have been deleted.');
  if (expense.status !== STATUS.APPROVAL_REQUIRED) {
    throw new ApiError(409, `This expense is ${STATUS_LABEL[expense.status]}, so it cannot be rejected. Only expenses waiting for approval can be rejected.`);
  }

  await applySteps(expense, [{ to: STATUS.REJECTED, action: 'REJECT', comments: comment }], user.id);
  return expenseModel.findById(id);
}

async function getHistory(user, id) {
  await expenseService.getAccessibleExpense(user, id, 'You can only view your own expenses.');
  return historyModel.findByExpenseId(id);
}

module.exports = { submit, approve, reject, getHistory };
