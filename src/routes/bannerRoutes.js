const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, p.name as product_name, p.image as product_image, p.price as product_price,
             p.discount_price as product_discount_price, p.availability as product_availability,
             p.brand as product_brand, p.generic_name as product_generic_name,
             p.description as product_description, p.category_id as product_category_id,
             p.id as product_real_id, c.name as category_name
      FROM banners b
      LEFT JOIN products p ON b.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE b.is_active = true
      ORDER BY b.display_order ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;