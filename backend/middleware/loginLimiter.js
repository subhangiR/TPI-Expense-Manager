const rateLimit = require('express-rate-limit');

// Slows down password guessing: 10 attempts per address, then a 15 minute wait.
module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }),
});
