const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_info LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({});
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;