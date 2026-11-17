const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const loginLimiter = require('../middleware/loginLimiter');

const router = express.Router();

const loginSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .pipe(z.email('Enter a valid email address')),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.get('/me', authenticate, controller.me);

module.exports = router;
