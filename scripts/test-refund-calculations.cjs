#!/usr/bin/env node

/**
 * Test script to verify refund calculations are working correctly
 */

const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables manually
function loadEnv() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('❌ Could not read .env file:', error.message);
    return {};
  }
}

const env = loadEnv();

const pool = new Pool({
  host: env.DB_HOST || 'localhost',
  port: env.DB_PORT || 5432,
  database: env.DB_NAME || 'carparts',
  user: env.DB_USER || 'postgres',
  password: env.DB_PASSWORD || 'postgres',
});

async function testRefundCalculations() {
  console.log('🧪 Testing Refund Calculations...\n');
  
  try {
    // Test the new query structure
    const query = `
      SELECT 
        b.id,
        b.bill_number,
        b.customer_name,
        b.total_amount,
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
        SELECT br.bill_id,
               json_agg(
                 json_build_object(
                   'id', br.id,
                   'refund_amount', br.refund_amount,
                   'refund_reason', br.refund_reason,
                   'refund_type', br.refund_type,
                   'refund_date', br.refund_date,
                   'refunded_by_name', u.username
                 ) ORDER BY br.refund_date DESC
               ) as refund_history,
               SUM(br.refund_amount) as total_refunded
        FROM bill_refunds br
        LEFT JOIN users u ON br.refunded_by = u.id
        GROUP BY br.bill_id
      ) refunds_agg ON b.id = refunds_agg.bill_id
      ORDER BY b.created_at DESC 
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('📋 No bills found in database');
      return;
    }
    
    console.log(`📊 Found ${result.rows.length} bills. Testing calculations:\n`);
    
    result.rows.forEach((bill, index) => {
      const totalRefunded = parseFloat(bill.total_refunded || 0);
      const remainingAmount = parseFloat(bill.total_amount) - totalRefunded;
      const refundPercentage = bill.total_amount > 0 ? (totalRefunded / parseFloat(bill.total_amount)) * 100 : 0;
      
      console.log(`🧾 Bill ${index + 1}: ${bill.bill_number || bill.id}`);
      console.log(`   Customer: ${bill.customer_name}`);
      console.log(`   Original Amount: Rs ${parseFloat(bill.total_amount).toFixed(2)}`);
      console.log(`   Total Refunded: Rs ${totalRefunded.toFixed(2)}`);
      console.log(`   Remaining Amount: Rs ${remainingAmount.toFixed(2)}`);
      console.log(`   Refund Percentage: ${refundPercentage.toFixed(1)}%`);
      
      // Show refund details if any
      const refunds = bill.refund_history || [];
      if (refunds.length > 0) {
        console.log(`   🔄 Refund History (${refunds.length} refunds):`);
        refunds.forEach((refund, refundIndex) => {
          console.log(`      ${refundIndex + 1}. Rs ${parseFloat(refund.refund_amount).toFixed(2)} - ${refund.refund_reason || 'No reason'} (${refund.refund_date})`);
        });
      } else {
        console.log(`   ✅ No refunds - calculations should show original amounts`);
      }
      
      console.log('');
    });
    
    // Verify calculation accuracy
    console.log('🔍 Verification:');
    let issuesFound = 0;
    
    result.rows.forEach((bill, index) => {
      const totalRefunded = parseFloat(bill.total_refunded || 0);
      const refunds = bill.refund_history || [];
      
      // Calculate total from individual refunds
      const calculatedTotal = refunds.reduce((sum, refund) => sum + parseFloat(refund.refund_amount || 0), 0);
      
      if (Math.abs(totalRefunded - calculatedTotal) > 0.01) {
        console.log(`❌ Bill ${bill.bill_number || bill.id}: Database total (${totalRefunded.toFixed(2)}) != Calculated total (${calculatedTotal.toFixed(2)})`);
        issuesFound++;
      }
    });
    
    if (issuesFound === 0) {
      console.log('✅ All refund calculations are correct!');
    } else {
      console.log(`❌ Found ${issuesFound} calculation issues`);
    }
    
  } catch (error) {
    console.log('❌ Error testing refund calculations:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testRefundCalculations().catch(console.error);
