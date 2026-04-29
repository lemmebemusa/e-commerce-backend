const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all products with cursor-based pagination
router.get('/', async (req, res) => {
  try {
    const { cursor, limit = 20, search, category, discounted, sort } = req.query;
    const params = [];
    let whereConditions = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.generic_name ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`c.name = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (discounted === 'true') {
      whereConditions.push(`p.discount_price IS NOT NULL`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderClause = 'ORDER BY p.created_at DESC';
    if (sort === 'az') {
      orderClause = 'ORDER BY p.name ASC';
    } else if (sort === 'price_asc') {
      orderClause = 'ORDER BY COALESCE(p.discount_price, p.price) ASC';
    } else if (sort === 'price_desc') {
      orderClause = 'ORDER BY COALESCE(p.discount_price, p.price) DESC';
    }

    // Cursor pagination
    if (cursor) {
      whereConditions.push(`p.id < $${paramIndex}`);
      params.push(cursor);
      paramIndex++;
    }

    const finalWhereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${finalWhereClause}
      ${orderClause}
      LIMIT ${parseInt(limit) + 1}
    `;

    const result = await pool.query(query, params);
    const hasMore = result.rows.length > parseInt(limit);

    const products = hasMore ? result.rows.slice(0, -1) : result.rows;
    const nextCursor = hasMore && products.length > 0 ? products[products.length - 1].id : null;

    res.json({
      products,
      pagination: {
        nextCursor,
        hasMore
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;