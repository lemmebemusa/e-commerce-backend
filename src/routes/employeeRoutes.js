const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all employees (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, role, photo FROM employees ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;