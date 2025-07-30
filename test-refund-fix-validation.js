#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';

async function testRefundFixValidation() {
  try {
    console.log('🧪 TESTING REFUND FIX VALIDATION');
    console.log('=================================\n');

    // Step 1: Get authentication token
    console.log('🔑 Getting authentication token...');
    const loginResponse = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to login');
    }

    const { token } = await loginResponse.json();
    console.log('✅ Authentication successful');

    // Step 2: Get available parts (different from previous test)
    console.log('\n📦 Getting available parts...');
    const partsResponse = await fetch(`${API_BASE_URL}/parts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!partsResponse.ok) {
      throw new Error('Failed to fetch parts');
    }

    const allParts = await partsResponse.json();
    // Use different parts this time - parts with IDs 2 and 4 if available
    const testParts = [
      allParts.find(p => p.id === 2) || allParts[1], // Second part
      allParts.find(p => p.id === 4) || allParts[3] || allParts[2]  // Fourth or third part
    ];

    console.log(`📋 Using test parts:`);
    testParts.forEach((part, index) => {
      console.log(`   ${index + 1}. ${part.name} (ID: ${part.id}) - Available: ${part.available_stock}`);
    });

    // Step 3: Create a fresh bill with 2 different items
    console.log('\n🛒 Creating fresh test bill...');
    const saleResponse = await fetch(`${API_BASE_URL}/sales/sell`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'REFUND FIX TEST - New Bill',
        customer_phone: '8888888888',
        items: [
          {
            part_id: testParts[0].id,
            quantity: 1,
            unit_price: 750
          },
          {
            part_id: testParts[1].id,
            quantity: 1,
            unit_price: 350
          }
        ]
      })
    });

    if (!saleResponse.ok) {
      const errorData = await saleResponse.json();
      throw new Error(`Failed to create sale: ${errorData.error}`);
    }

    const saleData = await saleResponse.json();
    const billId = saleData.id;
    console.log(`✅ Created test bill ID: ${billId}`);
    console.log(`   Total: Rs ${saleData.total_amount}`);
    console.log(`   Item 1: ${saleData.items[0].part_name} (ID: ${saleData.items[0].part_id}) - Rs ${saleData.items[0].total_price}`);
    console.log(`   Item 2: ${saleData.items[1].part_name} (ID: ${saleData.items[1].part_id}) - Rs ${saleData.items[1].total_price}`);

    // Wait for data to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Create first partial refund for item 1 only
    console.log(`\n💰 Creating Refund 1: ONLY ${saleData.items[0].part_name} (ID: ${saleData.items[0].part_id})`);
    const refund1Response = await fetch(`${API_BASE_URL}/bills/${billId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refund_amount: 750,
        refund_type: 'partial',
        refund_reason: 'FIX TEST - Refund item 1 only',
        refund_items: [
          {
            part_id: saleData.items[0].part_id,
            quantity: 1,
            unit_price: 750,
            total_price: 750
          }
        ]
      })
    });

    if (!refund1Response.ok) {
      const errorData = await refund1Response.json();
      console.log('❌ Refund 1 failed:', errorData);
      return;
    } else {
      console.log('✅ Refund 1 created successfully');
    }

    // Wait before creating second refund
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Create second partial refund for item 2 only
    console.log(`\n💰 Creating Refund 2: ONLY ${saleData.items[1].part_name} (ID: ${saleData.items[1].part_id})`);
    const refund2Response = await fetch(`${API_BASE_URL}/bills/${billId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refund_amount: 350,
        refund_type: 'partial',
        refund_reason: 'FIX TEST - Refund item 2 only',
        refund_items: [
          {
            part_id: saleData.items[1].part_id,
            quantity: 1,
            unit_price: 350,
            total_price: 350
          }
        ]
      })
    });

    if (!refund2Response.ok) {
      const errorData = await refund2Response.json();
      console.log('❌ Refund 2 failed:', errorData);
      return;
    } else {
      console.log('✅ Refund 2 created successfully');
    }

    // Wait for data to settle
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 6: Check the database using debug endpoint
    console.log('\n🔍 Checking database integrity...');
    const debugResponse = await fetch(`${API_BASE_URL}/debug-refunds/${billId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!debugResponse.ok) {
      throw new Error('Failed to get debug data');
    }

    const debugData = await debugResponse.json();
    console.log(`\n📊 DATABASE INTEGRITY CHECK FOR BILL ${billId}:`);
    console.log(`Total refunds: ${debugData.summary.total_refunds}`);
    console.log(`Total refund items: ${debugData.summary.total_refund_items}`);

    console.log('\n📋 REFUNDS:');
    debugData.refunds.forEach(refund => {
      console.log(`  Refund ${refund.id}: Rs ${refund.refund_amount} (${refund.refund_type}) - ${refund.refund_reason}`);
    });

    console.log('\n📦 REFUND ITEMS:');
    if (debugData.refund_items.length === 0) {
      console.log('  ❌ NO REFUND ITEMS FOUND!');
    } else {
      debugData.refund_items.forEach(item => {
        console.log(`  Refund ${item.refund_id}: ${item.part_name} (ID: ${item.part_id}) - Qty: ${item.quantity}, Price: Rs ${item.unit_price}`);
      });
    }

    // Step 7: Get the bill details to see how it appears in the UI
    console.log('\n🖥️  Getting bill details (UI view)...');
    const billResponse = await fetch(`${API_BASE_URL}/bills`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!billResponse.ok) {
      throw new Error('Failed to get bills');
    }

    const billsData = await billResponse.json();
    const testBill = billsData.bills.find(b => b.id === billId);

    if (testBill && testBill.refund_history) {
      console.log(`\n📱 UI REFUND HISTORY FOR BILL ${billId}:`);
      testBill.refund_history.forEach((refund, index) => {
        console.log(`\n  Refund ${index + 1} (ID: ${refund.id}): Rs ${refund.refund_amount} (${refund.refund_type})`);
        console.log(`    Reason: ${refund.refund_reason}`);
        console.log(`    Items (${refund.refund_items.length}):`);
        if (refund.refund_items.length === 0) {
          console.log(`      ❌ NO ITEMS SHOWN`);
        } else {
          refund.refund_items.forEach(item => {
            console.log(`      - ${item.part_name} (ID: ${item.part_id}): Qty ${item.quantity} @ Rs ${item.unit_price}`);
          });
        }
      });
    }

    // Step 8: Validation
    console.log('\n🏁 VALIDATION RESULTS:');
    console.log('======================');

    const expectedRefunds = 2;
    const expectedRefundItems = 2; // One item per refund

    if (debugData.refunds.length !== expectedRefunds) {
      console.log(`❌ WRONG NUMBER OF REFUNDS: Expected ${expectedRefunds}, got ${debugData.refunds.length}`);
    } else {
      console.log(`✅ CORRECT NUMBER OF REFUNDS: ${debugData.refunds.length}`);
    }

    if (debugData.refund_items.length !== expectedRefundItems) {
      console.log(`❌ WRONG NUMBER OF REFUND ITEMS: Expected ${expectedRefundItems}, got ${debugData.refund_items.length}`);
    } else {
      console.log(`✅ CORRECT NUMBER OF REFUND ITEMS: ${debugData.refund_items.length}`);
    }

    // Check if each refund has the correct items
    const refund1 = debugData.refunds.find(r => r.refund_reason.includes('item 1'));
    const refund2 = debugData.refunds.find(r => r.refund_reason.includes('item 2'));

    if (refund1 && refund2) {
      const refund1Items = debugData.refund_items.filter(item => item.refund_id === refund1.id);
      const refund2Items = debugData.refund_items.filter(item => item.refund_id === refund2.id);

      console.log(`\n🔍 REFUND ITEMS DISTRIBUTION:`);
      console.log(`  Refund 1 (${refund1.id}): ${refund1Items.length} items`);
      refund1Items.forEach(item => {
        console.log(`    - ${item.part_name} (ID: ${item.part_id})`);
      });

      console.log(`  Refund 2 (${refund2.id}): ${refund2Items.length} items`);
      refund2Items.forEach(item => {
        console.log(`    - ${item.part_name} (ID: ${item.part_id})`);
      });

      // Final validation
      const isRefund1Correct = refund1Items.length === 1 && refund1Items[0].part_id === saleData.items[0].part_id;
      const isRefund2Correct = refund2Items.length === 1 && refund2Items[0].part_id === saleData.items[1].part_id;

      console.log(`\n🎯 FINAL VERDICT:`);
      if (isRefund1Correct && isRefund2Correct) {
        console.log(`✅ SUCCESS! Refund items are correctly associated with their refunds!`);
        console.log(`   - First refund shows only its item (${saleData.items[0].part_name})`);
        console.log(`   - Second refund shows only its item (${saleData.items[1].part_name})`);
        console.log(`   🎉 THE FIX WORKS! 🎉`);
      } else {
        console.log(`❌ FAILED! Refund items are still incorrectly associated:`);
        if (!isRefund1Correct) {
          console.log(`   - First refund should show ${saleData.items[0].part_name}, but shows ${refund1Items.length} items`);
        }
        if (!isRefund2Correct) {
          console.log(`   - Second refund should show ${saleData.items[1].part_name}, but shows ${refund2Items.length} items`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRefundFixValidation();
