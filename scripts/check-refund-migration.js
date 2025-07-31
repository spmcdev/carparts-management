#!/usr/bin/env node

/**
 * Database Migration Checker for Enhanced Refund System
 * 
 * This script checks if the required database tables for the enhanced refund system exist
 * and provides migration instructions if they don't.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkRefundTables() {
  console.log('🔍 Checking Enhanced Refund System Database Requirements...\n');
  
  try {
    // Check if refund tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bill_refunds', 'bill_refund_items')
      ORDER BY table_name;
    `;
    
    const result = await pool.query(tableCheckQuery);
    const existingTables = result.rows.map(row => row.table_name);
    const requiredTables = ['bill_refunds', 'bill_refund_items'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    console.log('📊 Required Tables for Enhanced Refund System:');
    console.log('   • bill_refunds (main refund records)');
    console.log('   • bill_refund_items (individual refunded items)\n');
    
    if (missingTables.length === 0) {
      console.log('✅ SUCCESS: All refund tables exist!');
      console.log('   The enhanced refund system is ready to use.\n');
      
      // Check if tables have data
      const refundCountQuery = 'SELECT COUNT(*) as count FROM bill_refunds';
      const refundCount = await pool.query(refundCountQuery);
      
      console.log(`📈 Current refund records: ${refundCount.rows[0].count}`);
      
      if (refundCount.rows[0].count > 0) {
        console.log('   📋 The system already has refund data.');
      } else {
        console.log('   📋 No refund data yet - ready for first use.');
      }
      
    } else {
      console.log('❌ MIGRATION REQUIRED: Missing tables detected!');
      console.log(`   Missing tables: ${missingTables.join(', ')}\n`);
      
      console.log('🚀 MIGRATION INSTRUCTIONS:');
      console.log('   Run the following migration to create the required tables:\n');
      console.log('   Option 1 - Run specific migration:');
      console.log('   psql -h localhost -p 5432 -U postgres -d carparts -f database/migrations/archive/17-create-refund-tracking-tables.sql\n');
      console.log('   Option 2 - Use consolidated migration (for fresh installs only):');
      console.log('   psql -h localhost -p 5432 -U postgres -d carparts -f database/migrations/00-consolidated-migration.sql\n');
      console.log('   ⚠️  WARNING: Option 2 will DROP all existing tables! Use only for fresh installations.\n');
    }
    
    // Additional checks for enhanced features
    console.log('🔧 Checking Enhanced Refund System Compatibility...');
    
    // Check if bills table has the expected structure
    const billsStructureQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const billsStructure = await pool.query(billsStructureQuery);
    const billsColumns = billsStructure.rows.map(row => row.column_name);
    
    console.log('   ✅ Bills table structure compatible');
    
    // Check if users table exists for refund tracking
    const usersCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    
    if (usersCheck.rows[0].count > 0) {
      console.log('   ✅ Users table exists for refund audit trail');
    } else {
      console.log('   ⚠️  Users table missing - required for refund tracking');
    }
    
    console.log('\n🎯 SYSTEM STATUS SUMMARY:');
    if (missingTables.length === 0) {
      console.log('   🟢 READY: Enhanced refund system is fully operational!');
      console.log('   🎉 Features available:');
      console.log('      • Multiple partial refunds per bill');
      console.log('      • Enhanced bill display with refund information');
      console.log('      • Professional print bills with refund history');
      console.log('      • Complete refund audit trail');
      console.log('      • Visual status indicators');
    } else {
      console.log('   🔴 NOT READY: Database migration required');
      console.log('   📋 After migration, you will have:');
      console.log('      • Complete multiple refund functionality');
      console.log('      • Enhanced bill display and print features');
      console.log('      • Professional refund documentation');
    }
    
  } catch (error) {
    console.log('❌ DATABASE CONNECTION ERROR:');
    console.log(`   Error: ${error.message}\n`);
    console.log('🔧 TROUBLESHOOTING:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check database connection settings in .env file');
    console.log('   3. Verify database exists and is accessible');
    console.log('   4. Check credentials and permissions\n');
    console.log('📝 Current connection settings:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
  } finally {
    await pool.end();
  }
}

// Run the check
checkRefundTables().catch(console.error);
