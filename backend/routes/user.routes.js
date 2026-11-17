const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

const idParams = z.object({
  id: z.coerce.number({ error: 'User id must be a number' }).int().positive(),
});

const listQuery = z.object({
  search: z.string().trim().optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const updateBody = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(100, 'Name is too long').optional(),
    role: z.enum(['user', 'admin'], { error: 'Role must be user or admin' }).optional(),
    status: z.enum(['active', 'inactive'], { error: 'Status must be active or inactive' }).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });

router.use(authenticate);

router.get('/', authorize('admin'), validate(listQuery, 'query'), controller.list);
router.get('/:id', validate(idParams, 'params'), controller.getById); // admin, or the user themselves
router.patch('/:id', authorize('admin'), validate(idParams, 'params'), validate(updateBody), controller.update);

module.exports = router;
