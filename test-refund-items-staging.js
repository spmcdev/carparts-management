const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';

async function testRefundItems() {
  console.log('🔍 Testing Refund Items Display on Staging...\n');
  
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
    
    // Get bills to check refund history
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
    console.log(`✅ Retrieved ${billsData.bills.length} bills`);
    
    // Find bills with refunds
    const billsWithRefunds = billsData.bills.filter(bill => 
      bill.refund_history && bill.refund_history.length > 0
    );
    
    console.log(`📊 Found ${billsWithRefunds.length} bills with refunds`);
    
    if (billsWithRefunds.length === 0) {
      console.log('⚠️  No bills with refunds found. Creating test data...');
      
      // Create a test sale first
      const saleResponse = await fetch(`${API_BASE_URL}/sales/sell`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: 'Test Customer for Refund',
          customer_phone: '1234567890',
          items: [
            {
              part_id: 1,
              quantity: 2,
              unit_price: 1000
            },
            {
              part_id: 2,
              quantity: 1,
              unit_price: 500
            }
          ]
        })
      });
      
      if (saleResponse.ok) {
        const saleData = await saleResponse.json();
        console.log(`✅ Created test sale with ID: ${saleData.id}`);
        
        // Create a partial refund
        const refundResponse = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refund_type: 'partial',
            refund_reason: 'Test partial refund',
            refund_items: [
              {
                part_id: 1,
                quantity: 1,
                unit_price: 1000,
                total_price: 1000
              }
            ]
          })
        });
        
        if (refundResponse.ok) {
          console.log('✅ Created test partial refund');
          
          // Create another partial refund
          const refund2Response = await fetch(`${API_BASE_URL}/bills/${saleData.id}/refund`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              refund_type: 'partial',
              refund_reason: 'Test second partial refund',
              refund_items: [
                {
                  part_id: 2,
                  quantity: 1,
                  unit_price: 500,
                  total_price: 500
                }
              ]
            })
          });
          
          if (refund2Response.ok) {
            console.log('✅ Created second test partial refund');
          }
        }
        
        // Re-fetch bills to get updated data
        const updatedBillsResponse = await fetch(`${API_BASE_URL}/bills`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (updatedBillsResponse.ok) {
          const updatedBillsData = await updatedBillsResponse.json();
          const updatedBillsWithRefunds = updatedBillsData.bills.filter(bill => 
            bill.refund_history && bill.refund_history.length > 0
          );
          
          if (updatedBillsWithRefunds.length > 0) {
            console.log('\n📋 Analyzing Refund History Data Structure:');
            updatedBillsWithRefunds.forEach((bill, billIndex) => {
              console.log(`\n🧾 Bill ${bill.id} (${bill.customer_name}):`);
              console.log(`   Original Amount: Rs ${bill.total_amount}`);
              console.log(`   Total Refunded: Rs ${bill.total_refunded}`);
              console.log(`   Refund History (${bill.refund_history.length} entries):`);
              
              bill.refund_history.forEach((refund, refundIndex) => {
                console.log(`   
   📝 Refund ${refundIndex + 1}:`);
                console.log(`      ID: ${refund.id}`);
                console.log(`      Amount: Rs ${refund.refund_amount}`);
                console.log(`      Type: ${refund.refund_type}`);
                console.log(`      Date: ${refund.refund_date}`);
                console.log(`      Reason: ${refund.refund_reason}`);
                console.log(`      Items (${refund.refund_items ? refund.refund_items.length : 0}):`);
                
                if (refund.refund_items && refund.refund_items.length > 0) {
                  refund.refund_items.forEach((item, itemIndex) => {
                    console.log(`         ${itemIndex + 1}. ${item.part_name} (${item.manufacturer})`);
                    console.log(`            Qty: ${item.quantity}, Price: Rs ${item.total_price}`);
                  });
                } else {
                  console.log(`         ❌ No refund items found!`);
                }
              });
            });
          }
        }
      }
    } else {
      // Analyze existing refund data
      console.log('\n📋 Analyzing Existing Refund History Data Structure:');
      billsWithRefunds.forEach((bill, billIndex) => {
        console.log(`\n🧾 Bill ${bill.id} (${bill.customer_name}):`);
        console.log(`   Original Amount: Rs ${bill.total_amount}`);
        console.log(`   Total Refunded: Rs ${bill.total_refunded}`);
        console.log(`   Refund History (${bill.refund_history.length} entries):`);
        
        bill.refund_history.forEach((refund, refundIndex) => {
          console.log(`   
   📝 Refund ${refundIndex + 1}:`);
          console.log(`      ID: ${refund.id}`);
          console.log(`      Amount: Rs ${refund.refund_amount}`);
          console.log(`      Type: ${refund.refund_type}`);
          console.log(`      Date: ${refund.refund_date}`);
          console.log(`      Reason: ${refund.refund_reason}`);
          console.log(`      Items (${refund.refund_items ? refund.refund_items.length : 0}):`);
          
          if (refund.refund_items && refund.refund_items.length > 0) {
            refund.refund_items.forEach((item, itemIndex) => {
              console.log(`         ${itemIndex + 1}. ${item.part_name} (${item.manufacturer})`);
              console.log(`            Qty: ${item.quantity}, Price: Rs ${item.total_price}`);
            });
          } else {
            console.log(`         ❌ No refund items found!`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRefundItems();
