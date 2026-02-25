const Client = require('../models/Client');
const Invoice = require('../models/Invoice');

// @desc    Get all clients (paginated + searchable)
// @route   GET /api/v1/clients
exports.getClients = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const orgId = req.user.organization._id;

    const query = { organization: orgId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [clients, total] = await Promise.all([
      Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Client.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: clients,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single client + invoice history
// @route   GET /api/v1/clients/:id
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, organization: req.user.organization._id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const invoices = await Invoice.find({ client: client._id }).sort({ createdAt: -1 }).select('invoice_number status total_amount issue_date due_date');

    res.json({ success: true, data: { ...client.toObject(), invoices } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create client
// @route   POST /api/v1/clients
exports.createClient = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, address } = req.body;
    const orgId = req.user.organization._id;

    // Check unique company name per org
    const existing = await Client.findOne({ companyName: { $regex: `^${companyName}$`, $options: 'i' }, organization: orgId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Company name already exists in your organization' });
    }

    const client = await Client.create({ organization: orgId, companyName, contactPerson, email, phone, address });
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Company name or email already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update client
// @route   PUT /api/v1/clients/:id
exports.updateClient = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, address } = req.body;
    const orgId = req.user.organization._id;

    // Check unique company name (exclude current)
    if (companyName) {
      const existing = await Client.findOne({
        companyName: { $regex: `^${companyName}$`, $options: 'i' },
        organization: orgId,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Company name already exists' });
      }
    }

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, organization: orgId },
      { companyName, contactPerson, email, phone, address },
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Soft delete client (deactivate)
// @route   DELETE /api/v1/clients/:id
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization._id },
      { deletedAt: new Date(), status: 'inactive' },
      { new: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    res.json({ success: true, message: 'Client deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
