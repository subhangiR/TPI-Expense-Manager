const express = require('express');
const lookupModel = require('../models/lookup.model');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// authenticate is added per route (not router.use) because this router is mounted at "/",
// and we don't want unknown URLs to answer 401 instead of 404.
router.get('/departments', authenticate, async (req, res) => {
  const departments = await lookupModel.findDepartments();
  res.json({ success: true, data: { departments } });
});

router.get('/categories', authenticate, async (req, res) => {
  const categories = await lookupModel.findCategories();
  res.json({ success: true, data: { categories } });
});

module.exports = router;
