const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';

async function testNewRefundToDebug() {
  console.log('🔍 Creating fresh refund test to debug the database...\n');
  
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
    
    // Get available parts
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
    console.log(`✅ Retrieved ${parts.length} available parts`);
    
    if (parts.length < 3) {
      console.log('⚠️  Not enough parts available for testing');
      return;
    }
    
    // Create a test sale with 3 items
    const saleResponse = await fetch(`${API_BASE_URL}/sales/sell`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'Fresh Debug Test Customer',
        customer_phone: '8888888888',
        items: [
          {
            part_id: parts[0].id,
            quantity: 2,
            unit_price: 1000
          },
          {
            part_id: parts[1].id,
            quantity: 1,
            unit_price: 500
          },
          {
            part_id: parts[2].id,
            quantity: 1,
            unit_price: 300
          }
        ]
      })
    });
    
    if (!saleResponse.ok) {
      const errorData = await saleResponse.json();
      throw new Error(`Failed to create sale: ${errorData.error}`);
    }
    
    const saleData = await saleResponse.json();
    console.log(`✅ Created test sale with ID: ${saleData.id}`);
    console.log(`   Customer: ${saleData.customer_name}`);
    console.log(`   Total: Rs ${saleData.total_amount}`);
    console.log(`   Items: ${saleData.items.length}`);
    
    saleData.items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.part_name} (ID: ${item.part_id}) - Qty: ${item.quantity}, Price: Rs ${item.total_price}`);
    });
    
    // Create first refund with ONLY the first item
    console.log('\n💰 Creating refund 1 (ONLY first item)...');
    const refund1Response = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refund_amount: 1000,
        refund_type: 'partial',
        refund_reason: 'First refund - only first item',
        refund_items: [
          {
            part_id: parts[0].id,
            quantity: 1,
            unit_price: 1000,
            total_price: 1000
          }
        ]
      })
    });
    
    if (!refund1Response.ok) {
      const errorData = await refund1Response.json();
      console.log('❌ First refund failed:', errorData);
      return;
    } else {
      console.log('✅ Created first refund successfully');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create second refund with ONLY the second item
    console.log('\n💰 Creating refund 2 (ONLY second item)...');
    const refund2Response = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refund_amount: 500,
        refund_type: 'partial',
        refund_reason: 'Second refund - only second item',
        refund_items: [
          {
            part_id: parts[1].id,
            quantity: 1,
            unit_price: 500,
            total_price: 500
          }
        ]
      })
    });
    
    if (!refund2Response.ok) {
      const errorData = await refund2Response.json();
      console.log('❌ Second refund failed:', errorData);
      return;
    } else {
      console.log('✅ Created second refund successfully');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now check the results
    console.log('\n📋 Checking results...');
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
    
    if (testBill) {
      console.log(`\n🧾 Fresh Test Bill ${testBill.id}:`);
      console.log(`   Customer: ${testBill.customer_name}`);
      console.log(`   Original Amount: Rs ${testBill.total_amount}`);
      console.log(`   Total Refunded: Rs ${testBill.total_refunded}`);
      console.log(`   Refund History (${testBill.refund_history ? testBill.refund_history.length : 0} entries):`);
      
      if (testBill.refund_history) {
        testBill.refund_history.forEach((refund, refundIndex) => {
          console.log(`\n   📝 Refund ${refundIndex + 1}:`);
          console.log(`      ID: ${refund.id}`);
          console.log(`      Amount: Rs ${refund.refund_amount}`);
          console.log(`      Type: ${refund.refund_type}`);
          console.log(`      Reason: ${refund.refund_reason}`);
          console.log(`      Expected: ${refundIndex === 0 ? 'First item only' : 'Second item only'}`);
          console.log(`      Actual Items (${refund.refund_items ? refund.refund_items.length : 0}):`);
          
          if (refund.refund_items && refund.refund_items.length > 0) {
            refund.refund_items.forEach((item, itemIndex) => {
              console.log(`         ${itemIndex + 1}. ${item.part_name} (ID: ${item.part_id})`);
              console.log(`            Qty: ${item.quantity}, Price: Rs ${item.total_price}`);
            });
          } else {
            console.log(`         ❌ No refund items found!`);
          }
        });
        
        // Analysis
        console.log('\n🔍 Analysis:');
        if (testBill.refund_history.length === 2) {
          const refund1 = testBill.refund_history[0];
          const refund2 = testBill.refund_history[1];
          
          console.log(`   First refund should have 1 item (part ${parts[0].id}): ${refund1.refund_items ? refund1.refund_items.length : 0} items found`);
          console.log(`   Second refund should have 1 item (part ${parts[1].id}): ${refund2.refund_items ? refund2.refund_items.length : 0} items found`);
          
          if (refund1.refund_items && refund1.refund_items.length > 1) {
            console.log(`   ❌ ISSUE: First refund has multiple items when it should only have one!`);
          }
          
          if (!refund2.refund_items || refund2.refund_items.length === 0) {
            console.log(`   ❌ ISSUE: Second refund has no items when it should have one!`);
          }
        }
      }
    } else {
      console.log('❌ Test bill not found in response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNewRefundToDebug();
