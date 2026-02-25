const Organization = require('../models/Organization');

// @desc    Get organization profile
// @route   GET /api/v1/organization
exports.getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization._id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update organization profile
// @route   PUT /api/v1/organization
exports.updateOrganization = async (req, res) => {
  try {
    const { name, tax_id, currency, address, email, phone, website } = req.body;
    const updateData = { name, tax_id, currency, address, email, phone, website };

    if (req.file) {
      updateData.logo_url = `${req.protocol}://${req.get('host')}/uploads/logos/${req.file.filename}`;
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organization._id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
