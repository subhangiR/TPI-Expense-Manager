// Server-Sent Events (SSE): a one-way stream from server to browser over plain HTTP.
// The browser keeps one connection open; we write a message whenever an expense changes.
//
// Who receives what:
//   admins -> every expense change
//   users  -> only changes to expenses that are theirs
const eventBus = require('../utils/eventBus');

const HEARTBEAT_MS = 25000; // a comment line now and then keeps proxies from closing the connection
const clients = new Set(); // everyone currently connected: { user, res }

const canReceive = (user, event) =>
  user.role === 'admin' ||
  String(event.employeeId) === String(user.id) ||
  String(event.createdBy) === String(user.id);

// SSE message format: "event: <name>\ndata: <json>\n\n"
function send(res, name, data) {
  res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function addClient(user, res) {
  const client = { user, res };
  clients.add(client);

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  res.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });

  send(res, 'connected', { userId: user.id });
}

eventBus.on(eventBus.EXPENSE_CHANGED, (event) => {
  for (const client of clients) {
    if (canReceive(client.user, event)) send(client.res, 'expense-updated', event);
  }
});

module.exports = { addClient, clientCount: () => clients.size };
