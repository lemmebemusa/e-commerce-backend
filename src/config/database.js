const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(255),
        generic_name VARCHAR(255),
        category_id UUID REFERENCES categories(id),
        price DECIMAL(10, 2) NOT NULL,
        discount_price DECIMAL(10, 2),
        availability VARCHAR(50) DEFAULT 'available',
        description TEXT,
        image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        order_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID,
        product_name VARCHAR(255),
        product_brand VARCHAR(255),
        product_generic_name VARCHAR(255),
        product_price DECIMAL(10, 2),
        product_discount_price DECIMAL(10, 2),
        quantity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        phone VARCHAR(20),
        photo VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image VARCHAR(500),
        link VARCHAR(500),
        title VARCHAR(255),
        subtitle VARCHAR(500),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
product_id UUID,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  logo_url VARCHAR(500),
  favicon VARCHAR(500),
  description TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  opening_hours TEXT,
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(50),
  google_maps_embed_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);

await client.query(`
  DO $$
  BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banners' AND column_name = 'product_id') THEN
  ALTER TABLE banners ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
  END IF;
  END $$;
  `);

  await client.query(`
  DO $$
  BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_info' AND column_name = 'favicon') THEN
  ALTER TABLE company_info ADD COLUMN favicon VARCHAR(500);
  END IF;
  END $$;
  `);

    const categoriesExist = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(categoriesExist.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO categories (name) VALUES
        ('Medicine'),
        ('Healthcare'),
        ('Beauty'),
        ('Baby Care'),
        ('Nutrition'),
        ('Medical Equipment')
      `);
    }

    const productsExist = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productsExist.rows[0].count) === 0) {
      const catResult = await client.query('SELECT id, name FROM categories');
      const categories = catResult.rows;
      const catIds = {
        'Medicine': categories.find(c => c.name === 'Medicine')?.id,
        'Healthcare': categories.find(c => c.name === 'Healthcare')?.id,
        'Beauty': categories.find(c => c.name === 'Beauty')?.id,
        'Baby Care': categories.find(c => c.name === 'Baby Care')?.id,
        'Nutrition': categories.find(c => c.name === 'Nutrition')?.id,
        'Medical Equipment': categories.find(c => c.name === 'Medical Equipment')?.id,
      };

      const sampleProducts = [
        ['Paracetamol 500mg', 'Square Pharma', 'Paracetamol', catIds['Medicine'], 25.00, 22.00, 'available', 'Pain reliever and fever reducer', '/uploads/paracetamol.jpg'],
        ['Napa Extra 500mg', 'Beximco Pharma', 'Paracetamol', catIds['Medicine'], 30.00, null, 'available', 'Fast relief from pain and fever', '/uploads/napa.jpg'],
        ['Omeprazole 20mg', 'Incepta Pharma', 'Omeprazole', catIds['Medicine'], 45.00, 40.00, 'available', 'Acid reflux treatment', '/uploads/omeprazole.jpg'],
        ['Cetirizine 10mg', 'Aristopharma', 'Cetirizine', catIds['Medicine'], 15.00, null, 'available', 'Anti-allergic medication', '/uploads/cetirizine.jpg'],
        ['Vitamin C 500mg', 'Renata', 'Ascorbic Acid', catIds['Nutrition'], 85.00, 75.00, 'available', 'Immune system support', '/uploads/vitamin_c.jpg'],
        ['Ibuprofen 400mg', 'ACI Pharma', 'Ibuprofen', catIds['Medicine'], 35.00, null, 'available', 'Anti-inflammatory pain relief', '/uploads/ibuprofen.jpg'],
        ['Amoxicillin 500mg', 'General Pharma', 'Amoxicillin', catIds['Medicine'], 55.00, 50.00, 'available', 'Antibiotic for bacterial infections', '/uploads/amoxicillin.jpg'],
        ['Blood Pressure Monitor', 'Omron', 'Digital BP Monitor', catIds['Medical Equipment'], 3500.00, 3200.00, 'available', 'Automatic digital blood pressure monitor', '/uploads/bp_monitor.jpg'],
        ['Digital Thermometer', 'Rossmax', 'Digital Thermometer', catIds['Medical Equipment'], 450.00, null, 'available', 'Fast and accurate temperature measurement', '/uploads/thermometer.jpg'],
        ['Face Moisturizer', 'Nivea', 'Moisturizing Cream', catIds['Beauty'], 350.00, 299.00, 'available', 'Daily hydration for soft skin', '/uploads/moisturizer.jpg'],
        ['Baby Diapers S', 'Huggies', 'Disposable Diapers', catIds['Baby Care'], 1200.00, 1050.00, 'available', 'Comfortable protection for babies', '/uploads/diapers.jpg'],
        ['ORS Sachets', 'Maya Pharma', 'Oral Rehydration Salt', catIds['Medicine'], 15.00, null, 'available', 'Rehydration solution', '/uploads/ors.jpg'],
        ['Multivitamin Syrup', 'Surgipharm', 'Multivitamin', catIds['Nutrition'], 180.00, 160.00, 'available', 'Complete vitamin supplement', '/uploads/multivitamin.jpg'],
        ['Hand Sanitizer', 'Life Buoy', 'Alcohol Sanitizer', catIds['Healthcare'], 120.00, null, 'available', 'Kills 99.9% germs', '/uploads/sanitizer.jpg'],
        ['Mask N95', 'Bangladd', 'Protective Mask', catIds['Healthcare'], 250.00, 220.00, 'available', '5-layer protective face mask', '/uploads/mask.jpg'],
        ['Aspirin 75mg', 'Drug International', 'Aspirin', catIds['Medicine'], 20.00, null, 'unavailable', 'Blood thinner and pain relief', '/uploads/aspirin.jpg'],
        ['Metformin 500mg', 'Sanofi', 'Metformin', catIds['Medicine'], 40.00, 35.00, 'available', 'Diabetes management', '/uploads/metformin.jpg'],
        ['Loratadine 10mg', 'Healthcare Pharma', 'Loratadine', catIds['Medicine'], 25.00, null, 'available', 'Non-drowsy antihistamine', '/uploads/loratadine.jpg'],
        ['Calcium Supplement', 'Osaka', 'Calcium Carbonate', catIds['Nutrition'], 450.00, 399.00, 'available', 'Bone health support', '/uploads/calcium.jpg'],
        ['Zinc Tablets', 'Sundora', 'Zinc Gluconate', catIds['Nutrition'], 180.00, null, 'available', 'Immune system booster', '/uploads/zinc.jpg'],
      ];

      for (const p of sampleProducts) {
        await client.query(
          `INSERT INTO products (name, brand, generic_name, category_id, price, discount_price, availability, description, image)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          p
        );
      }
    }

    const employeesExist = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(employeesExist.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO employees (name, role, phone, photo) VALUES
        ('Dr. Rafiq Islam', 'Chief Pharmacist', '01712345678', '/uploads/employee1.jpg'),
        ('Fatema Begum', 'Pharmacy Manager', '01812345678', '/uploads/employee2.jpg'),
        ('Karim Hassan', 'Sales Associate', '01912345678', '/uploads/employee3.jpg'),
        ('Nasrin Akter', 'Customer Support', '01612345678', '/uploads/employee4.jpg')
      `);
    }

const bannersExist = await client.query('SELECT COUNT(*) FROM banners');
if (parseInt(bannersExist.rows[0].count) === 0) {
  await client.query(`
    INSERT INTO banners (image, link, title, subtitle, display_order, is_active) VALUES
    ('https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200&h=400&fit=crop', '/', 'Flat 20% Off on Medicines', 'Use code HEALTH20 at checkout', 1, true),
    ('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&h=400&fit=crop', '/', 'Free Delivery on Orders Above ৳500', 'Safe and contactless delivery', 2, true),
    ('https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1200&h=400&fit=crop', '/', 'Health Essentials', 'Get your daily vitamins and supplements', 3, true)
  `);
}

const companyInfoExist = await client.query('SELECT COUNT(*) FROM company_info');
if (parseInt(companyInfoExist.rows[0].count) === 0) {
  await client.query(`
    INSERT INTO company_info (name, description, address, phone, email, opening_hours, emergency_contact, emergency_phone) VALUES
    ('Shovagh Pharmacy', 'Your trusted neighborhood pharmacy serving the community with quality medicines, healthcare products, and professional advice to help you and your family stay healthy.', 'Mirpur, Dhaka, Bangladesh', '+880 1XXX-XXXXXX', 'info@shovaghpharmacy.com', 'Sat - Thu: 8:00 AM - 10:00 PM\nFriday: 10:00 AM - 10:00 PM', '24/7 Emergency Line', '+880 1XXX-XXXXXX')
  `);
}

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
  }
};

module.exports = { pool, supabase, initDatabase };