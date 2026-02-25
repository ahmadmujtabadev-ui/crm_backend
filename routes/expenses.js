const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');

router.use(protect);

router.route('/').get(getExpenses).post(upload.single('receipt'), createExpense);
router.route('/:id').get(getExpense).put(upload.single('receipt'), updateExpense).delete(deleteExpense);

module.exports = router;
