const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Create order
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customerName, phone, address, items } = req.body;

    if (!customerName || !phone || !address || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate BD phone format
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use BD format: 01XXXXXXXXX' });
    }

    await client.query('BEGIN');

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_name, phone, address)
       VALUES ($1, $2, $3) RETURNING *`,
      [customerName, phone, address]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items
         (order_id, product_id, product_name, product_brand, product_generic_name, product_price, product_discount_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [order.id, item.productId, item.name, item.brand, item.genericName, item.price, item.discountPrice, item.quantity]
      );
    }

    await client.query('COMMIT');

    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get orders by phone
router.get('/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const result = await pool.query(
      `SELECT o.*,
        (SELECT json_agg(json_build_object(
          'id', oi.id,
          'productName', oi.product_name,
          'productBrand', oi.product_brand,
          'productGenericName', oi.product_generic_name,
          'productPrice', oi.product_price,
          'productDiscountPrice', oi.product_discount_price,
          'quantity', oi.quantity
        )) FROM order_items oi WHERE oi.order_id = o.id) as items
       FROM orders o
       WHERE o.phone = $1
       ORDER BY o.created_at DESC`,
      [phone]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;