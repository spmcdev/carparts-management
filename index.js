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
    ? [
        process.env.FRONTEND_URL, 
        'https://rasuki-carparts-staging.up.railway.app',
        /\.vercel\.app$/, 
        'http://localhost:3001'
      ] 
    : [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'http://localhost:8080',
        'https://rasuki-carparts-staging.up.railway.app'
      ],
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
    
    // Log successful login attempt
    try {
      await logAuditAction(
        { id: user.id, username: user.username },
        'LOGIN',
        'users',
        user.id,
        null,
        { username: user.username, role: user.role, login_time: new Date().toISOString() },
        req
      );
    } catch (auditErr) {
      // Don't fail login if audit logging fails
      console.error('Failed to log login audit:', auditErr);
    }
    
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
    
    // Log audit action for user registration
    // For public registration, we won't have req.user, so we'll handle this case
    const adminUser = authHeader ? {
      id: null, // We'll need to get this from the token if needed
      username: 'system' // Default for now
    } : null;
    
    if (adminUser) {
      // Admin-created user registration
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        await logAuditAction(
          { id: decoded.id, username: decoded.username },
          'CREATE',
          'users',
          result.rows[0].id,
          null,
          { username: result.rows[0].username, role: result.rows[0].role },
          req
        );
      } catch (jwtErr) {
        // Token verification failed, skip audit logging
      }
    }
    // Note: Public registrations are not audited as there's no authenticated user
    
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

// ====================== ENHANCED RESERVATION ROUTES ======================

// Get all reservations (enhanced multi-item support)
app.get('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ri.id,
                 'part_id', ri.part_id,
                 'part_name', ri.part_name,
                 'manufacturer', ri.manufacturer,
                 'quantity', ri.quantity,
                 'unit_price', ri.unit_price,
                 'total_price', ri.total_price,
                 'available_stock', p.available_stock
               ) ORDER BY ri.id
             ) as items,
             u1.username as created_by_username, 
             u2.username as completed_by_username
      FROM reservations r
      LEFT JOIN reservation_items ri ON r.id = ri.reservation_id
      LEFT JOIN parts p ON ri.part_id = p.id
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.completed_by = u2.id
    `;
    
    const params = [];
    if (search) {
      query += ` WHERE r.customer_name ILIKE $1 OR r.customer_phone ILIKE $1 OR r.reservation_number ILIKE $1 OR ri.part_name ILIKE $1 OR ri.manufacturer ILIKE $1`;
      params.push(`%${search}%`);
    }
    
    query += ` GROUP BY r.id, u1.username, u2.username ORDER BY r.reserved_date DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new reservation (enhanced multi-item support)
app.post('/api/reservations', authenticateToken, async (req, res) => {
  const { 
    customer_name, 
    customer_phone, 
    items, // Array of {part_id, quantity, unit_price}
    deposit_amount = 0, 
    notes 
  } = req.body;
  
  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: customer_name, customer_phone, items' });
  }
  
  try {
    await pool.query('BEGIN');
    
    // Validate all items and check stock
    let total_amount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      if (!item.part_id || !item.quantity || !item.unit_price) {
        throw new Error('Each item must have part_id, quantity, and unit_price');
      }
      
      // Check if part exists and has enough stock
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [item.part_id]);
      if (partResult.rows.length === 0) {
        throw new Error(`Part with ID ${item.part_id} not found`);
      }
      
      const part = partResult.rows[0];
      if (part.available_stock < item.quantity) {
        throw new Error(`Insufficient stock for ${part.name}. Available: ${part.available_stock}, Requested: ${item.quantity}`);
      }
      
      const item_total = item.quantity * item.unit_price;
      total_amount += item_total;
      
      validatedItems.push({
        ...item,
        part_name: part.name,
        manufacturer: part.manufacturer,
        total_price: item_total,
        part: part
      });
    }
    
    // Ensure deposit_amount is not greater than total_amount
    const finalDepositAmount = Math.min(deposit_amount || 0, total_amount);
    
    // Generate reservation number
    const reservationResult = await pool.query('SELECT generate_reservation_number() as number');
    const reservationNumber = reservationResult.rows[0].number;
    
    // Create main reservation with calculated total (disable total update trigger temporarily)
    await pool.query('SET session_replication_role = replica'); // Disable triggers
    
    const newReservationResult = await pool.query(`
      INSERT INTO reservations (
        reservation_number, customer_name, customer_phone, 
        total_amount, deposit_amount, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [
      reservationNumber, customer_name, customer_phone, 
      total_amount, finalDepositAmount, notes, req.user.id
    ]);
    
    const reservation = newReservationResult.rows[0];
    
    // Create reservation items (with triggers still disabled)
    for (const item of validatedItems) {
      // Create reservation item
      await pool.query(`
        INSERT INTO reservation_items (
          reservation_id, part_id, part_name, manufacturer, 
          quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        reservation.id, item.part_id, item.part_name, item.manufacturer,
        item.quantity, item.unit_price, item.total_price
      ]);
    }
    
    // Re-enable triggers
    await pool.query('SET session_replication_role = DEFAULT');
    
    // Now update stock for each item
    for (const item of validatedItems) {
      const newAvailable = item.part.available_stock - item.quantity;
      const newReserved = item.part.reserved_stock + item.quantity;
      
      await pool.query(`
        UPDATE parts 
        SET available_stock = $1, reserved_stock = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newAvailable, newReserved, item.part_id]);
      
      // Log stock movement
      await logStockMovement(
        item.part_id,
        'reservation',
        -item.quantity,
        item.part.available_stock,
        newAvailable,
        'reservation',
        reservation.id,
        `Reservation ${reservationNumber} - ${item.part_name}`,
        req.user.id
      );
    }
    
    // Log audit action for reservation creation
    await logAuditAction(
      req.user,
      'CREATE_RESERVATION',
      'reservations',
      reservation.id,
      null,
      {
        ...reservation,
        items: validatedItems.map(item => ({
          part_id: item.part_id,
          part_name: item.part_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      },
      req
    );
    
    await pool.query('COMMIT');
    res.status(201).json({
      ...reservation,
      items: validatedItems
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update reservation (edit functionality)
app.put('/api/reservations/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, deposit_amount, notes } = req.body;
  
  try {
    // Get old reservation data for audit
    const oldReservationResult = await pool.query(`
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ri.id,
                 'part_id', ri.part_id,
                 'part_name', ri.part_name,
                 'manufacturer', ri.manufacturer,
                 'quantity', ri.quantity,
                 'unit_price', ri.unit_price,
                 'total_price', ri.total_price
               )
             ) as items
      FROM reservations r
      LEFT JOIN reservation_items ri ON r.id = ri.reservation_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);
    
    if (oldReservationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const oldReservation = oldReservationResult.rows[0];
    
    if (oldReservation.status !== 'reserved') {
      return res.status(400).json({ error: 'Cannot edit completed or cancelled reservations' });
    }
    
    // Update reservation
    const result = await pool.query(`
      UPDATE reservations 
      SET customer_name = $1, customer_phone = $2, deposit_amount = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 RETURNING *
    `, [customer_name, customer_phone, deposit_amount, notes, id]);
    
    const updatedReservation = result.rows[0];
    
    // Log audit action
    await logAuditAction(
      req.user,
      'UPDATE_RESERVATION',
      'reservations',
      parseInt(id),
      oldReservation,
      updatedReservation,
      req
    );
    
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add item to reservation (Admin/SuperAdmin only)
app.post('/api/reservations/:reservationId/items', authenticateToken, requireAdmin, async (req, res) => {
  const { reservationId } = req.params;
  const { part_id, quantity, unit_price } = req.body;
  
  try {
    if (!part_id || !quantity || !unit_price) {
      return res.status(400).json({ error: 'Part ID, quantity, and unit price are required' });
    }

    await pool.query('BEGIN');

    try {
      // Check reservation status
      const reservationResult = await pool.query('SELECT * FROM reservations WHERE id = $1', [reservationId]);
      if (reservationResult.rows.length === 0) {
        throw new Error('Reservation not found');
      }
      
      const reservation = reservationResult.rows[0];
      if (reservation.status !== 'reserved') {
        throw new Error('Cannot add items to completed or cancelled reservations');
      }

      // Get part details and check stock
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [part_id]);
      if (partResult.rows.length === 0) {
        throw new Error('Part not found');
      }
      const part = partResult.rows[0];

      if (part.available_stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${part.available_stock}, Requested: ${quantity}`);
      }

      // Check if item already exists in reservation
      const existingItemResult = await pool.query(
        'SELECT * FROM reservation_items WHERE reservation_id = $1 AND part_id = $2',
        [reservationId, part_id]
      );
      
      if (existingItemResult.rows.length > 0) {
        throw new Error('This part is already in the reservation. Use update instead.');
      }

      // Add item to reservation
      const total_price = quantity * unit_price;
      const itemResult = await pool.query(`
        INSERT INTO reservation_items (reservation_id, part_id, part_name, manufacturer, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [reservationId, part_id, part.name, part.manufacturer, quantity, unit_price, total_price]);

      // Update part stock
      await pool.query(`
        UPDATE parts 
        SET available_stock = available_stock - $1, reserved_stock = reserved_stock + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [quantity, part_id]);

      // Log stock movement
      await logStockMovement(
        part_id,
        'reservation',
        -quantity,
        part.available_stock,
        part.available_stock - quantity,
        'reservation_edit',
        reservationId,
        `Item added to reservation ${reservation.reservation_number}`,
        req.user.id
      );

      await pool.query('COMMIT');

      // Log audit action
      await logAuditAction(
        req.user,
        'ADD_RESERVATION_ITEM',
        'reservation_items',
        itemResult.rows[0].id,
        null,
        itemResult.rows[0],
        req
      );

      res.json(itemResult.rows[0]);

    } catch (itemErr) {
      await pool.query('ROLLBACK');
      throw itemErr;
    }

  } catch (err) {
    console.error('Error adding reservation item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update reservation item (Admin/SuperAdmin only)
app.put('/api/reservations/:reservationId/items/:itemId', authenticateToken, requireAdmin, async (req, res) => {
  const { reservationId, itemId } = req.params;
  const { quantity, unit_price } = req.body;
  
  try {
    if (!quantity || !unit_price) {
      return res.status(400).json({ error: 'Quantity and unit price are required' });
    }

    await pool.query('BEGIN');

    try {
      // Check reservation status
      const reservationResult = await pool.query('SELECT * FROM reservations WHERE id = $1', [reservationId]);
      if (reservationResult.rows.length === 0) {
        throw new Error('Reservation not found');
      }
      
      const reservation = reservationResult.rows[0];
      if (reservation.status !== 'reserved') {
        throw new Error('Cannot edit items in completed or cancelled reservations');
      }

      // Get current item details
      const itemResult = await pool.query(
        'SELECT * FROM reservation_items WHERE id = $1 AND reservation_id = $2',
        [itemId, reservationId]
      );
      
      if (itemResult.rows.length === 0) {
        throw new Error('Reservation item not found');
      }
      
      const currentItem = itemResult.rows[0];
      const quantityDiff = quantity - currentItem.quantity;
      
      // Get part details for stock check
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [currentItem.part_id]);
      if (partResult.rows.length === 0) {
        throw new Error('Part not found');
      }
      const part = partResult.rows[0];

      // Check stock availability for quantity increase
      if (quantityDiff > 0 && part.available_stock < quantityDiff) {
        throw new Error(`Insufficient stock for increase. Available: ${part.available_stock}, Needed: ${quantityDiff}`);
      }

      // Update reservation item
      const total_price = quantity * unit_price;
      const updatedItemResult = await pool.query(`
        UPDATE reservation_items 
        SET quantity = $1, unit_price = $2, total_price = $3
        WHERE id = $4 AND reservation_id = $5 RETURNING *
      `, [quantity, unit_price, total_price, itemId, reservationId]);

      // Update part stock
      await pool.query(`
        UPDATE parts 
        SET available_stock = available_stock + $1, reserved_stock = reserved_stock - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [quantityDiff * -1, currentItem.part_id]); // Negative because we're adjusting in opposite direction

      // Log stock movement
      if (quantityDiff !== 0) {
        await logStockMovement(
          currentItem.part_id,
          quantityDiff > 0 ? 'reservation' : 'return',
          Math.abs(quantityDiff),
          part.available_stock,
          part.available_stock - quantityDiff,
          'reservation_edit',
          reservationId,
          `Item quantity updated in reservation ${reservation.reservation_number} (${currentItem.quantity} → ${quantity})`,
          req.user.id
        );
      }

      await pool.query('COMMIT');

      // Log audit action
      await logAuditAction(
        req.user,
        'UPDATE_RESERVATION_ITEM',
        'reservation_items',
        parseInt(itemId),
        currentItem,
        updatedItemResult.rows[0],
        req
      );

      res.json(updatedItemResult.rows[0]);

    } catch (itemErr) {
      await pool.query('ROLLBACK');
      throw itemErr;
    }

  } catch (err) {
    console.error('Error updating reservation item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete reservation item (Admin/SuperAdmin only)
app.delete('/api/reservations/:reservationId/items/:itemId', authenticateToken, requireAdmin, async (req, res) => {
  const { reservationId, itemId } = req.params;
  
  try {
    await pool.query('BEGIN');

    try {
      // Check reservation status
      const reservationResult = await pool.query('SELECT * FROM reservations WHERE id = $1', [reservationId]);
      if (reservationResult.rows.length === 0) {
        throw new Error('Reservation not found');
      }
      
      const reservation = reservationResult.rows[0];
      if (reservation.status !== 'reserved') {
        throw new Error('Cannot remove items from completed or cancelled reservations');
      }

      // Get item details before deletion
      const itemResult = await pool.query(
        'SELECT * FROM reservation_items WHERE id = $1 AND reservation_id = $2',
        [itemId, reservationId]
      );
      
      if (itemResult.rows.length === 0) {
        throw new Error('Reservation item not found');
      }
      
      const item = itemResult.rows[0];
      
      // Check if this is the last item in reservation
      const itemCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM reservation_items WHERE reservation_id = $1',
        [reservationId]
      );
      
      if (parseInt(itemCountResult.rows[0].count) <= 1) {
        throw new Error('Cannot remove the last item from a reservation. Cancel the reservation instead.');
      }
      
      // Get part details
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [item.part_id]);
      if (partResult.rows.length === 0) {
        throw new Error('Part not found');
      }
      const part = partResult.rows[0];

      // Delete the item
      await pool.query('DELETE FROM reservation_items WHERE id = $1 AND reservation_id = $2', [itemId, reservationId]);

      // Restore stock
      await pool.query(`
        UPDATE parts 
        SET available_stock = available_stock + $1, reserved_stock = reserved_stock - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [item.quantity, item.part_id]);

      // Log stock movement
      await logStockMovement(
        item.part_id,
        'return',
        item.quantity,
        part.available_stock,
        part.available_stock + item.quantity,
        'reservation_edit',
        reservationId,
        `Item removed from reservation ${reservation.reservation_number}`,
        req.user.id
      );

      await pool.query('COMMIT');

      // Log audit action
      await logAuditAction(
        req.user,
        'DELETE_RESERVATION_ITEM',
        'reservation_items',
        parseInt(itemId),
        item,
        null,
        req
      );

      res.json({ message: 'Reservation item deleted successfully' });

    } catch (itemErr) {
      await pool.query('ROLLBACK');
      throw itemErr;
    }

  } catch (err) {
    console.error('Error deleting reservation item:', err);
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
    
    // Log audit action for reservation status update
    await logAuditAction(
      req.user,
      'update',
      'reserved_bills',
      id,
      { status: reservation.status, notes: reservation.notes },
      { status, notes },
      req
    );
    
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

// Complete a reservation (convert to bill) - Enhanced multi-item version
app.post('/api/reservations/:id/complete-enhanced', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { additional_amount = 0 } = req.body;
  
  try {
    await pool.query('BEGIN');
    
    // Get reservation with items
    const reservationResult = await pool.query(`
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ri.id,
                 'part_id', ri.part_id,
                 'part_name', ri.part_name,
                 'manufacturer', ri.manufacturer,
                 'quantity', ri.quantity,
                 'unit_price', ri.unit_price,
                 'total_price', ri.total_price
               )
             ) as items
      FROM reservations r
      LEFT JOIN reservation_items ri ON r.id = ri.reservation_id
      WHERE r.id = $1 AND r.status = 'reserved'
      GROUP BY r.id
    `, [id]);
    
    if (reservationResult.rows.length === 0) {
      throw new Error('Reservation not found or already completed');
    }
    
    const reservation = reservationResult.rows[0];
    const items = reservation.items.filter(item => item.id !== null); // Remove null entries from json_agg
    
    if (items.length === 0) {
      throw new Error('No items found in reservation');
    }
    
    // Generate bill number
    const billNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calculate total amount (reservation total + any additional amount)
    const total_amount = parseFloat(reservation.total_amount) + parseFloat(additional_amount);
    
    // Create bill
    const billResult = await pool.query(`
      INSERT INTO bills (
        bill_number, customer_name, customer_phone, 
        total_amount, created_by
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [
      billNumber, reservation.customer_name, reservation.customer_phone,
      total_amount, req.user.id
    ]);
    
    const bill = billResult.rows[0];
    
    // Create bill items and move stock from reserved to sold
    for (const item of items) {
      // Create bill item
      await pool.query(`
        INSERT INTO bill_items (
          bill_id, part_id, part_name, manufacturer,
          quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        bill.id, item.part_id, item.part_name, item.manufacturer,
        item.quantity, item.unit_price, item.total_price
      ]);
      
      // Get current part stock
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [item.part_id]);
      const part = partResult.rows[0];
      
      // Update part stock (move from reserved to sold)
      const newReserved = part.reserved_stock - item.quantity;
      const newSold = part.sold_stock + item.quantity;
      
      await pool.query(`
        UPDATE parts 
        SET reserved_stock = $1, sold_stock = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newReserved, newSold, item.part_id]);
      
      // Log stock movement
      await logStockMovement(
        item.part_id,
        'sale',
        -item.quantity,
        part.reserved_stock,
        newReserved,
        'reservation_completion',
        bill.id,
        `Reservation ${reservation.reservation_number} completed as bill ${billNumber}`,
        req.user.id
      );
    }
    
    // Update reservation status
    await pool.query(`
      UPDATE reservations 
      SET status = 'completed', completed_date = CURRENT_TIMESTAMP, completed_by = $1
      WHERE id = $2
    `, [req.user.id, id]);
    
    // Log audit action for reservation completion
    await logAuditAction(
      req.user,
      'COMPLETE_RESERVATION',
      'reservations',
      parseInt(id),
      { status: 'reserved' },
      { status: 'completed', bill_number: billNumber },
      req
    );
    
    await pool.query('COMMIT');
    res.json({
      message: 'Reservation completed successfully',
      bill: bill,
      reservation: reservation
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error completing reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cancel a reservation - Enhanced multi-item version
app.post('/api/reservations/:id/cancel-enhanced', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
    await pool.query('BEGIN');
    
    // Get reservation with items
    const reservationResult = await pool.query(`
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ri.id,
                 'part_id', ri.part_id,
                 'part_name', ri.part_name,
                 'quantity', ri.quantity
               )
             ) as items
      FROM reservations r
      LEFT JOIN reservation_items ri ON r.id = ri.reservation_id
      WHERE r.id = $1 AND r.status = 'reserved'
      GROUP BY r.id
    `, [id]);
    
    if (reservationResult.rows.length === 0) {
      throw new Error('Reservation not found or already processed');
    }
    
    const reservation = reservationResult.rows[0];
    const items = reservation.items.filter(item => item.id !== null);
    
    // Restore stock for all items
    for (const item of items) {
      // Get current part stock
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [item.part_id]);
      const part = partResult.rows[0];
      
      // Move stock from reserved back to available
      const newAvailable = part.available_stock + item.quantity;
      const newReserved = part.reserved_stock - item.quantity;
      
      await pool.query(`
        UPDATE parts 
        SET available_stock = $1, reserved_stock = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newAvailable, newReserved, item.part_id]);
      
      // Log stock movement
      await logStockMovement(
        item.part_id,
        'return',
        item.quantity,
        part.available_stock,
        newAvailable,
        'reservation_cancellation',
        reservation.id,
        `Reservation ${reservation.reservation_number} cancelled: ${reason || 'No reason provided'}`,
        req.user.id
      );
    }
    
    // Update reservation status
    await pool.query(`
      UPDATE reservations 
      SET status = 'cancelled', completed_date = CURRENT_TIMESTAMP, completed_by = $1, notes = COALESCE(notes, '') || ' [CANCELLED: ' || $2 || ']'
      WHERE id = $3
    `, [req.user.id, reason || 'No reason provided', id]);
    
    // Log audit action for reservation cancellation
    await logAuditAction(
      req.user,
      'CANCEL_RESERVATION',
      'reservations',
      parseInt(id),
      { status: 'reserved' },
      { status: 'cancelled', cancellation_reason: reason },
      req
    );
    
    await pool.query('COMMIT');
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error cancelling reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get reservation details by ID - Enhanced version
app.get('/api/reservations/:id/enhanced', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ri.id,
                 'part_id', ri.part_id,
                 'part_name', ri.part_name,
                 'manufacturer', ri.manufacturer,
                 'quantity', ri.quantity,
                 'unit_price', ri.unit_price,
                 'total_price', ri.total_price,
                 'available_stock', p.available_stock
               ) ORDER BY ri.id
             ) as items,
             u1.username as created_by_username, 
             u2.username as completed_by_username
      FROM reservations r
      LEFT JOIN reservation_items ri ON r.id = ri.reservation_id
      LEFT JOIN parts p ON ri.part_id = p.id
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.completed_by = u2.id
      WHERE r.id = $1
      GROUP BY r.id, u1.username, u2.username
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching reservation details:', err);
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

// Get all bills with search support and pagination
app.get('/bills', authenticateToken, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT 
        b.*,
        COALESCE(items_agg.items, '[]'::json) as items,
        COALESCE(refunds_agg.refund_history, '[]'::json) as refund_history,
        COALESCE(refunds_agg.total_refunded, 0) as total_refunded
      FROM bills b
      LEFT JOIN (
        SELECT bi.bill_id,
               json_agg(
                 json_build_object(
                   'id', bi.id,
                   'part_id', bi.part_id,
                   'part_name', bi.part_name,
                   'manufacturer', bi.manufacturer,
                   'quantity', bi.quantity,
                   'unit_price', bi.unit_price,
                   'total_price', bi.total_price
                 ) ORDER BY bi.id
               ) as items
        FROM bill_items bi
        GROUP BY bi.bill_id
      ) items_agg ON b.id = items_agg.bill_id
      LEFT JOIN (
        SELECT 
          br.bill_id,
          json_agg(
            json_build_object(
              'id', br.id,
              'refund_amount', br.refund_amount,
              'refund_reason', br.refund_reason,
              'refund_type', br.refund_type,
              'refund_date', br.refund_date,
              'refunded_by_name', u.username,
              'refund_items', COALESCE(bri_agg.items, '[]'::json)
            ) ORDER BY br.refund_date DESC
          ) as refund_history,
          SUM(br.refund_amount) as total_refunded
        FROM bill_refunds br
        LEFT JOIN users u ON br.refunded_by = u.id
        LEFT JOIN (
          SELECT 
            bri.refund_id,
            json_agg(
              json_build_object(
                'part_id', bri.part_id,
                'part_name', p.name,
                'manufacturer', p.manufacturer,
                'quantity', bri.quantity,
                'unit_price', bri.unit_price,
                'total_price', bri.total_price
              ) ORDER BY bri.id
            ) as items
          FROM bill_refund_items bri
          LEFT JOIN parts p ON bri.part_id = p.id
          GROUP BY bri.refund_id
        ) bri_agg ON br.id = bri_agg.refund_id
        GROUP BY br.bill_id
      ) refunds_agg ON b.id = refunds_agg.bill_id
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` WHERE (
        b.bill_number ILIKE $${paramIndex} OR 
        b.customer_name ILIKE $${paramIndex} OR 
        b.customer_phone ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM bill_items bi2 
          WHERE bi2.bill_id = b.id 
          AND (bi2.part_name ILIKE $${paramIndex} OR bi2.manufacturer ILIKE $${paramIndex})
        )
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await pool.query(query, queryParams);
    
    // Process results to add calculated refund info
    const processedBills = result.rows.map(bill => {
      const totalRefunded = parseFloat(bill.total_refunded || 0);
      const remainingAmount = parseFloat(bill.total_amount) - totalRefunded;
      
      return {
        ...bill,
        total_refunded: totalRefunded,
        remaining_amount: remainingAmount,
        refund_percentage: bill.total_amount > 0 ? (totalRefunded / parseFloat(bill.total_amount)) * 100 : 0
      };
    });
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
    `;
    
    const countParams = [];
    
    if (search) {
      countQuery += ` WHERE (
        b.bill_number ILIKE $1 OR 
        b.customer_name ILIKE $1 OR 
        b.customer_phone ILIKE $1 OR
        EXISTS (
          SELECT 1 FROM bill_items bi2 
          WHERE bi2.bill_id = b.id 
          AND (bi2.part_name ILIKE $1 OR bi2.manufacturer ILIKE $1)
        )
      )`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      bills: processedBills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPreviousPage: parseInt(page) > 1
      }
    });
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
       SET bill_number = $1, customer_name = $2, customer_phone = $3
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

// Add bill item (SuperAdmin only)
app.post('/bills/:billId/items', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { billId } = req.params;
  const { part_id, quantity, unit_price } = req.body;
  
  try {
    if (!part_id || !quantity || !unit_price) {
      return res.status(400).json({ error: 'Part ID, quantity, and unit price are required' });
    }

    await pool.query('BEGIN');

    try {
      // Get part details
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [part_id]);
      if (partResult.rows.length === 0) {
        throw new Error('Part not found');
      }
      const part = partResult.rows[0];

      // Check if part has sufficient stock
      if (part.available_stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${part.available_stock}, Requested: ${quantity}`);
      }

      // Add item to bill
      const total_price = quantity * unit_price;
      const itemResult = await pool.query(
        `INSERT INTO bill_items (bill_id, part_id, part_name, manufacturer, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [billId, part_id, part.name, part.manufacturer, quantity, unit_price, total_price]
      );

      // Update part stock
      await pool.query(
        `UPDATE parts 
         SET available_stock = available_stock - $1, sold_stock = sold_stock + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [quantity, part_id]
      );

      // Update bill total
      await pool.query(
        `UPDATE bills 
         SET total_amount = (
           SELECT COALESCE(SUM(total_price), 0) 
           FROM bill_items 
           WHERE bill_id = $1
         )
         WHERE id = $1`,
        [billId]
      );

      // Log stock movement
      await logStockMovement(
        part_id,
        'sale',
        quantity,
        part.available_stock,
        part.available_stock - quantity,
        'bill_edit',
        billId,
        `Item added to bill ${billId} by SuperAdmin`,
        req.user.id
      );

      await pool.query('COMMIT');

      // Log audit action
      await logAuditAction(
        req.user,
        'ADD_BILL_ITEM',
        'bill_items',
        itemResult.rows[0].id,
        null,
        itemResult.rows[0],
        req
      );

      res.json(itemResult.rows[0]);

    } catch (itemErr) {
      await pool.query('ROLLBACK');
      throw itemErr;
    }

  } catch (err) {
    console.error('Error adding bill item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update bill item (SuperAdmin only)
app.put('/bills/:billId/items/:itemId', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { billId, itemId } = req.params;
  const { quantity, unit_price } = req.body;
  
  try {
    if (!quantity || !unit_price) {
      return res.status(400).json({ error: 'Quantity and unit price are required' });
    }

    await pool.query('BEGIN');

    try {
      // Get current item details
      const itemResult = await pool.query(
        'SELECT * FROM bill_items WHERE id = $1 AND bill_id = $2',
        [itemId, billId]
      );
      
      if (itemResult.rows.length === 0) {
        throw new Error('Bill item not found');
      }
      
      const currentItem = itemResult.rows[0];
      const quantityDiff = quantity - currentItem.quantity;
      
      // Get part details for stock check
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [currentItem.part_id]);
      if (partResult.rows.length === 0) {
        throw new Error('Part not found');
      }
      const part = partResult.rows[0];

      // Check stock availability for quantity increase
      if (quantityDiff > 0 && part.available_stock < quantityDiff) {
        throw new Error(`Insufficient stock for increase. Available: ${part.available_stock}, Needed: ${quantityDiff}`);
      }

      // Update bill item
      const total_price = quantity * unit_price;
      const updatedItemResult = await pool.query(
        `UPDATE bill_items 
         SET quantity = $1, unit_price = $2, total_price = $3
         WHERE id = $4 AND bill_id = $5 RETURNING *`,
        [quantity, unit_price, total_price, itemId, billId]
      );

      // Update part stock
      await pool.query(
        `UPDATE parts 
         SET available_stock = available_stock + $1, sold_stock = sold_stock - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [quantityDiff * -1, currentItem.part_id] // Negative because we're adjusting in opposite direction
      );

      // Update bill total
      await pool.query(
        `UPDATE bills 
         SET total_amount = (
           SELECT COALESCE(SUM(total_price), 0) 
           FROM bill_items 
           WHERE bill_id = $1
         )
         WHERE id = $1`,
        [billId]
      );

      // Log stock movement
      await logStockMovement(
        currentItem.part_id,
        quantityDiff > 0 ? 'sale' : 'return',
        Math.abs(quantityDiff),
        part.available_stock,
        part.available_stock - quantityDiff,
        'bill_edit',
        billId,
        `Item quantity updated in bill ${billId} by SuperAdmin (${currentItem.quantity} → ${quantity})`,
        req.user.id
      );

      await pool.query('COMMIT');

      // Log audit action
      await logAuditAction(
        req.user,
        'UPDATE_BILL_ITEM',
        'bill_items',
        parseInt(itemId),
        currentItem,
        updatedItemResult.rows[0],
        req
      );

      res.json(updatedItemResult.rows[0]);

    } catch (itemErr) {
      await pool.query('ROLLBACK');
      throw itemErr;
    }

  } catch (err) {
    console.error('Error updating bill item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete bill item (SuperAdmin only)
app.delete('/bills/:billId/items/:itemId', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { billId, itemId } = req.params;
  
  try {
    await pool.query('BEGIN');

    try {
      // Get item details before deletion
      const itemResult = await pool.query(
        'SELECT * FROM bill_items WHERE id = $1 AND bill_id = $2',
        [itemId, billId]
      );
      
      if (itemResult.rows.length === 0) {
        throw new Error('Bill item not found');
      }
      
      const item = itemResult.rows[0];
      
      // Get part details
      const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [item.part_id]);
      if (partResult.rows.length === 0) {
        throw new Error('Part not found');
      }
      const part = partResult.rows[0];

      // Delete the item
      await pool.query('DELETE FROM bill_items WHERE id = $1 AND bill_id = $2', [itemId, billId]);

      // Restore stock
      await pool.query(
        `UPDATE parts 
         SET available_stock = available_stock + $1, sold_stock = sold_stock - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [item.quantity, item.part_id]
      );

      // Update bill total
      await pool.query(
        `UPDATE bills 
         SET total_amount = (
           SELECT COALESCE(SUM(total_price), 0) 
           FROM bill_items 
           WHERE bill_id = $1
         )
         WHERE id = $1`,
        [billId]
      );

      // Log stock movement
      await logStockMovement(
        item.part_id,
        'return',
        item.quantity,
        part.available_stock,
        part.available_stock + item.quantity,
        'bill_edit',
        billId,
        `Item removed from bill ${billId} by SuperAdmin`,
        req.user.id
      );

      await pool.query('COMMIT');

      // Log audit action
      await logAuditAction(
        req.user,
        'DELETE_BILL_ITEM',
        'bill_items',
        parseInt(itemId),
        item,
        null,
        req
      );

      res.json({ message: 'Bill item deleted successfully' });

    } catch (itemErr) {
      await pool.query('ROLLBACK');
      throw itemErr;
    }

  } catch (err) {
    console.error('Error deleting bill item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get bill refund details (for continuing partial refunds)
app.get('/bills/:id/refund-details', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get bill with items
    const billResult = await pool.query(`
      SELECT b.*, 
             json_agg(
               json_build_object(
                 'id', bi.id,
                 'part_id', bi.part_id,
                 'part_name', p.name,
                 'manufacturer', p.manufacturer,
                 'quantity', bi.quantity,
                 'unit_price', bi.unit_price,
                 'total_price', bi.total_price
               )
               ORDER BY bi.id
             ) as items
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
      LEFT JOIN parts p ON bi.part_id = p.id
      WHERE b.id = $1
      GROUP BY b.id
    `, [id]);
    
    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bill = billResult.rows[0];
    
    // Get all previous refunds for this bill
    const refundsResult = await pool.query(`
      SELECT br.*, 
             json_agg(
               CASE WHEN bri.id IS NOT NULL THEN
                 json_build_object(
                   'part_id', bri.part_id,
                   'quantity', bri.quantity,
                   'unit_price', bri.unit_price,
                   'total_price', bri.total_price
                 )
               ELSE NULL END
             ) as refund_items
      FROM bill_refunds br
      LEFT JOIN bill_refund_items bri ON br.id = bri.refund_id
      WHERE br.bill_id = $1
      GROUP BY br.id
      ORDER BY br.refund_date DESC
    `, [id]);
    
    const refunds = refundsResult.rows;
    
    // Calculate remaining quantities for each item
    const itemsWithRemaining = bill.items.map(item => {
      let totalRefunded = 0;
      
      // Sum up all previous refunds for this part
      refunds.forEach(refund => {
        if (refund.refund_items) {
          refund.refund_items.forEach(refundItem => {
            if (refundItem && refundItem.part_id === item.part_id) {
              totalRefunded += refundItem.quantity;
            }
          });
        }
      });
      
      const remainingQuantity = item.quantity - totalRefunded;
      
      return {
        ...item,
        total_refunded: totalRefunded,
        remaining_quantity: remainingQuantity,
        can_refund: remainingQuantity > 0
      };
    });
    
    // Calculate remaining refund amount
    const totalRefundedAmount = refunds.reduce((sum, refund) => sum + parseFloat(refund.refund_amount), 0);
    const remainingRefundAmount = parseFloat(bill.total_amount) - totalRefundedAmount;
    
    res.json({
      bill: {
        ...bill,
        items: itemsWithRemaining
      },
      refund_history: refunds,
      total_refunded_amount: totalRefundedAmount,
      remaining_refund_amount: remainingRefundAmount,
      can_continue_refund: remainingRefundAmount > 0 && itemsWithRemaining.some(item => item.can_refund)
    });
    
  } catch (err) {
    console.error('Error getting refund details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Process refund
app.post('/bills/:id/refund', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { refund_amount, refund_reason, refund_type, refund_items } = req.body;
  
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
                   'part_name', p.name,
                   'manufacturer', p.manufacturer,
                   'quantity', bi.quantity,
                   'unit_price', bi.unit_price,
                   'total_price', bi.total_price
                 )
               ) as items
        FROM bills b
        LEFT JOIN bill_items bi ON b.id = bi.bill_id
        LEFT JOIN parts p ON bi.part_id = p.id
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
      
      // Get remaining quantities for partial refund validation
      let remainingQuantities = {};
      if (bill.status === 'partially_refunded') {
        // Get all previous refunds for this bill
        const refundsResult = await pool.query(`
          SELECT bri.part_id, SUM(bri.quantity) as total_refunded
          FROM bill_refunds br
          JOIN bill_refund_items bri ON br.id = bri.refund_id
          WHERE br.bill_id = $1
          GROUP BY bri.part_id
        `, [id]);
        
        // Calculate remaining quantities
        bill.items.forEach(item => {
          const refunded = refundsResult.rows.find(r => r.part_id === item.part_id);
          const totalRefunded = refunded ? parseInt(refunded.total_refunded) : 0;
          remainingQuantities[item.part_id] = item.quantity - totalRefunded;
        });
      } else {
        // For bills that haven't been refunded yet, all quantities are available
        bill.items.forEach(item => {
          remainingQuantities[item.part_id] = item.quantity;
        });
      }
      
      // Determine refund status and items to refund
      let newStatus = 'refunded';
      let itemsToRefund = bill.items;
      
      if (refund_type === 'partial') {
        newStatus = 'partially_refunded';
        
        if (!refund_items || refund_items.length === 0) {
          throw new Error('Partial refund requires selected items');
        }
        
        // Validate refund items against remaining quantities
        for (const refundItem of refund_items) {
          const originalItem = bill.items.find(item => item.part_id === refundItem.part_id);
          if (!originalItem) {
            throw new Error(`Part ID ${refundItem.part_id} not found in bill`);
          }
          
          const remainingQuantity = remainingQuantities[refundItem.part_id];
          if (refundItem.quantity > remainingQuantity) {
            throw new Error(`Cannot refund ${refundItem.quantity} units of part ${refundItem.part_id}, only ${remainingQuantity} units remain available for refund`);
          }
          
          if (remainingQuantity <= 0) {
            throw new Error(`Part ${refundItem.part_id} has already been fully refunded`);
          }
        }
        
        itemsToRefund = refund_items;
        
        // Check if this refund completes all remaining quantities
        const isCompleteRefund = bill.items.every(item => {
          const refundItem = refund_items.find(ri => ri.part_id === item.part_id);
          const refundQuantity = refundItem ? refundItem.quantity : 0;
          const remainingAfterThisRefund = remainingQuantities[item.part_id] - refundQuantity;
          return remainingAfterThisRefund <= 0;
        });
        
        if (isCompleteRefund) {
          newStatus = 'refunded';
        }
      } else {
        // Full refund - set refund_amount to original bill amount if not specified
        if (parseFloat(refund_amount) < parseFloat(bill.total_amount)) {
          newStatus = 'partially_refunded';
        }
      }
      
      // Update bill with refund information
      const updatedBillResult = await pool.query(
        `UPDATE bills 
         SET status = $1, refund_date = CURRENT_DATE, refund_reason = $2, 
             refund_amount = COALESCE(refund_amount, 0) + $3, refunded_by = $4
         WHERE id = $5 RETURNING *`,
        [newStatus, refund_reason, refund_amount, req.user.id, id]
      );
      
      // Create refund record for tracking
      const refundInsertResult = await pool.query(
        `INSERT INTO bill_refunds (bill_id, refund_amount, refund_reason, refund_type, refunded_by, refund_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING id`,
        [id, refund_amount, refund_reason, refund_type || 'full', req.user.id]
      );
      
      // Get the refund ID for item tracking
      const refundId = refundInsertResult.rows[0]?.id;
      
      // Restore stock for refunded items
      for (const item of itemsToRefund) {
        const refundQuantity = refund_type === 'partial' ? item.quantity : 
          bill.items.find(bi => bi.part_id === item.part_id)?.quantity || item.quantity;
        
        if (item.part_id && refundQuantity > 0) {
          // Get current part stock
          const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [item.part_id]);
          if (partResult.rows.length > 0) {
            const part = partResult.rows[0];
            const newAvailableStock = part.available_stock + refundQuantity;
            const newSoldStock = part.sold_stock - refundQuantity;
            
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
              refundQuantity,
              part.available_stock,
              newAvailableStock,
              'refund',
              bill.id,
              `${refund_type === 'partial' ? 'Partial refund' : 'Full refund'} for bill ${bill.bill_number || bill.id}`,
              req.user.id
            );
            
            // Record refund item detail if we have a refund ID
            if (refundId) {
              await pool.query(
                `INSERT INTO bill_refund_items (refund_id, part_id, quantity, unit_price, total_price)
                 VALUES ($1, $2, $3, $4, $5)`,
                [refundId, item.part_id, refundQuantity, item.unit_price || item.refund_unit_price, 
                 refundQuantity * (item.unit_price || item.refund_unit_price)]
              );
            }
          }
        }
      }
      
      await pool.query('COMMIT');
      
      // Log audit action
      await logAuditAction(
        req.user,
        refund_type === 'partial' ? 'PARTIAL_REFUND' : 'FULL_REFUND',
        'bills',
        parseInt(id),
        bill,
        {
          ...updatedBillResult.rows[0],
          refunded_items: itemsToRefund,
          refund_type: refund_type || 'full'
        },
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

// Debug endpoint to check refund data
app.get('/debug-refunds/:billId', authenticateToken, async (req, res) => {
  const { billId } = req.params;
  
  try {
    console.log('Debugging refund data for bill:', billId);
    
    // Get bill_refunds
    const refundsResult = await pool.query(`
      SELECT id, bill_id, refund_amount, refund_reason, refund_type, refund_date, refunded_by
      FROM bill_refunds 
      WHERE bill_id = $1 
      ORDER BY id
    `, [billId]);

    // Get bill_refund_items
    const refundItemsResult = await pool.query(`
      SELECT bri.*, p.name as part_name
      FROM bill_refund_items bri
      LEFT JOIN parts p ON bri.part_id = p.id
      WHERE bri.refund_id IN (SELECT id FROM bill_refunds WHERE bill_id = $1)
      ORDER BY bri.refund_id, bri.part_id
    `, [billId]);

    res.json({
      bill_id: billId,
      refunds: refundsResult.rows,
      refund_items: refundItemsResult.rows,
      summary: {
        total_refunds: refundsResult.rows.length,
        total_refund_items: refundItemsResult.rows.length
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================== SOLD STOCK REPORT ROUTES ======================

// Get sold stock report with filtering and pagination
app.get('/sold-stock-report', authenticateToken, async (req, res) => {
  try {
    const { 
      container_no, 
      local_purchase, 
      from_date, 
      to_date, 
      page = 1, 
      limit = 20 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build dynamic WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by container number
    if (container_no) {
      conditions.push(`p.container_no = $${paramIndex}`);
      params.push(container_no);
      paramIndex++;
    }

    // Filter by local purchase (true/false)
    if (local_purchase !== undefined) {
      const isLocal = local_purchase === 'true' || local_purchase === true;
      conditions.push(`p.local_purchase = $${paramIndex}`);
      params.push(isLocal);
      paramIndex++;
    }

    // Filter by date range
    if (from_date) {
      conditions.push(`DATE(b.created_at) >= $${paramIndex}`);
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      conditions.push(`DATE(b.created_at) <= $${paramIndex}`);
      params.push(to_date);
      paramIndex++;
    }

    // Build the WHERE clause
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Main query for sold stock data
    const query = `
      SELECT 
        p.id as part_id,
        p.name as part_name,
        p.manufacturer,
        p.part_number,
        p.container_no,
        p.local_purchase,
        p.cost_price,
        p.recommended_price,
        bi.part_id,
        bi.part_name as bill_part_name,
        bi.manufacturer as bill_manufacturer,
        bi.quantity as sold_quantity,
        bi.unit_price as sold_price,
        bi.total_price as sale_total,
        b.id as bill_id,
        b.bill_number,
        b.customer_name,
        b.customer_phone,
        DATE(b.created_at) as bill_date,
        b.status as bill_status,
        b.created_at as sale_date,
        u.username as sold_by
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN parts p ON bi.part_id = p.id
      LEFT JOIN users u ON b.created_by = u.id
      ${whereClause}
      ORDER BY b.created_at DESC, bi.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT bi.id) as total
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN parts p ON bi.part_id = p.id
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Calculate summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT bi.id) as total_items_sold,
        COUNT(DISTINCT b.id) as total_bills,
        COUNT(DISTINCT p.id) as unique_parts_sold,
        SUM(bi.quantity) as total_quantity_sold,
        SUM(bi.total_price) as total_revenue,
        AVG(bi.unit_price) as average_selling_price,
        MIN(DATE(b.created_at)) as earliest_sale,
        MAX(DATE(b.created_at)) as latest_sale,
        COUNT(CASE WHEN p.local_purchase = true THEN 1 END) as local_purchase_items,
        COUNT(CASE WHEN p.local_purchase = false THEN 1 END) as container_items,
        COUNT(DISTINCT p.container_no) FILTER (WHERE p.container_no IS NOT NULL) as unique_containers
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN parts p ON bi.part_id = p.id
      ${whereClause}
    `;

    const summaryResult = await pool.query(summaryQuery, countParams);
    const summary = summaryResult.rows[0];

    // Process the sold stock data
    const soldStockData = result.rows.map(row => ({
      sale_details: {
        bill_id: row.bill_id,
        bill_number: row.bill_number,
        bill_date: row.bill_date,
        bill_status: row.bill_status,
        sale_date: row.sale_date,
        sold_by: row.sold_by
      },
      customer_details: {
        customer_name: row.customer_name,
        customer_phone: row.customer_phone
      },
      part_details: {
        part_id: row.part_id,
        part_name: row.part_name,
        manufacturer: row.manufacturer,
        part_number: row.part_number,
        container_no: row.container_no,
        local_purchase: row.local_purchase,
        cost_price: row.cost_price ? parseFloat(row.cost_price) : null,
        recommended_price: row.recommended_price ? parseFloat(row.recommended_price) : null
      },
      sale_metrics: {
        sold_quantity: row.sold_quantity,
        sold_price: parseFloat(row.sold_price),
        sale_total: parseFloat(row.sale_total),
        profit_margin: row.cost_price ? 
          ((parseFloat(row.sold_price) - parseFloat(row.cost_price)) / parseFloat(row.sold_price) * 100).toFixed(2) + '%' : 
          null
      }
    }));

    // Build response
    const response = {
      sold_stock: soldStockData,
      summary: {
        total_items_sold: parseInt(summary.total_items_sold),
        total_bills: parseInt(summary.total_bills),
        unique_parts_sold: parseInt(summary.unique_parts_sold),
        total_quantity_sold: parseInt(summary.total_quantity_sold),
        total_revenue: parseFloat(summary.total_revenue || 0),
        average_selling_price: summary.average_selling_price ? parseFloat(summary.average_selling_price) : 0,
        earliest_sale: summary.earliest_sale,
        latest_sale: summary.latest_sale,
        local_purchase_items: parseInt(summary.local_purchase_items),
        container_items: parseInt(summary.container_items),
        unique_containers: parseInt(summary.unique_containers)
      },
      filters_applied: {
        container_no: container_no || null,
        local_purchase: local_purchase !== undefined ? (local_purchase === 'true' || local_purchase === true) : null,
        from_date: from_date || null,
        to_date: to_date || null
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPreviousPage: parseInt(page) > 1,
        offset
      }
    };

    res.json(response);

  } catch (err) {
    console.error('Error fetching sold stock report:', err);
    res.status(500).json({ 
      error: 'Failed to fetch sold stock report',
      details: err.message 
    });
  }
});

// Get sold stock summary (aggregated statistics only)
app.get('/sold-stock-summary', authenticateToken, async (req, res) => {
  try {
    const { 
      container_no, 
      local_purchase, 
      from_date, 
      to_date 
    } = req.query;

    // Build dynamic WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (container_no) {
      conditions.push(`p.container_no = $${paramIndex}`);
      params.push(container_no);
      paramIndex++;
    }

    if (local_purchase !== undefined) {
      const isLocal = local_purchase === 'true' || local_purchase === true;
      conditions.push(`p.local_purchase = $${paramIndex}`);
      params.push(isLocal);
      paramIndex++;
    }

    if (from_date) {
      conditions.push(`DATE(b.created_at) >= $${paramIndex}`);
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      conditions.push(`DATE(b.created_at) <= $${paramIndex}`);
      params.push(to_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Comprehensive summary query
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT bi.id) as total_items_sold,
        COUNT(DISTINCT b.id) as total_bills,
        COUNT(DISTINCT p.id) as unique_parts_sold,
        SUM(bi.quantity) as total_quantity_sold,
        SUM(bi.total_price) as total_revenue,
        AVG(bi.unit_price) as average_selling_price,
        MIN(bi.unit_price) as min_selling_price,
        MAX(bi.unit_price) as max_selling_price,
        MIN(DATE(b.created_at)) as earliest_sale,
        MAX(DATE(b.created_at)) as latest_sale,
        COUNT(CASE WHEN p.local_purchase = true THEN 1 END) as local_purchase_items,
        COUNT(CASE WHEN p.local_purchase = false THEN 1 END) as container_items,
        COUNT(DISTINCT p.container_no) FILTER (WHERE p.container_no IS NOT NULL) as unique_containers,
        SUM(CASE WHEN p.local_purchase = true THEN bi.total_price ELSE 0 END) as local_purchase_revenue,
        SUM(CASE WHEN p.local_purchase = false THEN bi.total_price ELSE 0 END) as container_revenue,
        SUM(CASE WHEN p.cost_price IS NOT NULL THEN (bi.unit_price - p.cost_price) * bi.quantity ELSE 0 END) as estimated_profit
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN parts p ON bi.part_id = p.id
      ${whereClause}
    `;

    const result = await pool.query(summaryQuery, params);
    const summary = result.rows[0];

    // Get top selling parts
    const topPartsQuery = `
      SELECT 
        p.name,
        p.manufacturer,
        p.container_no,
        p.local_purchase,
        SUM(bi.quantity) as total_sold,
        SUM(bi.total_price) as total_revenue,
        COUNT(DISTINCT b.id) as times_sold,
        AVG(bi.unit_price) as avg_price
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN parts p ON bi.part_id = p.id
      ${whereClause}
      GROUP BY p.id, p.name, p.manufacturer, p.container_no, p.local_purchase
      ORDER BY total_sold DESC
      LIMIT 10
    `;

    const topPartsResult = await pool.query(topPartsQuery, params);

    const response = {
      summary: {
        total_items_sold: parseInt(summary.total_items_sold || 0),
        total_bills: parseInt(summary.total_bills || 0),
        unique_parts_sold: parseInt(summary.unique_parts_sold || 0),
        total_quantity_sold: parseInt(summary.total_quantity_sold || 0),
        total_revenue: parseFloat(summary.total_revenue || 0),
        average_selling_price: summary.average_selling_price ? parseFloat(summary.average_selling_price) : 0,
        min_selling_price: summary.min_selling_price ? parseFloat(summary.min_selling_price) : 0,
        max_selling_price: summary.max_selling_price ? parseFloat(summary.max_selling_price) : 0,
        earliest_sale: summary.earliest_sale,
        latest_sale: summary.latest_sale,
        local_purchase_items: parseInt(summary.local_purchase_items || 0),
        container_items: parseInt(summary.container_items || 0),
        unique_containers: parseInt(summary.unique_containers || 0),
        local_purchase_revenue: parseFloat(summary.local_purchase_revenue || 0),
        container_revenue: parseFloat(summary.container_revenue || 0),
        estimated_profit: parseFloat(summary.estimated_profit || 0)
      },
      top_selling_parts: topPartsResult.rows.map(part => ({
        name: part.name,
        manufacturer: part.manufacturer,
        container_no: part.container_no,
        local_purchase: part.local_purchase,
        total_sold: parseInt(part.total_sold),
        total_revenue: parseFloat(part.total_revenue),
        times_sold: parseInt(part.times_sold),
        avg_price: parseFloat(part.avg_price)
      })),
      filters_applied: {
        container_no: container_no || null,
        local_purchase: local_purchase !== undefined ? (local_purchase === 'true' || local_purchase === true) : null,
        from_date: from_date || null,
        to_date: to_date || null
      }
    };

    res.json(response);

  } catch (err) {
    console.error('Error fetching sold stock summary:', err);
    res.status(500).json({ 
      error: 'Failed to fetch sold stock summary',
      details: err.message 
    });
  }
});

// Get available container numbers for sold stock filtering
app.get('/sold-stock-containers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT p.container_no 
      FROM parts p
      JOIN bill_items bi ON p.id = bi.part_id
      WHERE p.container_no IS NOT NULL 
        AND p.container_no != ''
        AND p.local_purchase = false
      ORDER BY p.container_no
    `);
    
    const containers = result.rows.map(row => row.container_no);
    res.json(containers);
    
  } catch (err) {
    console.error('Error fetching sold stock containers:', err);
    res.status(500).json({ 
      error: 'Failed to fetch container numbers',
      details: err.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
