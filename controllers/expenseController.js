const Expense = require('../models/Expense');

// @desc    Get all expenses (filter by category/date)
// @route   GET /api/v1/expenses
exports.getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 10 } = req.query;
    const orgId = req.user.organization._id;

    const query = { organization: orgId };
    if (category) query.category = category;
    if (startDate || endDate) {
      query.expense_date = {};
      if (startDate) query.expense_date.$gte = new Date(startDate);
      if (endDate) query.expense_date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(query).sort({ expense_date: -1 }).skip(skip).limit(Number(limit)),
      Expense.countDocuments(query),
    ]);

    // Monthly total for summary
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyResult = await Expense.aggregate([
      { $match: { organization: orgId, expense_date: { $gte: startOfMonth }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthlyTotal = monthlyResult[0]?.total || 0;

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      monthlyTotal,
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single expense
// @route   GET /api/v1/expenses/:id
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, organization: req.user.organization._id });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create expense
// @route   POST /api/v1/expenses
exports.createExpense = async (req, res) => {
  try {
    const { category, amount, expense_date, description } = req.body;
    const orgId = req.user.organization._id;

    const receipt_url = req.file
      ? `${req.protocol}://${req.get('host')}/uploads/receipts/${req.file.filename}`
      : null;

    const expense = await Expense.create({
      organization: orgId,
      category,
      amount,
      expense_date: expense_date || new Date(),
      description,
      receipt_url,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/v1/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const { category, amount, expense_date, description } = req.body;
    const updateData = { category, amount, expense_date, description };

    if (req.file) {
      updateData.receipt_url = `${req.protocol}://${req.get('host')}/uploads/receipts/${req.file.filename}`;
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization._id },
      updateData,
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Soft delete expense
// @route   DELETE /api/v1/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization._id },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted (soft)' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
