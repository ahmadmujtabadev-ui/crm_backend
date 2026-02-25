const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Client = require('../models/Client');
const mongoose = require('mongoose');

// @desc    Get dashboard summary
// @route   GET /api/v1/reports/summary
exports.getSummary = async (req, res) => {
  try {
    const orgId = req.user.organization._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Total revenue (Paid invoices)
    const revenueResult = await Invoice.aggregate([
      { $match: { organization: orgId, status: 'Paid', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]);

    // Monthly revenue
    const monthlyRevenueResult = await Invoice.aggregate([
      { $match: { organization: orgId, status: 'Paid', issue_date: { $gte: startOfMonth }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]);

    // Total expenses
    const expenseResult = await Expense.aggregate([
      { $match: { organization: orgId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Monthly expenses
    const monthlyExpenseResult = await Expense.aggregate([
      { $match: { organization: orgId, expense_date: { $gte: startOfMonth }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Outstanding invoices (not paid)
    const outstandingResult = await Invoice.aggregate([
      { $match: { organization: orgId, status: { $in: ['Sent', 'Partial', 'Overdue'] }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } },
    ]);

    // Top clients by revenue
    const topClients = await Invoice.aggregate([
      { $match: { organization: orgId, status: 'Paid', deletedAt: null } },
      { $group: { _id: '$client', totalRevenue: { $sum: '$total_amount' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
      { $unwind: '$client' },
      { $project: { 'client.companyName': 1, 'client.email': 1, totalRevenue: 1 } },
    ]);

    // Revenue vs Expenses chart data (last 12 months)
    const revenueByMonth = await Invoice.aggregate([
      { $match: { organization: orgId, status: 'Paid', issue_date: { $gte: startOfYear }, deletedAt: null } },
      { $group: { _id: { month: { $month: '$issue_date' }, year: { $year: '$issue_date' } }, revenue: { $sum: '$total_amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const expensesByMonth = await Expense.aggregate([
      { $match: { organization: orgId, expense_date: { $gte: startOfYear }, deletedAt: null } },
      { $group: { _id: { month: { $month: '$expense_date' }, year: { $year: '$expense_date' } }, expenses: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Invoice status breakdown
    const statusBreakdown = await Invoice.aggregate([
      { $match: { organization: orgId, deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total_amount' } } },
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const totalExpenses = expenseResult[0]?.total || 0;
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;
    const monthlyExpenses = monthlyExpenseResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        quickStats: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          monthlyRevenue,
          monthlyExpenses,
          monthlyProfit: monthlyRevenue - monthlyExpenses,
          outstandingInvoices: {
            amount: outstandingResult[0]?.total || 0,
            count: outstandingResult[0]?.count || 0,
          },
        },
        topClients,
        statusBreakdown,
        charts: {
          revenueByMonth,
          expensesByMonth,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get expenses list for reports (filter by category/date)
// @route   GET /api/v1/reports/expenses
exports.getExpenseReport = async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    const orgId = req.user.organization._id;

    const match = { organization: orgId, deletedAt: null };
    if (category) match.category = category;
    if (startDate || endDate) {
      match.expense_date = {};
      if (startDate) match.expense_date.$gte = new Date(startDate);
      if (endDate) match.expense_date.$lte = new Date(endDate);
    }

    const [expenses, categoryBreakdown] = await Promise.all([
      Expense.find(match).sort({ expense_date: -1 }),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      data: {
        expenses,
        categoryBreakdown,
        grandTotal,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
