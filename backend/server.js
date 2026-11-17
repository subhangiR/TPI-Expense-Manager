const app = require('./app');
const env = require('./config/env');
const pool = require('./config/db');

// Refuse to start with a missing, placeholder or short signing key; tokens would be insecure.
if (!env.jwt.secret || env.jwt.secret.length < 32 || env.jwt.secret.startsWith('change_this')) {
  console.error('JWT_SECRET must be a random string of at least 32 characters. See .env.example.');
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
  // Open SSE streams never finish on their own, so close them or server.close() would wait forever.
  server.closeAllConnections();
  // Safety net: never hang longer than 10 seconds.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
