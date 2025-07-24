import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, /\.vercel\.app$/, 'http://localhost:3001'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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

// Stock movement helper function
async function logStockMovement(partId, movementType, quantity, previousAvailable, newAvailable, referenceType, referenceId, notes, createdBy) {
  try {
    const result = await pool.query(
      `SELECT log_stock_movement($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [partId, movementType, quantity, previousAvailable, newAvailable, referenceType, referenceId, notes, createdBy]
    );
    return result.rows[0].log_stock_movement;
  } catch (err) {
    console.error('Failed to log stock movement:', err);
    throw err;
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

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

// Simple route
app.get('/', (req, res) => {
  res.send('Car Parts Management API with Quantity Support');
});

// Debug endpoint to test database connection
app.get('/debug', async (req, res) => {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT 1 as test');
    
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
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: err.message 
    });
  }
});

// ====================== AUTHENTICATION ROUTES ======================

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registration route
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let userRole = 'general'; // Default role for public registration
    
    // Only allow role assignment if the request comes from an authenticated admin/superadmin
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'admin' || decoded.role === 'superadmin') {
          userRole = role || 'general';
        }
      } catch (jwtErr) {
        // Invalid token, stick with default role
      }
    }
    
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, userRole]
    );
    
    res.status(201).json({ 
      message: 'User created successfully', 
      user: result.rows[0] 
    });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ====================== USER MANAGEMENT ROUTES (ADMIN) ======================

// Admin-only: Get all users
app.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Update user role
app.patch('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (!role || !['general', 'admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ error: 'Valid role required (general, admin, superadmin)' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, role',
      [role, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Log audit action
    await logAuditAction(
      req.user,
      'UPDATE',
      'users',
      parseInt(id),
      { role: 'previous_role' }, // We don't have the old role easily accessible
      { role: role },
      req
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete user
app.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  // Prevent deleting yourself
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Log audit action
    await logAuditAction(
      req.user,
      'DELETE',
      'users',
      parseInt(id),
      { username: result.rows[0].username },
      null,
      req
    );
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================== AUDIT LOG ROUTES (ADMIN) ======================

// Admin-only: Get audit logs
app.get('/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, table_name, action, username } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT al.*, u.username as user_username
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (table_name) {
      query += ` AND al.table_name = $${paramIndex}`;
      params.push(table_name);
      paramIndex++;
    }
    
    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    if (username) {
      query += ` AND al.username ILIKE $${paramIndex}`;
      params.push(`%${username}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_log al
      WHERE 1=1
    `;
    const countParams = [];
    let countIndex = 1;
    
    if (table_name) {
      countQuery += ` AND al.table_name = $${countIndex}`;
      countParams.push(table_name);
      countIndex++;
    }
    
    if (action) {
      countQuery += ` AND al.action = $${countIndex}`;
      countParams.push(action);
      countIndex++;
    }
    
    if (username) {
      countQuery += ` AND al.username ILIKE $${countIndex}`;
      countParams.push(`%${username}%`);
      countIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      logs: result.rows,
      total: total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================== STOCK MOVEMENTS ROUTES ======================

// Get stock movements for a specific part
app.get('/stock-movements/:partId', authenticateToken, async (req, res) => {
  const { partId } = req.params;
  try {
    const result = await pool.query(`
      SELECT sm.*, u.username as created_by_username, p.name as part_name
      FROM stock_movements sm
      JOIN users u ON sm.created_by = u.id
      JOIN parts p ON sm.part_id = p.id
      WHERE sm.part_id = $1
      ORDER BY sm.created_at DESC
    `, [partId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all stock movements (admin only)
app.get('/stock-movements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sm.*, u.username as created_by_username, p.name as part_name
      FROM stock_movements sm
      JOIN users u ON sm.created_by = u.id
      JOIN parts p ON sm.part_id = p.id
      ORDER BY sm.created_at DESC
      LIMIT 100
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================== RESERVATION ROUTES ======================

// Get all reservations
app.get('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT r.*, p.name as part_name, p.manufacturer, p.available_stock,
             u1.username as created_by_username, u2.username as completed_by_username
      FROM reserved_bills r
      JOIN parts p ON r.part_id = p.id
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.completed_by = u2.id
    `;
    
    const params = [];
    if (search) {
      query += ` WHERE r.customer_name ILIKE $1 OR r.customer_phone ILIKE $1 OR r.reservation_number ILIKE $1`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY r.reserved_date DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new reservation
app.post('/api/reservations', authenticateToken, async (req, res) => {
  const { 
    customer_name, 
    customer_phone, 
    part_id, 
    quantity = 1,
    price_agreed, 
    deposit_amount = 0, 
    notes 
  } = req.body;
  
  if (!customer_name || !customer_phone || !part_id || !price_agreed) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    await pool.query('BEGIN');
    
    // Check if part has enough available stock
    const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [part_id]);
    if (partResult.rows.length === 0) {
      throw new Error('Part not found');
    }
    
    const part = partResult.rows[0];
    if (part.available_stock < quantity) {
      throw new Error('Insufficient stock available for reservation');
    }
    
    // Generate reservation number
    const reservationNumber = `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create reservation
    const reservationResult = await pool.query(`
      INSERT INTO reserved_bills (
        reservation_number, customer_name, customer_phone, part_id, 
        quantity, price_agreed, deposit_amount, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [
      reservationNumber, customer_name, customer_phone, part_id, 
      quantity, price_agreed, deposit_amount, notes, req.user.id
    ]);
    
    // Update part stock (move from available to reserved)
    const newAvailable = part.available_stock - quantity;
    const newReserved = part.reserved_stock + quantity;
    
    await pool.query(`
      UPDATE parts 
      SET available_stock = $1, reserved_stock = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newAvailable, newReserved, part_id]);
    
    // Log stock movement
    await logStockMovement(
      part_id,
      'reservation',
      -quantity,
      part.available_stock,
      newAvailable,
      'reservation',
      reservationResult.rows[0].id,
      `Reservation ${reservationNumber}`,
      req.user.id
    );
    
    await pool.query('COMMIT');
    res.status(201).json(reservationResult.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update reservation status
app.patch('/api/reservations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  if (!['reserved', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    await pool.query('BEGIN');
    
    // Get current reservation
    const reservationResult = await pool.query(`
      SELECT r.*, p.reserved_stock, p.available_stock, p.sold_stock
      FROM reserved_bills r
      JOIN parts p ON r.part_id = p.id
      WHERE r.id = $1
    `, [id]);
    
    if (reservationResult.rows.length === 0) {
      throw new Error('Reservation not found');
    }
    
    const reservation = reservationResult.rows[0];
    
    // Update reservation
    let updateFields = { status, notes };
    if (status === 'completed' || status === 'cancelled') {
      updateFields.completed_date = new Date().toISOString();
      updateFields.completed_by = req.user.id;
    }
    
    const setClause = Object.keys(updateFields).map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updateFields)];
    
    await pool.query(`UPDATE reserved_bills SET ${setClause} WHERE id = $1`, values);
    
    // Handle stock changes based on status
    if (status === 'completed') {
      // Move from reserved to sold
      const newReserved = reservation.reserved_stock - reservation.quantity;
      const newSold = reservation.sold_stock + reservation.quantity;
      
      await pool.query(`
        UPDATE parts 
        SET reserved_stock = $1, sold_stock = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newReserved, newSold, reservation.part_id]);
      
      // Log stock movement
      await logStockMovement(
        reservation.part_id,
        'sale',
        -reservation.quantity,
        reservation.reserved_stock,
        newReserved,
        'reservation_completion',
        id,
        `Reservation ${reservation.reservation_number} completed`,
        req.user.id
      );
    } else if (status === 'cancelled') {
      // Move from reserved back to available
      const newReserved = reservation.reserved_stock - reservation.quantity;
      const newAvailable = reservation.available_stock + reservation.quantity;
      
      await pool.query(`
        UPDATE parts 
        SET reserved_stock = $1, available_stock = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newReserved, newAvailable, reservation.part_id]);
      
      // Log stock movement
      await logStockMovement(
        reservation.part_id,
        'return',
        reservation.quantity,
        reservation.available_stock,
        newAvailable,
        'reservation_cancellation',
        id,
        `Reservation ${reservation.reservation_number} cancelled`,
        req.user.id
      );
    }
    
    await pool.query('COMMIT');
    res.json({ message: 'Reservation updated successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Complete reservation (convert to sale)
app.post('/api/reservations/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get reservation details
      const reservationResult = await client.query(`
        SELECT rb.*, p.name as part_name, p.manufacturer, p.available_stock, p.reserved_stock, p.sold_stock
        FROM reserved_bills rb
        JOIN parts p ON rb.part_id = p.id
        WHERE rb.id = $1 AND rb.status = 'reserved'
      `, [id]);
      
      if (reservationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Reservation not found or already processed' });
      }
      
      const reservation = reservationResult.rows[0];
      
      // Create a new bill
      const billResult = await client.query(`
        INSERT INTO bills (customer_name, customer_phone, total_amount, total_quantity, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        reservation.customer_name,
        reservation.customer_phone,
        reservation.price_agreed,
        reservation.quantity,
        req.user.id
      ]);
      
      const billId = billResult.rows[0].id;
      
      // Create bill item
      await client.query(`
        INSERT INTO bill_items (bill_id, part_id, part_name, manufacturer, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        billId,
        reservation.part_id,
        reservation.part_name,
        reservation.manufacturer,
        reservation.quantity,
        reservation.price_agreed,
        reservation.price_agreed
      ]);
      
      // Update stock - move from reserved to sold
      const newReserved = reservation.reserved_stock - reservation.quantity;
      const newSold = reservation.sold_stock + reservation.quantity;
      
      await client.query(`
        UPDATE parts 
        SET reserved_stock = $1, sold_stock = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newReserved, newSold, reservation.part_id]);
      
      // Update reservation status
      await client.query(`
        UPDATE reserved_bills 
        SET status = 'completed', completed_date = CURRENT_TIMESTAMP, completed_by = $1
        WHERE id = $2
      `, [req.user.id, id]);
      
      // Log stock movement
      await client.query(`
        INSERT INTO stock_movements (part_id, movement_type, quantity, previous_available, new_available, reference_type, reference_id, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        reservation.part_id,
        'sale',
        -reservation.quantity,
        reservation.reserved_stock,
        newReserved,
        'reservation_completion',
        id,
        `Reservation ${reservation.reservation_number} completed`,
        req.user.id
      ]);
      
      // Log audit action
      await logAuditAction(
        req.user,
        'complete',
        'reserved_bills',
        id,
        { status: 'reserved' },
        { status: 'completed', bill_id: billId },
        req
      );
      
      await client.query('COMMIT');
      res.json({ 
        message: 'Reservation completed successfully',
        bill_id: billId,
        reservation_number: reservation.reservation_number
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error completing reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cancel reservation
app.post('/api/reservations/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get reservation details
      const reservationResult = await client.query(`
        SELECT rb.*, p.available_stock, p.reserved_stock
        FROM reserved_bills rb
        JOIN parts p ON rb.part_id = p.id
        WHERE rb.id = $1 AND rb.status = 'reserved'
      `, [id]);
      
      if (reservationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Reservation not found or already processed' });
      }
      
      const reservation = reservationResult.rows[0];
      
      // Update stock - move from reserved back to available
      const newReserved = reservation.reserved_stock - reservation.quantity;
      const newAvailable = reservation.available_stock + reservation.quantity;
      
      await client.query(`
        UPDATE parts 
        SET reserved_stock = $1, available_stock = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newReserved, newAvailable, reservation.part_id]);
      
      // Update reservation status
      await client.query(`
        UPDATE reserved_bills 
        SET status = 'cancelled'
        WHERE id = $1
      `, [id]);
      
      // Log stock movement
      await client.query(`
        INSERT INTO stock_movements (part_id, movement_type, quantity, previous_available, new_available, reference_type, reference_id, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        reservation.part_id,
        'return',
        reservation.quantity,
        reservation.available_stock,
        newAvailable,
        'reservation_cancellation',
        id,
        `Reservation ${reservation.reservation_number} cancelled`,
        req.user.id
      ]);
      
      // Log audit action
      await logAuditAction(
        req.user,
        'cancel',
        'reserved_bills',
        id,
        { status: 'reserved' },
        { status: 'cancelled' },
        req
      );
      
      await client.query('COMMIT');
      res.json({ 
        message: 'Reservation cancelled successfully',
        reservation_number: reservation.reservation_number
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error cancelling reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================== PARTS MANAGEMENT ROUTES ======================

// Get all parts with quantity information
app.get('/parts', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        p.*,
        CASE 
          WHEN p.available_stock > 0 THEN 'available'
          WHEN p.reserved_stock > 0 THEN 'reserved'
          ELSE 'sold'
        END as computed_status
      FROM parts p 
      ORDER BY p.id DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching parts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add new part with quantity support
app.post('/parts', authenticateToken, async (req, res) => {
  const { 
    name, 
    manufacturer, 
    total_stock, 
    available_from, 
    parent_id, 
    recommended_price, 
    cost_price, 
    local_purchase, 
    container_no,
    part_number
  } = req.body;
  
  try {
    // Validate required fields
    if (!name || !manufacturer) {
      return res.status(400).json({ error: 'Name and manufacturer are required' });
    }
    
    // Set default quantity to 1 if not specified
    const stockQuantity = total_stock || 1;
    
    // Only allow cost_price if superadmin
    let costPriceValue = null;
    if (req.user && req.user.role === 'superadmin') {
      costPriceValue = cost_price || null;
    }
    
    const result = await pool.query(
      `INSERT INTO parts (
        name, manufacturer, part_number, total_stock, available_stock, 
        available_from, parent_id, recommended_price, cost_price, 
        local_purchase, container_no
      ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name, 
        manufacturer, 
        part_number || null,
        stockQuantity, // total_stock and available_stock start the same
        available_from || null, 
        parent_id || null, 
        recommended_price || null, 
        costPriceValue, 
        local_purchase === true || local_purchase === 'true', 
        container_no || null
      ]
    );
    
    const newPart = result.rows[0];
    
    // Log stock movement for initial stock
    await logStockMovement(
      newPart.id,
      'restock',
      stockQuantity,
      0,
      stockQuantity,
      'manual',
      null,
      'Initial stock addition',
      req.user.id
    );
    
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
    console.error('Error adding part:', err);
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Part number already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Update part with quantity management
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
    
    // Handle stock quantity updates separately
    if ('total_stock' in fields || 'available_stock' in fields) {
      await pool.query('BEGIN');
      
      try {
        let newTotalStock = fields.total_stock !== undefined ? parseInt(fields.total_stock) : oldPart.total_stock;
        let newAvailableStock = fields.available_stock !== undefined ? parseInt(fields.available_stock) : oldPart.available_stock;
        
        // Validate minimum constraints
        const minRequiredTotal = oldPart.sold_stock + oldPart.reserved_stock;
        if (newTotalStock < minRequiredTotal) {
          throw new Error(`Total stock cannot be less than ${minRequiredTotal} (sold: ${oldPart.sold_stock} + reserved: ${oldPart.reserved_stock})`);
        }
        
        // When only total_stock is updated, calculate new available_stock
        if (fields.total_stock !== undefined && fields.available_stock === undefined) {
          newAvailableStock = newTotalStock - oldPart.sold_stock - oldPart.reserved_stock;
        }
        
        // When only available_stock is updated, calculate new total_stock
        if (fields.available_stock !== undefined && fields.total_stock === undefined) {
          newTotalStock = newAvailableStock + oldPart.sold_stock + oldPart.reserved_stock;
        }
        
        // Final validation of the constraint
        if (newTotalStock !== (newAvailableStock + oldPart.sold_stock + oldPart.reserved_stock)) {
          throw new Error('Stock values must satisfy: total_stock = available_stock + sold_stock + reserved_stock');
        }
        
        // Validate non-negative values
        if (newTotalStock < 0 || newAvailableStock < 0) {
          throw new Error('Stock quantities cannot be negative');
        }
        
        // Log stock movement if available stock changed
        if (newAvailableStock !== oldPart.available_stock) {
          const stockDifference = newAvailableStock - oldPart.available_stock;
          await logStockMovement(
            parseInt(id),
            stockDifference > 0 ? 'restock' : 'adjustment',
            stockDifference,
            oldPart.available_stock,
            newAvailableStock,
            'manual',
            null,
            'Manual stock adjustment',
            req.user.id
          );
        }
        
        // Update the part with both values
        fields.total_stock = newTotalStock;
        fields.available_stock = newAvailableStock;
        
        await pool.query('COMMIT');
      } catch (stockErr) {
        await pool.query('ROLLBACK');
        throw stockErr;
      }
    }
    
    // Convert empty string values to null
    ['available_from', 'parent_id', 'recommended_price', 'cost_price', 'part_number'].forEach(field => {
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
    const query = `UPDATE parts SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    
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
    console.error('Error updating part:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete part (admin only)
app.delete('/parts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if part has been sold or reserved
    const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [id]);
    if (partResult.rows.length === 0) return res.status(404).json({ error: 'Part not found' });
    
    const part = partResult.rows[0];
    if (part.sold_stock > 0 || part.reserved_stock > 0) {
      return res.status(400).json({ error: 'Cannot delete part with sales or reservations' });
    }
    
    await pool.query('DELETE FROM parts WHERE id = $1', [id]);
    
    // Log audit action
    await logAuditAction(
      req.user,
      'DELETE',
      'parts',
      parseInt(id),
      part,
      null,
      req
    );
    
    res.json({ message: 'Part deleted successfully' });
  } catch (err) {
    console.error('Error deleting part:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================== SALES MANAGEMENT ROUTES ======================

// Get available parts for sale (only parts with available stock > 0)
app.get('/parts/available', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM parts 
      WHERE available_stock > 0 
      ORDER BY name, manufacturer
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching available parts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sell parts - create bill with multiple items and quantities
app.post('/sales/sell', authenticateToken, async (req, res) => {
  const { customer_name, customer_phone, bill_number, items } = req.body;
  
  try {
    // Validate required fields
    if (!customer_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer name and items are required' });
    }
    
    // Validate all items
    for (const item of items) {
      if (!item.part_id || !item.quantity || item.quantity <= 0 || !item.unit_price || item.unit_price < 0) {
        return res.status(400).json({ error: 'All items must have valid part_id, quantity > 0, and unit_price >= 0' });
      }
    }
    
    await pool.query('BEGIN');
    
    try {
      // Check stock availability for all items
      const stockChecks = [];
      for (const item of items) {
        const partResult = await pool.query(
          'SELECT * FROM parts WHERE id = $1', 
          [item.part_id]
        );
        
        if (partResult.rows.length === 0) {
          throw new Error(`Part with ID ${item.part_id} not found`);
        }
        
        const part = partResult.rows[0];
        if (part.available_stock < item.quantity) {
          throw new Error(`Insufficient stock for ${part.name}. Available: ${part.available_stock}, Requested: ${item.quantity}`);
        }
        
        stockChecks.push({ part, item });
      }
      
      // Calculate totals
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Create bill
      const billResult = await pool.query(
        `INSERT INTO bills (bill_number, customer_name, customer_phone, total_amount, total_quantity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [bill_number || null, customer_name, customer_phone || null, totalAmount, totalQuantity, req.user.id]
      );
      
      const bill = billResult.rows[0];
      
      // Create bill items and update stock
      for (const { part, item } of stockChecks) {
        // Create bill item
        await pool.query(
          `INSERT INTO bill_items (bill_id, part_id, part_name, manufacturer, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            bill.id, 
            part.id, 
            part.name, 
            part.manufacturer, 
            item.quantity, 
            item.unit_price, 
            item.quantity * item.unit_price
          ]
        );
        
        // Update part stock
        const newAvailableStock = part.available_stock - item.quantity;
        const newSoldStock = part.sold_stock + item.quantity;
        
        await pool.query(
          `UPDATE parts 
           SET available_stock = $1, sold_stock = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [newAvailableStock, newSoldStock, part.id]
        );
        
        // Log stock movement
        await logStockMovement(
          part.id,
          'sale',
          -item.quantity,
          part.available_stock,
          newAvailableStock,
          'bill',
          bill.id,
          `Sale to ${customer_name}`,
          req.user.id
        );
      }
      
      await pool.query('COMMIT');
      
      // Return complete bill with items
      const completeBillResult = await pool.query(`
        SELECT 
          b.*,
          json_agg(
            json_build_object(
              'id', bi.id,
              'part_id', bi.part_id,
              'part_name', bi.part_name,
              'manufacturer', bi.manufacturer,
              'quantity', bi.quantity,
              'unit_price', bi.unit_price,
              'total_price', bi.total_price
            )
          ) as items
        FROM bills b
        LEFT JOIN bill_items bi ON b.id = bi.bill_id
        WHERE b.id = $1
        GROUP BY b.id
      `, [bill.id]);
      
      // Log audit action
      await logAuditAction(
        req.user,
        'CREATE',
        'bills',
        bill.id,
        null,
        completeBillResult.rows[0],
        req
      );
      
      res.status(201).json(completeBillResult.rows[0]);
      
    } catch (saleErr) {
      await pool.query('ROLLBACK');
      throw saleErr;
    }
    
  } catch (err) {
    console.error('Error processing sale:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================== BILLS MANAGEMENT ROUTES ======================

// Get all bills with search support
app.get('/bills', authenticateToken, async (req, res) => {
  const { search } = req.query;
  
  try {
    let query = `
      SELECT 
        b.*,
        json_agg(
          json_build_object(
            'id', bi.id,
            'part_id', bi.part_id,
            'part_name', bi.part_name,
            'manufacturer', bi.manufacturer,
            'quantity', bi.quantity,
            'unit_price', bi.unit_price,
            'total_price', bi.total_price
          )
        ) as items
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
    `;
    
    const queryParams = [];
    
    if (search) {
      query += ` WHERE (
        b.bill_number ILIKE $1 OR 
        b.customer_name ILIKE $1 OR 
        b.customer_phone ILIKE $1
      )`;
      queryParams.push(`%${search}%`);
    }
    
    query += ` GROUP BY b.id ORDER BY b.created_at DESC`;
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update bill (edit functionality)
app.put('/bills/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { bill_number, customer_name, customer_phone } = req.body;
  
  try {
    // Get old bill data for audit
    const oldBillResult = await pool.query('SELECT * FROM bills WHERE id = $1', [id]);
    if (oldBillResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const oldBill = oldBillResult.rows[0];
    
    // Update bill
    const result = await pool.query(
      `UPDATE bills 
       SET bill_number = $1, customer_name = $2, customer_phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [bill_number || null, customer_name, customer_phone || null, id]
    );
    
    const updatedBill = result.rows[0];
    
    // Log audit action
    await logAuditAction(
      req.user,
      'UPDATE',
      'bills',
      parseInt(id),
      oldBill,
      updatedBill,
      req
    );
    
    res.json(updatedBill);
  } catch (err) {
    console.error('Error updating bill:', err);
    res.status(500).json({ error: err.message });
  }
});

// Process refund
app.post('/bills/:id/refund', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { refund_amount, refund_reason } = req.body;
  
  try {
    if (!refund_amount || !refund_reason) {
      return res.status(400).json({ error: 'Refund amount and reason are required' });
    }
    
    await pool.query('BEGIN');
    
    try {
      // Get bill details
      const billResult = await pool.query(`
        SELECT b.*, 
               json_agg(
                 json_build_object(
                   'part_id', bi.part_id,
                   'quantity', bi.quantity,
                   'unit_price', bi.unit_price,
                   'total_price', bi.total_price
                 )
               ) as items
        FROM bills b
        LEFT JOIN bill_items bi ON b.id = bi.bill_id
        WHERE b.id = $1
        GROUP BY b.id
      `, [id]);
      
      if (billResult.rows.length === 0) {
        throw new Error('Bill not found');
      }
      
      const bill = billResult.rows[0];
      
      if (bill.status === 'refunded') {
        throw new Error('Bill is already fully refunded');
      }
      
      // Determine refund status
      let newStatus = 'refunded';
      if (parseFloat(refund_amount) < parseFloat(bill.total_amount)) {
        newStatus = 'partially_refunded';
      }
      
      // Update bill with refund information
      const updatedBillResult = await pool.query(
        `UPDATE bills 
         SET status = $1, refund_date = CURRENT_DATE, refund_reason = $2, 
             refund_amount = $3, refunded_by = $4
         WHERE id = $5 RETURNING *`,
        [newStatus, refund_reason, refund_amount, req.user.id, id]
      );
      
      // If full refund, restore stock for all items
      if (newStatus === 'refunded') {
        for (const item of bill.items) {
          if (item.part_id) {
            // Get current part stock
            const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [item.part_id]);
            if (partResult.rows.length > 0) {
              const part = partResult.rows[0];
              const newAvailableStock = part.available_stock + item.quantity;
              const newSoldStock = part.sold_stock - item.quantity;
              
              await pool.query(
                `UPDATE parts 
                 SET available_stock = $1, sold_stock = $2, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [newAvailableStock, newSoldStock, item.part_id]
              );
              
              // Log stock movement
              await logStockMovement(
                item.part_id,
                'return',
                item.quantity,
                part.available_stock,
                newAvailableStock,
                'bill',
                bill.id,
                `Refund for bill ${bill.bill_number || bill.id}`,
                req.user.id
              );
            }
          }
        }
      }
      
      await pool.query('COMMIT');
      
      // Log audit action
      await logAuditAction(
        req.user,
        'REFUND',
        'bills',
        parseInt(id),
        bill,
        updatedBillResult.rows[0],
        req
      );
      
      res.json(updatedBillResult.rows[0]);
      
    } catch (refundErr) {
      await pool.query('ROLLBACK');
      throw refundErr;
    }
    
  } catch (err) {
    console.error('Error processing refund:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
