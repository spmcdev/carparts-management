// Schema validation script - checks if staging matches consolidated migration
// This is SAFE - it only reads, never writes to the database

const { Pool } = require('pg');

// You'll need to add staging DB connection string
const pool = new Pool({
  connectionString: 'postgresql://postgres:[password]@[host]:[port]/railway',
  ssl: { rejectUnauthorized: false }
});

async function validateSchema() {
  console.log('🔍 Validating staging schema against consolidated migration...\n');
  
  try {
    // Check if all expected tables exist
    const expectedTables = [
      'users', 'parts', 'bills', 'bill_items', 
      'reservations', 'reservation_items', 'reserved_bills',
      'bill_refunds', 'bill_refund_items', 'stock_movements', 'audit_log'
    ];
    
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const existingTables = tableCheck.rows.map(r => r.table_name);
    
    console.log('📊 Table Status:');
    expectedTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    console.log('\n🗃️  Existing tables not in consolidated migration:');
    existingTables.forEach(table => {
      if (!expectedTables.includes(table)) {
        console.log(`  ⚠️  ${table} (legacy/extra table)`);
      }
    });
    
    // Check parts table structure
    console.log('\n🔧 Parts table column validation:');
    const partsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'parts' 
      ORDER BY ordinal_position
    `);
    
    const expectedPartsColumns = [
      'id', 'name', 'manufacturer', 'part_number', 'total_stock', 
      'available_stock', 'sold_stock', 'reserved_stock', 'cost_price',
      'recommended_price', 'stock_status', 'available_from', 'sold_date',
      'parent_id', 'container_no', 'local_purchase', 'created_at', 'updated_at'
    ];
    
    const existingPartsColumns = partsColumns.rows.map(r => r.column_name);
    
    expectedPartsColumns.forEach(col => {
      const exists = existingPartsColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });
    
    // Check for sample data
    console.log('\n📈 Data Summary:');
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM parts'),
      pool.query('SELECT COUNT(*) FROM bills'),
      pool.query('SELECT COUNT(*) FROM audit_log')
    ]);
    
    console.log(`  Users: ${counts[0].rows[0].count}`);
    console.log(`  Parts: ${counts[1].rows[0].count}`);
    console.log(`  Bills: ${counts[2].rows[0].count}`);
    console.log(`  Audit Logs: ${counts[3].rows[0].count}`);
    
    console.log('\n✅ Schema validation complete!');
    console.log('💡 This shows compatibility without data loss risk.');
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    console.log('\n💡 You need to set the DATABASE_URL for staging connection');
  } finally {
    await pool.end();
  }
}

// Run validation
if (require.main === module) {
  validateSchema();
}

module.exports = { validateSchema };
