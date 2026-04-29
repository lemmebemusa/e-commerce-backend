const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { initDatabase } = require('./src/config/database');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const bannerRoutes = require('./src/routes/bannerRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - allow frontend domain injected at runtime
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));

app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Keep-alive cron job - runs every 2 hours to prevent HF Spaces from idling
cron.schedule('0 */2 * * *', () => {
  const keepAliveUrl = process.env.KEEP_ALIVE_URL;
  if (keepAliveUrl) {
    fetch(`${keepAliveUrl}/api/health`)
      .then(res => res.json())
      .then(data => console.log(`[${new Date().toISOString()}] Keep-alive ping sent:`, data.status))
      .catch(err => console.error(`[${new Date().toISOString()}] Keep-alive ping failed:`, err.message));
  }
});

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});

module.exports = app;