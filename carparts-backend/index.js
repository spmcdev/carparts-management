import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'carparts',
  port: 5432,
});

// Simple route
app.get('/', (req, res) => {
  res.send('Car Parts Management API');
});

// Example: Get all car parts
app.get('/parts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parts');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to protect routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Middleware to check admin role
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Protect add car part route
app.post('/parts', authenticateToken, async (req, res) => {
  const { name, manufacturer, stock_status, available_from, sold_date, parent_id, recommended_price, cost_price, local_purchase } = req.body;
  try {
    // Only allow cost_price if admin
    let costPriceValue = null;
    if (req.user && req.user.role === 'admin') {
      costPriceValue = cost_price || null;
    }
    const result = await pool.query(
      `INSERT INTO parts (name, manufacturer, stock_status, available_from, sold_date, parent_id, recommended_price, cost_price, local_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, manufacturer, stock_status || 'available', available_from || null, sold_date || null, parent_id || null, recommended_price || null, costPriceValue, local_purchase === true || local_purchase === 'true']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding part:', err); // Log error to console for debugging
    res.status(500).json({ error: err.message });
  }
});

// Update registration to allow role (default to 'general')
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'general';
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, userRole]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update login to include role in JWT
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Get all users
app.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Update user role
app.patch('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['admin', 'general'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role', [role, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete user
app.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sell a car part (update stock_status, sold_date, and sold_price)
app.patch('/parts/:id/sell', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { sold_price } = req.body;
  const soldDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  try {
    const result = await pool.query(
      `UPDATE parts SET stock_status = 'sold', sold_date = $1, sold_price = $2 WHERE id = $3 RETURNING *`,
      [soldDate, sold_price || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Part not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error selling part:', err); // Log error to console for debugging
    res.status(500).json({ error: err.message });
  }
});

// Update a car part (admin only)
app.patch('/parts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  // Convert empty string dates, integers, and numerics to null
  ['available_from', 'sold_date'].forEach(field => {
    if (fields[field] === '') fields[field] = null;
  });
  ['parent_id'].forEach(field => {
    if (fields[field] === '') fields[field] = null;
  });
  ['recommended_price', 'sold_price', 'cost_price'].forEach(field => {
    if (fields[field] === '') fields[field] = null;
  });
  // Convert local_purchase to boolean
  if ('local_purchase' in fields) {
    fields.local_purchase = fields.local_purchase === true || fields.local_purchase === 'true';
  }
  // Build dynamic SET clause and values
  const setClauses = [];
  const values = [];
  let idx = 1;
  for (const key in fields) {
    setClauses.push(`${key} = $${idx}`);
    values.push(fields[key]);
    idx++;
  }
  if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  const query = `UPDATE parts SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Part not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
