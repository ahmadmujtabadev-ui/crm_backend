const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    category: {
      type: String,
      required: true,
      enum: ['Rent', 'Payroll', 'Supplies', 'Software', 'Marketing', 'Travel', 'Utilities', 'Other'],
    },
    amount: { type: Number, required: true, min: 0 },
    expense_date: { type: Date, required: true, default: Date.now },
    receipt_url: { type: String, default: null },
    description: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

expenseSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeSoftDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
