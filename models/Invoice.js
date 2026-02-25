const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unit_price: { type: Number, required: true, min: 0 },
  line_total: { type: Number }, // calculated by backend
});

const invoiceSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    invoice_number: { type: String, unique: true, required: true },
    issue_date: { type: Date, required: true, default: Date.now },
    due_date: { type: Date },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Partial', 'Overdue'],
      default: 'Draft',
    },
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },    // calculated
    tax_rate: { type: Number, default: 13 },   // GST/HST %
    tax_amount: { type: Number, default: 0 },  // calculated
    total_amount: { type: Number, default: 0 }, // calculated
    notes: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Filter soft-deleted
invoiceSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeSoftDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Auto-calculate totals before save
invoiceSchema.pre('save', function (next) {
  // Calculate line_total for each item (backend-enforced)
  this.items.forEach((item) => {
    item.line_total = parseFloat((item.quantity * item.unit_price).toFixed(2));
  });
  this.subtotal = parseFloat(
    this.items.reduce((sum, item) => sum + item.line_total, 0).toFixed(2)
  );
  this.tax_amount = parseFloat(((this.subtotal * this.tax_rate) / 100).toFixed(2));
  this.total_amount = parseFloat((this.subtotal + this.tax_amount).toFixed(2));
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
