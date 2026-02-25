const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const generateInvoiceNumber = require('../utils/generateInvoiceNumber');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

// @desc    Get all invoices (paginated, filter by status/date)
// @route   GET /api/v1/invoices
exports.getInvoices = async (req, res) => {
  try {
    const { status, startDate, endDate, client, page = 1, limit = 10 } = req.query;
    const orgId = req.user.organization._id;

    const query = { organization: orgId };
    if (status) query.status = status;
    if (client) query.client = client;
    if (startDate || endDate) {
      query.issue_date = {};
      if (startDate) query.issue_date.$gte = new Date(startDate);
      if (endDate) query.issue_date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('client', 'companyName contactPerson email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: invoices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single invoice
// @route   GET /api/v1/invoices/:id
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, organization: req.user.organization._id })
      .populate('client')
      .populate('organization');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create invoice with items (atomic)
// @route   POST /api/v1/invoices
exports.createInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { client: clientId, issue_date, due_date, status, items, notes, tax_rate } = req.body;
    const orgId = req.user.organization._id;

    // Validate client belongs to org
    const client = await Client.findOne({ _id: clientId, organization: orgId });
    if (!client) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (!items || !items.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    const invoice_number = await generateInvoiceNumber();

    const [invoice] = await Invoice.create(
      [
        {
          organization: orgId,
          client: clientId,
          invoice_number,
          issue_date: issue_date || new Date(),
          due_date,
          status: status || 'Draft',
          items,
          tax_rate: tax_rate !== undefined ? tax_rate : 13,
          notes,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    await invoice.populate('client', 'companyName contactPerson email');

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Update invoice status
// @route   PATCH /api/v1/invoices/:id/status
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Draft', 'Sent', 'Paid', 'Partial', 'Overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization._id },
      { status },
      { new: true }
    ).populate('client', 'companyName email');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update full invoice
// @route   PUT /api/v1/invoices/:id
exports.updateInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, due_date, status, notes, tax_rate } = req.body;
    const orgId = req.user.organization._id;

    const invoice = await Invoice.findOne({ _id: req.params.id, organization: orgId });
    if (!invoice) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (items) invoice.items = items;
    if (due_date) invoice.due_date = due_date;
    if (status) invoice.status = status;
    if (notes !== undefined) invoice.notes = notes;
    if (tax_rate !== undefined) invoice.tax_rate = tax_rate;

    await invoice.save({ session });
    await session.commitTransaction();

    res.json({ success: true, data: invoice });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Generate and download PDF
// @route   GET /api/v1/invoices/:id/download
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, organization: req.user.organization._id })
      .populate('client')
      .populate('organization');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const filePath = await generateInvoicePDF(invoice, invoice.organization);

    res.download(filePath, `invoice-${invoice.invoice_number}.pdf`, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Soft delete invoice
// @route   DELETE /api/v1/invoices/:id
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization._id },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted (soft)' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
