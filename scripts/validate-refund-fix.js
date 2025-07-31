const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';

async function cleanAndTestRefunds() {
  console.log('🧹 Testing refunds with fresh data to verify fix...\n');
  
  try {
    // Login first
    const loginResponse = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');
    
    // Get available parts for testing
    const partsResponse = await fetch(`${API_BASE_URL}/parts/available`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!partsResponse.ok) {
      throw new Error('Failed to fetch parts');
    }
    
    const parts = await partsResponse.json();
    console.log(`📦 Retrieved ${parts.length} available parts for testing`);
    
    if (parts.length < 3) {
      console.log('⚠️  Not enough parts available for comprehensive testing');
      return;
    }
    
    // Create Test Scenario: Simple 2-item bill with 2 separate partial refunds
    console.log('\n🎬 Test Scenario: Clean 2-item bill with separate partial refunds');
    console.log('Creating sale with 2 items...');
    
    const sale1Response = await fetch(`${API_BASE_URL}/sales/sell`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'CLEAN TEST - Two Items',
        customer_phone: '9999999999',
        items: [
          {
            part_id: parts[0].id,
            quantity: 1,
            unit_price: 1000
          },
          {
            part_id: parts[1].id,
            quantity: 1,
            unit_price: 500
          }
        ]
      })
    });
    
    if (!sale1Response.ok) {
      const errorData = await sale1Response.json();
      throw new Error(`Failed to create sale: ${errorData.error}`);
    }
    
    const saleData = await sale1Response.json();
    console.log(`✅ Created clean test sale with ID: ${saleData.id}`);
    console.log(`   Total: Rs ${saleData.total_amount}`);
    console.log(`   Item 1: ${saleData.items[0].part_name} (ID: ${saleData.items[0].part_id}) - Rs ${saleData.items[0].total_price}`);
    console.log(`   Item 2: ${saleData.items[1].part_name} (ID: ${saleData.items[1].part_id}) - Rs ${saleData.items[1].total_price}`);
    
    // Refund 1: ONLY first item (part 0)
    console.log(`\n💰 Creating Refund 1: ONLY ${saleData.items[0].part_name} (ID: ${saleData.items[0].part_id})`);
    const refund1Response = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refund_amount: 1000,
        refund_type: 'partial',
        refund_reason: 'CLEAN TEST - Refund first item only',
        refund_items: [
          {
            part_id: saleData.items[0].part_id,
            quantity: 1,
            unit_price: 1000,
            total_price: 1000
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
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Refund 2: ONLY second item (part 1)
    console.log(`\n💰 Creating Refund 2: ONLY ${saleData.items[1].part_name} (ID: ${saleData.items[1].part_id})`);
    const refund2Response = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refund_amount: 500,
        refund_type: 'partial',
        refund_reason: 'CLEAN TEST - Refund second item only',
        refund_items: [
          {
            part_id: saleData.items[1].part_id,
            quantity: 1,
            unit_price: 500,
            total_price: 500
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
    
    // Wait 3 seconds for data to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check results
    console.log('\n📊 Checking Results After SQL Fix...');
    const billsResponse = await fetch(`${API_BASE_URL}/bills`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!billsResponse.ok) {
      throw new Error('Failed to fetch bills');
    }
    
    const billsData = await billsResponse.json();
    const testBill = billsData.bills.find(bill => bill.id === saleData.id);
    
    if (testBill && testBill.refund_history) {
      console.log(`\n🧾 Clean Test Bill ${testBill.id}:`);
      console.log(`   Customer: ${testBill.customer_name}`);
      console.log(`   Original Amount: Rs ${testBill.total_amount}`);
      console.log(`   Total Refunded: Rs ${testBill.total_refunded}`);
      console.log(`   Expected Refunds: 2 (Rs 1000 + Rs 500)`);
      console.log(`   Actual Refunds: ${testBill.refund_history.length}`);
      
      if (testBill.refund_history.length === 2) {
        // Sort by date to ensure consistent order
        const sortedRefunds = testBill.refund_history.sort((a, b) => new Date(a.refund_date) - new Date(b.refund_date));
        
        console.log(`\n📋 Detailed Analysis:`);
        
        // First refund (should have first item)
        const firstRefund = sortedRefunds[0];
        console.log(`\n   🔍 FIRST REFUND (ID: ${firstRefund.id}):`);
        console.log(`      Amount: Rs ${firstRefund.refund_amount}`);
        console.log(`      Expected Item: ${saleData.items[0].part_name} (ID: ${saleData.items[0].part_id})`);
        console.log(`      Actual Items: ${firstRefund.refund_items ? firstRefund.refund_items.length : 0}`);
        
        if (firstRefund.refund_items && firstRefund.refund_items.length > 0) {
          firstRefund.refund_items.forEach((item, idx) => {
            const isCorrect = item.part_id === saleData.items[0].part_id;
            console.log(`         ${idx + 1}. ${item.part_name} (ID: ${item.part_id}) ${isCorrect ? '✅' : '❌'}`);
          });
        }
        
        // Second refund (should have second item)
        const secondRefund = sortedRefunds[1];
        console.log(`\n   🔍 SECOND REFUND (ID: ${secondRefund.id}):`);
        console.log(`      Amount: Rs ${secondRefund.refund_amount}`);
        console.log(`      Expected Item: ${saleData.items[1].part_name} (ID: ${saleData.items[1].part_id})`);
        console.log(`      Actual Items: ${secondRefund.refund_items ? secondRefund.refund_items.length : 0}`);
        
        if (secondRefund.refund_items && secondRefund.refund_items.length > 0) {
          secondRefund.refund_items.forEach((item, idx) => {
            const isCorrect = item.part_id === saleData.items[1].part_id;
            console.log(`         ${idx + 1}. ${item.part_name} (ID: ${item.part_id}) ${isCorrect ? '✅' : '❌'}`);
          });
        }
        
        // Final verdict
        const firstRefundCorrect = firstRefund.refund_items && 
                                  firstRefund.refund_items.length === 1 && 
                                  firstRefund.refund_items[0].part_id === saleData.items[0].part_id;
                                  
        const secondRefundCorrect = secondRefund.refund_items && 
                                   secondRefund.refund_items.length === 1 && 
                                   secondRefund.refund_items[0].part_id === saleData.items[1].part_id;
        
        console.log(`\n🎯 FINAL VERDICT:`);
        console.log(`   First refund correct: ${firstRefundCorrect ? '✅ YES' : '❌ NO'}`);
        console.log(`   Second refund correct: ${secondRefundCorrect ? '✅ YES' : '❌ NO'}`);
        
        if (firstRefundCorrect && secondRefundCorrect) {
          console.log(`\n   🎉 SUCCESS! The refund items issue has been COMPLETELY FIXED!`);
          console.log(`   ✅ Each refund now shows exactly the correct items`);
          console.log(`   ✅ No more mixing up of refund items between different refunds`);
        } else {
          console.log(`\n   ❌ ISSUE STILL EXISTS: Refund items are not correctly associated`);
          
          if (!firstRefundCorrect) {
            if (!firstRefund.refund_items || firstRefund.refund_items.length === 0) {
              console.log(`      • First refund has NO items (should have 1)`);
            } else if (firstRefund.refund_items.length > 1) {
              console.log(`      • First refund has TOO MANY items (${firstRefund.refund_items.length} instead of 1)`);
            } else {
              console.log(`      • First refund has WRONG item`);
            }
          }
          
          if (!secondRefundCorrect) {
            if (!secondRefund.refund_items || secondRefund.refund_items.length === 0) {
              console.log(`      • Second refund has NO items (should have 1)`);
            } else if (secondRefund.refund_items.length > 1) {
              console.log(`      • Second refund has TOO MANY items (${secondRefund.refund_items.length} instead of 1)`);
            } else {
              console.log(`      • Second refund has WRONG item`);
            }
          }
        }
      } else {
        console.log(`\n❌ Wrong number of refunds: Expected 2, got ${testBill.refund_history.length}`);
      }
    } else {
      console.log('\n❌ Test bill not found or has no refund history');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanAndTestRefunds();
