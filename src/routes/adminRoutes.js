const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../config/database');
const storage = require('../config/storage');

const upload = multer({ storage: multer.memoryStorage() });

const authMiddleware = (req, res, next) => {
  const { password } = req.headers;
  if (password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

router.get('/verify', authMiddleware, (req, res) => {
  res.json({ success: true });
});

router.get('/products', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/products', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, brand, genericName, categoryId, price, discountPrice, availability, description } = req.body;

    let imageUrl = null;
    if (req.file) {
      const result = await storage.uploadImage(req.file.buffer, req.file.originalname);
      if (result.success) {
        imageUrl = result.url;
      }
    }

    const result = await pool.query(
      `INSERT INTO products (name, brand, generic_name, category_id, price, discount_price, availability, description, image)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, brand, genericName, categoryId, price, discountPrice, availability || 'available', description, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/products/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, genericName, categoryId, price, discountPrice, availability, description, existingImage } = req.body;

    let imageUrl = existingImage;
    if (req.file) {
      const result = await storage.uploadImage(req.file.buffer, req.file.originalname);
      if (result.success) {
        imageUrl = result.url;
      }
    }

    const result = await pool.query(
      `UPDATE products
      SET name = $1, brand = $2, generic_name = $3, category_id = $4,
      price = $5, discount_price = $6, availability = $7, description = $8, image = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 RETURNING *`,
      [name, brand, genericName, categoryId, price, discountPrice, availability, description, imageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await pool.query('SELECT image FROM products WHERE id = $1', [id]);

    if (product.rows.length > 0 && product.rows[0].image) {
      const fileName = product.rows[0].image.split('/').pop();
      await storage.deleteImage(fileName);
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/products/:id/availability', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;

    const result = await pool.query(
      `UPDATE products SET availability = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [availability, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const productsUsingCategory = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [id]
    );

    if (parseInt(productsUsingCategory.rows[0].count) > 0) {
      return res.status(400).json({
        error: `Cannot delete category. ${productsUsingCategory.rows[0].count} product(s) are using this category. Please reassign or delete those products first.`
      });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const { phone } = req.query;
    let query = `
      SELECT o.*,
      (SELECT json_agg(json_build_object(
        'id', oi.id,
        'productId', oi.product_id,
        'productName', oi.product_name,
        'productBrand', oi.product_brand,
        'productGenericName', oi.product_generic_name,
        'productPrice', oi.product_price,
        'productDiscountPrice', oi.product_discount_price,
        'quantity', oi.quantity
      )) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
    `;

    const params = [];
    if (phone) {
      query += ' WHERE o.phone = $1';
      params.push(phone);
    }
    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (orderStatus) {
      updates.push(`order_status = $${paramIndex}`);
      params.push(orderStatus);
      paramIndex++;
    }
    if (paymentStatus) {
      updates.push(`payment_status = $${paramIndex}`);
      params.push(paymentStatus);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders/export/csv', authMiddleware, async (req, res) => {
  try {
    const { phone } = req.query;
    let query = `
      SELECT o.id, o.customer_name, o.phone, o.address, o.payment_status, o.order_status, o.created_at,
      (SELECT string_agg(oi.product_name || ' x' || oi.quantity, '; ') FROM order_items oi WHERE oi.order_id = o.id) as products
      FROM orders o
    `;

    const params = [];
    if (phone) {
      query += ' WHERE o.phone = $1';
      params.push(phone);
    }
    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);

    const headers = ['ID', 'Customer', 'Phone', 'Address', 'Products', 'Payment Status', 'Order Status', 'Date'];
    const csvRows = [headers.join(',')];

    for (const order of result.rows) {
      csvRows.push([
        order.id,
        `"${order.customer_name}"`,
        order.phone,
        `"${order.address.replace(/"/g, '""')}"`,
        `"${order.products || ''}"`,
        order.payment_status,
        order.order_status,
        order.created_at
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
    const totalRevenue = await pool.query(`
      SELECT COALESCE(SUM(oi.product_price * oi.quantity), 0) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'paid'
    `);
    const pendingOrders = await pool.query("SELECT COUNT(*) FROM orders WHERE order_status = 'pending'");
    const totalProducts = await pool.query('SELECT COUNT(*) FROM products');
    const totalCategories = await pool.query('SELECT COUNT(*) FROM categories');
    const totalEmployees = await pool.query('SELECT COUNT(*) FROM employees');

    const recentOrders = await pool.query(`
      SELECT o.*,
      (SELECT json_agg(json_build_object(
        'productName', oi.product_name,
        'quantity', oi.quantity,
        'productPrice', oi.product_price
      )) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.json({
      totalOrders: parseInt(totalOrders.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      totalProducts: parseInt(totalProducts.rows[0].count),
      totalCategories: parseInt(totalCategories.rows[0].count),
      totalEmployees: parseInt(totalEmployees.rows[0].count),
      recentOrders: recentOrders.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/employees', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/employees', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { name, role, phone } = req.body;

    let photoUrl = null;
    if (req.file) {
      const result = await storage.uploadEmployeePhoto(req.file.buffer, req.file.originalname);
      if (result.success) {
        photoUrl = result.url;
      }
    }

    const result = await pool.query(
      'INSERT INTO employees (name, role, phone, photo) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, role, phone, photoUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/employees/:id', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, phone, existingPhoto } = req.body;

    let photoUrl = existingPhoto;
    if (req.file) {
      const result = await storage.uploadEmployeePhoto(req.file.buffer, req.file.originalname);
      if (result.success) {
        photoUrl = result.url;
      }
    }

    const result = await pool.query(
      'UPDATE employees SET name = $1, role = $2, phone = $3, photo = $4 WHERE id = $5 RETURNING *',
      [name, role, phone, photoUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/employees/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await pool.query('SELECT photo FROM employees WHERE id = $1', [id]);

    if (employee.rows.length > 0 && employee.rows[0].photo) {
      const fileName = employee.rows[0].photo.split('/').pop();
      await storage.deleteImage(fileName);
    }

    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/banners', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, p.name as product_name, p.image as product_image, p.price as product_price, p.discount_price as product_discount_price
      FROM banners b
      LEFT JOIN products p ON b.product_id = p.id
      ORDER BY b.display_order ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/banners', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { link, title, subtitle, display_order, is_active, product_id } = req.body;

    let imageUrl = null;
    if (req.file) {
      console.log('Uploading banner image:', req.file.originalname, req.file.size, 'bytes');
      const result = await storage.uploadBanner(req.file.buffer, req.file.originalname);
      console.log('Upload result:', JSON.stringify(result));
      if (result.success) {
        imageUrl = result.url;
        console.log('Image uploaded successfully:', imageUrl);
      } else {
        console.error('Banner upload failed:', result.error);
      }
    } else {
      console.log('No image file in request');
    }

    const result = await pool.query(
      `INSERT INTO banners (image, link, title, subtitle, display_order, is_active, product_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [imageUrl, link, title, subtitle, display_order || 0, is_active !== 'false', product_id || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/banners/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { link, title, subtitle, display_order, is_active, product_id, image } = req.body;

    let imageUrl = image;
    if (req.file) {
      const result = await storage.uploadBanner(req.file.buffer, req.file.originalname);
      if (result.success) {
        imageUrl = result.url;
      }
    }

    const result = await pool.query(
      `UPDATE banners SET image = $1, link = $2, title = $3, subtitle = $4,
      display_order = $5, is_active = $6, product_id = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *`,
      [imageUrl, link, title, subtitle, display_order, is_active !== 'false', product_id || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/banners/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await pool.query('SELECT image FROM banners WHERE id = $1', [id]);

    if (banner.rows.length > 0 && banner.rows[0].image) {
      const fileName = banner.rows[0].image.split('/').pop();
      await storage.deleteImage(fileName);
    }

    await pool.query('DELETE FROM banners WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/company', authMiddleware, async (req, res) => {
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

router.put('/company', authMiddleware, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), async (req, res) => {
  try {
    let { name, logo_url, favicon, description, address, phone, email, opening_hours, emergency_contact, emergency_phone, google_maps_embed_url } = req.body;

    if (req.files?.logo) {
      const result = await storage.uploadImage(req.files.logo[0].buffer, req.files.logo[0].originalname);
      if (result.success) {
        logo_url = result.url;
      } else {
        return res.status(500).json({ error: 'Failed to upload logo' });
      }
    }

    if (req.files?.favicon) {
      const result = await storage.uploadImage(req.files.favicon[0].buffer, req.files.favicon[0].originalname);
      if (result.success) {
        favicon = result.url;
      } else {
        return res.status(500).json({ error: 'Failed to upload favicon' });
      }
    }

    const existingResult = await pool.query('SELECT id FROM company_info LIMIT 1');

    let result;
    if (existingResult.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO company_info (name, logo_url, favicon, description, address, phone, email, opening_hours, emergency_contact, emergency_phone, google_maps_embed_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [name, logo_url, favicon, description, address, phone, email, opening_hours, emergency_contact, emergency_phone, google_maps_embed_url]);
    } else {
      result = await pool.query(`
        UPDATE company_info SET
          name = $1, logo_url = $2, favicon = $3, description = $4, address = $5, phone = $6,
          email = $7, opening_hours = $8, emergency_contact = $9, emergency_phone = $10,
          google_maps_embed_url = $11, updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *
      `, [name, logo_url, favicon, description, address, phone, email, opening_hours, emergency_contact, emergency_phone, google_maps_embed_url, existingResult.rows[0].id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating company info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const result = await storage.uploadImage(req.file.buffer, req.file.originalname);

  if (result.success) {
    res.json({ url: result.url });
  } else {
    res.status(500).json({ error: result.error });
  }
});

module.exports = router;