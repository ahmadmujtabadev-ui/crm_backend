const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/clients', require('./routes/clients'));
app.use('/api/v1/invoices', require('./routes/invoices'));
app.use('/api/v1/expenses', require('./routes/expenses'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/organization', require('./routes/organization'));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'CRM API is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CRM Server running on port ${PORT}`);
});

module.exports = app;


