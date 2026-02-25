const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSummary, getExpenseReport } = require('../controllers/reportController');

router.use(protect);

router.get('/summary', getSummary);
router.get('/expenses', getExpenseReport);

module.exports = router;
