const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo_url: { type: String, default: null },
    tax_id: { type: String, trim: true },
    currency: { type: String, default: 'CAD', enum: ['CAD', 'USD', 'EUR', 'GBP', 'PKR'] },
    address: { type: String },
    email: { type: String, lowercase: true },
    phone: { type: String },
    website: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
