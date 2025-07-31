const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';

async function debugRefundItemsDatabase() {
  console.log('🔍 Debugging Refund Items Database on Staging...\n');
  
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
    
    // Check if there's a debug endpoint or create a test refund to see what happens
    console.log('\n🔧 Creating a test refund to debug the issue...');
    
    // Get available parts first
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
    
    if (parts.length < 2) {
      console.log('⚠️  Not enough parts available for testing');
      return;
    }
    
    // Create a test sale
    const saleResponse = await fetch(`${API_BASE_URL}/sales/sell`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'Debug Test Customer',
        customer_phone: '9999999999',
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
    
    // Create first partial refund
    console.log('\n💰 Creating first partial refund...');
    const refund1Data = {
      refund_amount: 1000,
      refund_type: 'partial',
      refund_reason: 'Debug Test - First Partial Refund',
      refund_items: [
        {
          part_id: parts[0].id,
          quantity: 1,
          unit_price: 1000,
          total_price: 1000
        }
      ]
    };
    
    console.log('Refund 1 payload:', JSON.stringify(refund1Data, null, 2));
    
    const refund1Response = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(refund1Data)
    });
    
    if (!refund1Response.ok) {
      const errorData = await refund1Response.json();
      console.log('❌ First refund failed:', errorData);
    } else {
      console.log('✅ Created first partial refund');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create second partial refund
    console.log('\n💰 Creating second partial refund...');
    const refund2Data = {
      refund_amount: 500,
      refund_type: 'partial',
      refund_reason: 'Debug Test - Second Partial Refund',
      refund_items: [
        {
          part_id: parts[1].id,
          quantity: 1,
          unit_price: 500,
          total_price: 500
        }
      ]
    };
    
    console.log('Refund 2 payload:', JSON.stringify(refund2Data, null, 2));
    
    const refund2Response = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(refund2Data)
    });
    
    if (!refund2Response.ok) {
      const errorData = await refund2Response.json();
      console.log('❌ Second refund failed:', errorData);
    } else {
      console.log('✅ Created second partial refund');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now check the bill details
    console.log('\n📋 Checking bill details after refunds...');
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
      console.log(`\n🧾 Test Bill ${testBill.id}:`);
      console.log(`   Original Amount: Rs ${testBill.total_amount}`);
      console.log(`   Total Refunded: Rs ${testBill.total_refunded}`);
      console.log(`   Refund History (${testBill.refund_history ? testBill.refund_history.length : 0} entries):`);
      
      if (testBill.refund_history) {
        testBill.refund_history.forEach((refund, refundIndex) => {
          console.log(`   
   📝 Refund ${refundIndex + 1}:`);
          console.log(`      ID: ${refund.id}`);
          console.log(`      Amount: Rs ${refund.refund_amount}`);
          console.log(`      Type: ${refund.refund_type}`);
          console.log(`      Reason: ${refund.refund_reason}`);
          console.log(`      Items (${refund.refund_items ? refund.refund_items.length : 0}):`);
          
          if (refund.refund_items && refund.refund_items.length > 0) {
            refund.refund_items.forEach((item, itemIndex) => {
              console.log(`         ${itemIndex + 1}. ${item.part_name} (${item.manufacturer})`);
              console.log(`            Part ID: ${item.part_id}, Qty: ${item.quantity}, Price: Rs ${item.total_price}`);
            });
          } else {
            console.log(`         ❌ No refund items found!`);
          }
        });
      }
    } else {
      console.log('❌ Test bill not found in response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugRefundItemsDatabase();
