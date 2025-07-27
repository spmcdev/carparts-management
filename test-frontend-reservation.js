// Test script to simulate frontend reservation creation
import fetch from 'node-fetch';

const BASE_URL = 'https://carparts-management-production.up.railway.app';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzUzNjUxMjEyfQ.kSeCIsXDXN_E_XK6P2iRZicZ5tUqXpzDFthya_Oky0E';

// Simulate what the frontend should send
const testReservationData = {
  customer_name: 'Frontend Test Customer',
  customer_phone: '0799999999',
  deposit_amount: 1500,
  notes: 'Testing frontend simulation',
  items: [
    {
      part_id: 14,
      quantity: 1,
      unit_price: 3000
    }
  ]
};

async function testFrontendCall() {
  console.log('Testing frontend-style reservation creation...');
  console.log('Request data:', JSON.stringify(testReservationData, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testReservationData)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response:', errorData);
      return;
    }
    
    const result = await response.json();
    console.log('Success! Reservation created:', result);
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testFrontendCall();
