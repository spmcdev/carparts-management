#!/usr/bin/env node

const { Pool } = require('pg');

// Staging Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'autorack.proxy.rlwy.net',
  database: 'carparts_staging',
  password: 'eLWNDTcgLnPZPGhgNvXxtUQXnYUULJGy',
  port: 47814,
});

async function debugRefundData() {
  try {
    console.log('🔍 DEBUGGING REFUND DATA INTEGRITY');
    console.log('=====================================\n');

    // Get the test bill data
    console.log('📊 BILL 9 DATA:');
    const billResult = await pool.query(`
      SELECT b.*, 
             json_agg(
               json_build_object(
                 'part_id', bi.part_id,
                 'part_name', p.name,
                 'quantity', bi.quantity,
                 'unit_price', bi.unit_price,
                 'total_price', bi.total_price
               )
             ) as items
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
      LEFT JOIN parts p ON bi.part_id = p.id
      WHERE b.id = 9
      GROUP BY b.id
    `);

    if (billResult.rows.length > 0) {
      const bill = billResult.rows[0];
      console.log(`Bill ID: ${bill.id}, Total: Rs ${bill.total_amount}, Status: ${bill.status}`);
      console.log('Bill Items:');
      bill.items.forEach(item => {
        console.log(`  - ${item.part_name} (ID: ${item.part_id}): Qty ${item.quantity} @ Rs ${item.unit_price} = Rs ${item.total_price}`);
      });
    }

    console.log('\n📋 BILL_REFUNDS TABLE:');
    const refundsResult = await pool.query(`
      SELECT id, bill_id, refund_amount, refund_reason, refund_type, refund_date, refunded_by
      FROM bill_refunds 
      WHERE bill_id = 9 
      ORDER BY id
    `);

    refundsResult.rows.forEach(refund => {
      console.log(`Refund ID: ${refund.id}, Amount: Rs ${refund.refund_amount}, Type: ${refund.refund_type}, Reason: ${refund.refund_reason}`);
    });

    console.log('\n📦 BILL_REFUND_ITEMS TABLE (RAW DATA):');
    const refundItemsResult = await pool.query(`
      SELECT bri.*, p.name as part_name
      FROM bill_refund_items bri
      LEFT JOIN parts p ON bri.part_id = p.id
      WHERE bri.refund_id IN (SELECT id FROM bill_refunds WHERE bill_id = 9)
      ORDER BY bri.refund_id, bri.part_id
    `);

    if (refundItemsResult.rows.length === 0) {
      console.log('❌ NO REFUND ITEMS FOUND! This explains why refunds show no items.');
    } else {
      refundItemsResult.rows.forEach(item => {
        console.log(`Refund ${item.refund_id}: ${item.part_name} (ID: ${item.part_id}) - Qty: ${item.quantity}, Price: Rs ${item.unit_price}`);
      });
    }

    console.log('\n🔄 CURRENT BILLS QUERY RESULT FOR BILL 9:');
    const currentQueryResult = await pool.query(`
      SELECT b.id, b.bill_number, b.customer_name, b.total_amount, b.status,
             b.refund_amount, b.refund_date, b.refund_reason, b.bill_date,
             b.created_by, b.refunded_by,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'refund_id', br.id,
                   'refund_amount', br.refund_amount,
                   'refund_reason', br.refund_reason,
                   'refund_type', br.refund_type,
                   'refund_date', br.refund_date,
                   'refunded_by', br.refunded_by,
                   'refund_items', COALESCE(refund_items_data.items, '[]'::json)
                 )
               ) FILTER (WHERE br.id IS NOT NULL), 
               '[]'::json
             ) as refund_history
      FROM bills b
      LEFT JOIN bill_refunds br ON b.id = br.bill_id
      LEFT JOIN (
        SELECT bri.refund_id,
               json_agg(
                 json_build_object(
                   'part_id', bri.part_id,
                   'part_name', p.name,
                   'manufacturer', p.manufacturer,
                   'quantity', bri.quantity,
                   'unit_price', bri.unit_price,
                   'total_price', bri.total_price
                 )
               ) as items
        FROM bill_refund_items bri
        LEFT JOIN parts p ON bri.part_id = p.id
        GROUP BY bri.refund_id
      ) refund_items_data ON br.id = refund_items_data.refund_id
      WHERE b.id = 9
      GROUP BY b.id, b.bill_number, b.customer_name, b.total_amount, b.status,
               b.refund_amount, b.refund_date, b.refund_reason, b.bill_date,
               b.created_by, b.refunded_by
    `);

    if (currentQueryResult.rows.length > 0) {
      const result = currentQueryResult.rows[0];
      console.log(`\nRefund History from Query (${result.refund_history.length} refunds):`);
      result.refund_history.forEach(refund => {
        console.log(`\nRefund ${refund.refund_id}: Rs ${refund.refund_amount} (${refund.refund_type})`);
        console.log(`  Reason: ${refund.refund_reason}`);
        console.log(`  Items (${refund.refund_items.length}):`);
        refund.refund_items.forEach(item => {
          console.log(`    - ${item.part_name} (ID: ${item.part_id}): Qty ${item.quantity} @ Rs ${item.unit_price}`);
        });
      });
    }

    console.log('\n🏁 ANALYSIS COMPLETE');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugRefundData();
