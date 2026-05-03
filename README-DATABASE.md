# Database Setup with Supabase

Complete guide to set up Supabase for the pharmacy e-commerce application.

---

## Your Supabase Credentials

- **Project URL:** `https://vnxswemphmubnhcyquph.supabase.co`
- **Database:** `postgresql://postgres:AMAR.naam.123@db.vnxswemphmubnhcyquph.supabase.co:5432/postgres`

---

## Architecture

```
Frontend (React App) → Backend API (Express) → Supabase PostgreSQL + Storage
```

The frontend **never** connects directly to the database. It only talks to the backend.

---

## Step 1: Create Storage Bucket

Images are stored in Supabase Storage. You need to create a bucket:

1. Go to [supabase.com](https://supabase.com) and open your project
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Name it exactly: `product-images`
5. Select **Public** bucket (so images are accessible publicly)
6. Click **Create bucket**

---

## Step 2: Set Storage Policies

After creating the bucket, you need to allow public access:

1. In Storage, click on **product-images** bucket
2. Go to the **Policies** tab
3. Click **New Policy**
4. Select **Create a policy from scratch**
5. Name it: `Public Read Access`
6. For **Allowed operation**, select: `SELECT`
7. For **Target schema**, select: `public`
8. Click **Create policy**

Or run this in Supabase SQL Editor:

```sql
-- Allow public read access to product-images bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated uploads
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');
```

---

## Step 3: Verify .env Configuration

Your `backend/.env` should have:

```env
SUPABASE_URL=https://vnxswemphmubnhcyquph.supabase.co
SUPABASE_ANON_KEY=sb_publishable_GkFtSWK2REUB4jbY1jW47Q_v7dyr7gF
DATABASE_URL=postgresql://postgres:AMAR.naam.123@db.vnxswemphmubnhcyquph.supabase.co:5432/postgres
PORT=5000
NODE_ENV=development
ADMIN_PASSWORD=shovagh_admin_2024
```

---

## Step 4: Start the Backend

```bash
cd backend
npm run dev
```

On first run, the app will:
1. Connect to your Supabase database
2. Create all tables automatically (categories, products, orders, etc.)
3. Insert sample data

You should see:
```
Connected to PostgreSQL database
Database initialized successfully
Server running on port 5000
```

---

## Image Compression

All images uploaded are automatically compressed:

| Type | Max Width | Max Height | Quality |
|------|-----------|------------|---------|
| Products | 1200px | 1200px | 80% |
| Banners | 1400px | 500px | 80% |
| Employees | 600px | 600px | 85% |

Images are converted to JPEG and optimized for web.

---

## Database Schema

Tables created automatically:

| Table | Description |
|-------|-------------|
| `categories` | Product categories (Medicine, Healthcare, etc.) |
| `products` | Product catalog with images stored in Supabase Storage |
| `orders` | Customer orders |
| `order_items` | Items within each order |
| `employees` | Staff members with photos in Supabase Storage |
| `banners` | Promotional banners with images |

---

## Troubleshooting

### "Connection refused"
- Verify DATABASE_URL is correct in `.env`
- Check if Supabase project is active (not paused)

### "Storage bucket not found"
- Create a bucket named exactly `product-images` in Supabase Storage
- Make sure the bucket is set to **Public**

### "Could not find the DLL for sharp"
- If you see this on Windows, run: `npm rebuild sharp`

### "Unauthorized" when uploading
- Make sure the Storage policies allow INSERT for authenticated users
- The app uses the anon key for uploads

---

## Testing the API

```bash
# Health check
curl http://localhost:5000/api/health

# Get all products
curl http://localhost:5000/api/products

# Get categories
curl http://localhost:5000/api/categories
```

---

## For New Deployments

When deploying to a new pharmacy:

1. Copy the project
2. Create new Supabase project or use existing
3. Update `.env` with new credentials
4. Create `product-images` storage bucket
5. Set Storage policies
6. Run `npm start`

Tables are auto-created on first run.

---

## Row Level Security (RLS) Policies

Run these SQL commands in **Supabase SQL Editor** to set up proper access policies.

### Enable RLS on All Tables

```sql
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
```

### Categories Table Policies

```sql
-- Allow everyone to read categories (public)
CREATE POLICY "Public can view categories"
ON categories FOR SELECT
USING (true);

-- Allow authenticated users to insert categories (backend only)
CREATE POLICY "Authenticated can insert categories"
ON categories FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to update categories
CREATE POLICY "Authenticated can update categories"
ON categories FOR UPDATE
USING (true);

-- Allow authenticated users to delete categories
CREATE POLICY "Authenticated can delete categories"
ON categories FOR DELETE
USING (true);
```

### Products Table Policies

```sql
-- Allow everyone to read products (public)
CREATE POLICY "Public can view products"
ON products FOR SELECT
USING (true);

-- Allow authenticated users to insert products
CREATE POLICY "Authenticated can insert products"
ON products FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to update products
CREATE POLICY "Authenticated can update products"
ON products FOR UPDATE
USING (true);

-- Allow authenticated users to delete products
CREATE POLICY "Authenticated can delete products"
ON products FOR DELETE
USING (true);
```

### Orders Table Policies

```sql
-- Allow everyone to create orders (customers placing orders)
CREATE POLICY "Public can create orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Allow everyone to view their own orders (by phone)
CREATE POLICY "Public can view own orders"
ON orders FOR SELECT
USING (true);

-- Allow authenticated users to update orders
CREATE POLICY "Authenticated can update orders"
ON orders FOR UPDATE
USING (true);

-- Allow authenticated users to delete orders
CREATE POLICY "Authenticated can delete orders"
ON orders FOR DELETE
USING (true);
```

### Order Items Table Policies

```sql
-- Allow reading order items (for viewing order details)
CREATE POLICY "Public can view order items"
ON order_items FOR SELECT
USING (true);

-- Allow creating order items
CREATE POLICY "Public can create order items"
ON order_items FOR INSERT
WITH CHECK (true);

-- Allow updating order items
CREATE POLICY "Authenticated can update order items"
ON order_items FOR UPDATE
USING (true);

-- Allow deleting order items
CREATE POLICY "Authenticated can delete order items"
ON order_items FOR DELETE
USING (true);
```

### Employees Table Policies

```sql
-- Allow everyone to read employees (public - for About page)
CREATE POLICY "Public can view employees"
ON employees FOR SELECT
USING (true);

-- Allow authenticated users to insert employees
CREATE POLICY "Authenticated can insert employees"
ON employees FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to update employees
CREATE POLICY "Authenticated can update employees"
ON employees FOR UPDATE
USING (true);

-- Allow authenticated users to delete employees
CREATE POLICY "Authenticated can delete employees"
ON employees FOR DELETE
USING (true);
```

### Banners Table Policies

```sql
-- Allow everyone to read banners (public)
CREATE POLICY "Public can view banners"
ON banners FOR SELECT
USING (true);

-- Allow authenticated users to insert banners
CREATE POLICY "Authenticated can insert banners"
ON banners FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to update banners
CREATE POLICY "Authenticated can update banners"
ON banners FOR UPDATE
USING (true);

-- Allow authenticated users to delete banners
CREATE POLICY "Authenticated can delete banners"
ON banners FOR DELETE
USING (true);
```

### Storage Policies (product-images bucket)

```sql
-- Allow public read access to images (for displaying on website)
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload images (backend uploads)
CREATE POLICY "Authenticated can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to update images
CREATE POLICY "Authenticated can update images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');
```

---

## Quick RLS Setup (All in One)

Copy and paste this entire block into SQL Editor to set up all policies at once:

```sql
-- ========================================
-- Enable RLS on all tables
-- ========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Categories Policies
-- ========================================
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories"
ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert categories" ON categories;
CREATE POLICY "Authenticated can insert categories"
ON categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update categories" ON categories;
CREATE POLICY "Authenticated can update categories"
ON categories FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated can delete categories" ON categories;
CREATE POLICY "Authenticated can delete categories"
ON categories FOR DELETE USING (true);

-- ========================================
-- Products Policies
-- ========================================
DROP POLICY IF EXISTS "Public can view products" ON products;
CREATE POLICY "Public can view products"
ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert products" ON products;
CREATE POLICY "Authenticated can insert products"
ON products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update products" ON products;
CREATE POLICY "Authenticated can update products"
ON products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated can delete products" ON products;
CREATE POLICY "Authenticated can delete products"
ON products FOR DELETE USING (true);

-- ========================================
-- Orders Policies
-- ========================================
DROP POLICY IF EXISTS "Public can create orders" ON orders;
CREATE POLICY "Public can create orders"
ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view own orders" ON orders;
CREATE POLICY "Public can view own orders"
ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can update orders" ON orders;
CREATE POLICY "Authenticated can update orders"
ON orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated can delete orders" ON orders;
CREATE POLICY "Authenticated can delete orders"
ON orders FOR DELETE USING (true);

-- ========================================
-- Order Items Policies
-- ========================================
DROP POLICY IF EXISTS "Public can view order items" ON order_items;
CREATE POLICY "Public can view order items"
ON order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can create order items" ON order_items;
CREATE POLICY "Public can create order items"
ON order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update order items" ON order_items;
CREATE POLICY "Authenticated can update order items"
ON order_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated can delete order items" ON order_items;
CREATE POLICY "Authenticated can delete order items"
ON order_items FOR DELETE USING (true);

-- ========================================
-- Employees Policies
-- ========================================
DROP POLICY IF EXISTS "Public can view employees" ON employees;
CREATE POLICY "Public can view employees"
ON employees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert employees" ON employees;
CREATE POLICY "Authenticated can insert employees"
ON employees FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update employees" ON employees;
CREATE POLICY "Authenticated can update employees"
ON employees FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated can delete employees" ON employees;
CREATE POLICY "Authenticated can delete employees"
ON employees FOR DELETE USING (true);

-- ========================================
-- Banners Policies
-- ========================================
DROP POLICY IF EXISTS "Public can view banners" ON banners;
CREATE POLICY "Public can view banners"
ON banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert banners" ON banners;
CREATE POLICY "Authenticated can insert banners"
ON banners FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update banners" ON banners;
CREATE POLICY "Authenticated can update banners"
ON banners FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated can delete banners" ON banners;
CREATE POLICY "Authenticated can delete banners"
ON banners FOR DELETE USING (true);

-- ========================================
-- Storage Policies
-- ========================================
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated can upload images" ON storage.objects;
CREATE POLICY "Authenticated can upload images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated can update images" ON storage.objects;
CREATE POLICY "Authenticated can update images"
ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated can delete images" ON storage.objects;
CREATE POLICY "Authenticated can delete images"
ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
```

---

## Verify Policies

After running the SQL, verify your policies:

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all policies
SELECT policyname, tablename, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```