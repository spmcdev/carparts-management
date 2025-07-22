import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Audit log helper function
async function logAuditAction(user, action, tableName, recordId, oldValues, newValues, req) {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.get('User-Agent') || null;
    
    await pool.query(
      `INSERT INTO audit_log (user_id, username, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.id,
        user.username,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (err) {
    console.error('Failed to log audit action:', err);
    // Don't throw error to avoid breaking main functionality
  }
}

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, /\.vercel\.app$/, 'http://localhost:3001'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Database connection
const pool = new Pool({
  // Use Railway's DATABASE_URL if available, otherwise fallback to individual env vars
  ...(process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
        user: process.env.DB_USER || process.env.PGUSER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
        database: process.env.DB_NAME || process.env.PGDATABASE || 'carparts',
        port: process.env.DB_PORT || process.env.PGPORT || 5432,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
  )
});

// Simple route
app.get('/', (req, res) => {
  res.send('Car Parts Management API');
});

// Debug endpoint to test database connection
app.get('/debug', async (req, res) => {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const result = await pool.query('SELECT 1 as test');
    console.log('Database test successful:', result.rows[0]);
    
    res.json({ 
      status: 'ok', 
      database: 'connected',
      test_query: result.rows[0],
      jwt_secret_set: !!process.env.JWT_SECRET,
      node_env: process.env.NODE_ENV,
      database_url_exists: !!process.env.DATABASE_URL
    });
  } catch (err) {
    console.error('Database error:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    res.status(500).json({ 
      status: 'error', 
      database: 'failed',
      error: err.message,
      error_code: err.code,
      jwt_secret_set: !!process.env.JWT_SECRET,
      node_env: process.env.NODE_ENV,
      database_url_exists: !!process.env.DATABASE_URL
    });
  }
});

// Example: Get all car parts
app.get('/parts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parts');
    const parts = result.rows;
    
    // Filter out cost_price for non-superadmin users
    if (req.user && req.user.role !== 'superadmin') {
      parts.forEach(part => {
        delete part.cost_price;
      });
    }
    
    res.json(parts);
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

// Middleware to check if user is admin or superadmin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is superadmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'SuperAdmin access required' });
  }
  next();
};

// Protect add car part route
app.post('/parts', authenticateToken, async (req, res) => {
  const { name, manufacturer, stock_status, available_from, sold_date, parent_id, recommended_price, cost_price, local_purchase } = req.body;
  try {
    // Only allow cost_price if superadmin
    let costPriceValue = null;
    if (req.user && req.user.role === 'superadmin') {
      costPriceValue = cost_price || null;
    }
    const result = await pool.query(
      `INSERT INTO parts (name, manufacturer, stock_status, available_from, sold_date, parent_id, recommended_price, cost_price, local_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, manufacturer, stock_status || 'available', available_from || null, sold_date || null, parent_id || null, recommended_price || null, costPriceValue, local_purchase === true || local_purchase === 'true']
    );
    
    const newPart = result.rows[0];
    
    // Log audit action for part creation
    await logAuditAction(
      req.user,
      'CREATE',
      'parts',
      newPart.id,
      null,
      newPart,
      req
    );
    
    res.status(201).json(newPart);
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
    let userRole = 'general'; // Default role for public registration
    
    // Check if this is an authenticated admin creating a user
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const adminUser = decoded;
        
        // If admin is creating user, apply role hierarchy
        if (adminUser.role === 'admin' || adminUser.role === 'superadmin') {
          const validRoles = ['general', 'admin'];
          if (adminUser.role === 'superadmin') {
            validRoles.push('superadmin');
          }
          userRole = validRoles.includes(role) ? role : 'general';
        }
      } catch (tokenError) {
        // Invalid token, proceed with default 'general' role
        userRole = 'general';
      }
    }
    
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

// Admin-only: Get all users (role hierarchy applied)
app.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let query = 'SELECT id, username, role FROM users';
    let queryParams = [];
    
    // If user is admin (not superadmin), exclude superadmin users
    if (req.user.role === 'admin') {
      query += ' WHERE role != $1';
      queryParams.push('superadmin');
    }
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Update user role
app.patch('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  // Role validation based on user's permission level
  let validRoles = ['admin', 'general'];
  if (req.user.role === 'superadmin') {
    validRoles.push('superadmin');
  }
  
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role or insufficient permissions' });
  }
  
  try {
    // Get old user data for audit log and permission check
    const oldUserResult = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [id]);
    if (oldUserResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const oldUser = oldUserResult.rows[0];
    
    // Prevent admin users from modifying superadmin users
    if (req.user.role === 'admin' && oldUser.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot modify superadmin users' });
    }
    
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role', [role, id]);
    const updatedUser = result.rows[0];
    
    // Log audit action for user role update
    await logAuditAction(
      req.user,
      'UPDATE',
      'users',
      parseInt(id),
      { role: oldUser.role },
      { role: updatedUser.role },
      req
    );
    
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete user
app.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Get user data before deletion for audit log and permission check
    const userToDelete = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [id]);
    if (userToDelete.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const deletedUserData = userToDelete.rows[0];
    
    // Prevent admin users from deleting superadmin users
    if (req.user.role === 'admin' && deletedUserData.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot delete superadmin users' });
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);
    
    // Log audit action for user deletion
    await logAuditAction(
      req.user,
      'DELETE',
      'users',
      parseInt(id),
      deletedUserData,
      null,
      req
    );
    
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
    // Get old part data for audit log
    const oldPartResult = await pool.query('SELECT * FROM parts WHERE id = $1', [id]);
    if (oldPartResult.rows.length === 0) return res.status(404).json({ error: 'Part not found' });
    const oldPart = oldPartResult.rows[0];
    
    const result = await pool.query(
      `UPDATE parts SET stock_status = 'sold', sold_date = $1, sold_price = $2 WHERE id = $3 RETURNING *`,
      [soldDate, sold_price || null, id]
    );
    const updatedPart = result.rows[0];
    
    // Log audit action for part sale
    await logAuditAction(
      req.user,
      'SELL',
      'parts',
      parseInt(id),
      {
        stock_status: oldPart.stock_status,
        sold_date: oldPart.sold_date,
        sold_price: oldPart.sold_price
      },
      {
        stock_status: 'sold',
        sold_date: soldDate,
        sold_price: sold_price
      },
      req
    );
    
    res.json(updatedPart);
  } catch (err) {
    console.error('Error selling part:', err); // Log error to console for debugging
    res.status(500).json({ error: err.message });
  }
});

// Update a car part (admin only)
app.patch('/parts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  
  // Check if cost_price is being updated and user is not superadmin
  if ('cost_price' in fields && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'SuperAdmin access required to update cost price' });
  }
  
  try {
    // Get old part data for audit log
    const oldPartResult = await pool.query('SELECT * FROM parts WHERE id = $1', [id]);
    if (oldPartResult.rows.length === 0) return res.status(404).json({ error: 'Part not found' });
    const oldPart = oldPartResult.rows[0];
    
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
    
    const result = await pool.query(query, values);
    const updatedPart = result.rows[0];
    
    // Log audit action for part update
    const changedFields = {};
    const oldFields = {};
    for (const key in fields) {
      if (oldPart[key] !== fields[key]) {
        oldFields[key] = oldPart[key];
        changedFields[key] = fields[key];
      }
    }
    
    if (Object.keys(changedFields).length > 0) {
      await logAuditAction(
        req.user,
        'UPDATE',
        'parts',
        parseInt(id),
        oldFields,
        changedFields,
        req
      );
    }
    
    res.json(updatedPart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New endpoint to handle bill creation
app.post('/bills', authenticateToken, async (req, res) => {
  const { customerName, billNumber, date, items } = req.body;

  // Validate input
  if (!customerName || !date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid input. Ensure customerName, date, and items are provided.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO bills (customer_name, bill_number, date, items)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [customerName, billNumber, date, JSON.stringify(items)]
    );
    
    const newBill = result.rows[0];
    
    // Log audit action for bill creation
    await logAuditAction(
      req.user,
      'CREATE',
      'bills',
      newBill.id,
      null,
      {
        customer_name: customerName,
        bill_number: billNumber,
        date: date,
        items_count: items.length,
        total_amount: items.reduce((sum, item) => sum + parseFloat(item.sold_price || 0), 0)
      },
      req
    );
    
    res.status(201).json(newBill);
  } catch (err) {
    console.error('Error creating bill:', {
      message: err.message,
      stack: err.stack,
      input: { customerName, billNumber, date, items }
    });
    res.status(500).json({ error: 'Failed to create bill. Please check the server logs for more details.' });
  }
});

// New endpoint to retrieve all bills
app.get('/bills', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bills');
    res.json(result.rows);
  } catch (err) {
    console.error('Error retrieving bills:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to retrieve bills. Please check the server logs for more details.' });
  }
});

// SuperAdmin-only: Get audit logs
app.get('/audit-logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, table_name, action, username } = req.query;
    
    let query = `
      SELECT al.*, u.username as performed_by_username
      FROM audit_log al 
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;
    
    if (table_name) {
      query += ` AND al.table_name = $${paramIndex}`;
      queryParams.push(table_name);
      paramIndex++;
    }
    
    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      queryParams.push(action);
      paramIndex++;
    }
    
    if (username) {
      query += ` AND al.username ILIKE $${paramIndex}`;
      queryParams.push(`%${username}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, queryParams);
    
    // Also get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM audit_log WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;
    
    if (table_name) {
      countQuery += ` AND table_name = $${countParamIndex}`;
      countParams.push(table_name);
      countParamIndex++;
    }
    
    if (action) {
      countQuery += ` AND action = $${countParamIndex}`;
      countParams.push(action);
      countParamIndex++;
    }
    
    if (username) {
      countQuery += ` AND username ILIKE $${countParamIndex}`;
      countParams.push(`%${username}%`);
      countParamIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error retrieving audit logs:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to retrieve audit logs. Please check the server logs for more details.' });
  }
});

// Export app for testing
export default app;

// Only start server if this file is run directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
