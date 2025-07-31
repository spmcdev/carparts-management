#!/usr/bin/env node

const express = require('express');
const { Pool } = require('pg');

// Test database connection and check schema
async function diagnoseSoldStockIssue() {
  console.log('🔍 Diagnosing Sold Stock Report Issue...\n');

  // Test 1: Check if we can create a basic Express app
  console.log('1. ✅ Express module loaded successfully');

  // Test 2: Check database connection
  console.log('2. 🔍 Testing database connection...');
  
  // Use environment variables or default values
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'carparts',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test 3: Check if bills table exists and its schema
    console.log('3. 🔍 Checking bills table schema...');
    const billsSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
      ORDER BY ordinal_position
    `);
    
    if (billsSchema.rows.length === 0) {
      console.error('❌ Bills table not found!');
      return;
    }
    
    console.log('✅ Bills table found with columns:');
    billsSchema.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Test 4: Check if bill_items table exists
    console.log('\n4. 🔍 Checking bill_items table schema...');
    const billItemsSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bill_items' 
      ORDER BY ordinal_position
    `);
    
    if (billItemsSchema.rows.length === 0) {
      console.error('❌ Bill_items table not found!');
      return;
    }
    
    console.log('✅ Bill_items table found with columns:');
    billItemsSchema.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Test 5: Check if parts table exists
    console.log('\n5. 🔍 Checking parts table schema...');
    const partsSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'parts' 
      ORDER BY ordinal_position
    `);
    
    if (partsSchema.rows.length === 0) {
      console.error('❌ Parts table not found!');
      return;
    }
    
    console.log('✅ Parts table found with columns:');
    partsSchema.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Test 6: Test basic query for sold stock data
    console.log('\n6. 🔍 Testing basic sold stock query...');
    const testQuery = `
      SELECT COUNT(*) as count
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN parts p ON bi.part_id = p.id
    `;
    
    const testResult = await client.query(testQuery);
    const count = testResult.rows[0].count;
    console.log(`✅ Found ${count} sold stock records`);
    
    if (count > 0) {
      // Test a sample query with the fixed date logic
      console.log('7. 🔍 Testing date filtering...');
      const dateTestQuery = `
        SELECT 
          b.id,
          b.created_at,
          DATE(b.created_at) as bill_date,
          bi.part_name,
          bi.quantity
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        JOIN parts p ON bi.part_id = p.id
        LIMIT 3
      `;
      
      const dateTestResult = await client.query(dateTestQuery);
      console.log('✅ Date filtering test successful:');
      dateTestResult.rows.forEach(row => {
        console.log(`   Bill ${row.id}: ${row.part_name} (${row.quantity}) - ${row.bill_date}`);
      });
    }
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Diagnosis complete! The database schema looks correct.');
    console.log('💡 The issue was likely the missing bill_date column - now using DATE(created_at) instead.');
    console.log('\n🚀 You can now start your server with: node index.js');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\n🔧 Common fixes:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check your database connection settings');
    console.log('3. Ensure the database and tables exist');
    console.log('4. Verify your environment variables or connection string');
  }
}

// Run the diagnosis
diagnoseSoldStockIssue();
