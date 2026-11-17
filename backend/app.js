const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // behind the nginx container, so rate limits see the real client address

// Docs page first: Swagger UI needs inline scripts that helmet's default policy blocks.
app.use('/api-docs', require('./routes/docs.routes'));

app.use(helmet());
app.use(cors({ origin: env.corsOrigin })); // only our frontend may call the API from a browser
app.use(express.json());
// Request log. The URL is logged with any ?token=... hidden (see the events route).
morgan.token('safe-url', (req) => req.originalUrl.replace(/token=[^&]*/, 'token=***'));
if (env.nodeEnv !== 'test') app.use(morgan(':method :safe-url :status :response-time ms'));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
