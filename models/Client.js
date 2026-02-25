const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: { type: String, trim: true },
    address: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    deletedAt: { type: Date, default: null }, // soft delete
    notes: { type: String },
  },
  { timestamps: true }
);

// Compound unique index: companyName unique per organization
clientSchema.index({ companyName: 1, organization: 1 }, { unique: true });

// Filter soft-deleted by default
clientSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeSoftDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

module.exports = mongoose.model('Client', clientSchema);
