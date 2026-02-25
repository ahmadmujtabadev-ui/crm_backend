const Invoice = require('../models/Invoice');

const generateInvoiceNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;

  // Count existing invoices this month to get next number
  const count = await Invoice.countDocuments({
    invoice_number: new RegExp(`^${prefix}`),
  }).setOptions({ includeSoftDeleted: true });

  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

module.exports = generateInvoiceNumber;
