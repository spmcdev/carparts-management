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
        
        // Ensure stock consistency
        if (newTotalStock < oldPart.sold_stock + oldPart.reserved_stock) {
          throw new Error('Total stock cannot be less than sold + reserved stock');
        }
        
        // Update available stock to maintain consistency
        if (fields.total_stock !== undefined && fields.available_stock === undefined) {
          newAvailableStock = newTotalStock - oldPart.sold_stock - oldPart.reserved_stock;
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
        
        // Update the part
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
             refund_amount = $3, refunded_by = $4, updated_at = CURRENT_TIMESTAMP
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
