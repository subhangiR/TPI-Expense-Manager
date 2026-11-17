const express = require('express');
const controller = require('../controllers/events.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// The browser's EventSource cannot send an Authorization header, so for this one
// route we also accept the token as ?token=... and treat it like the normal header.
function tokenFromQuery(req, res, next) {
  if (!req.headers.authorization && typeof req.query.token === 'string') {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}

router.get('/', tokenFromQuery, authenticate, controller.stream);

module.exports = router;
