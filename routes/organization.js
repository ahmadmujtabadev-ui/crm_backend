const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getOrganization, updateOrganization } = require('../controllers/organizationController');

router.use(protect);

router.route('/').get(getOrganization).put(upload.single('logo'), updateOrganization);

module.exports = router;
