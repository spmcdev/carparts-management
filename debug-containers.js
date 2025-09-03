// Debug script to check container data on staging
const API_BASE = 'https://carparts-backend-staging.up.railway.app';

async function debugContainers() {
  try {
    console.log('🔍 Debugging container data on staging...');
    
    // First authenticate
    console.log('🔐 Authenticating...');
    const loginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Failed to login: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Authenticated successfully');
    
    // Now check what parts exist
    const partsRes = await fetch(`${API_BASE}/parts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!partsRes.ok) {
      throw new Error(`Failed to fetch parts: ${partsRes.status}`);
    }
    
    const parts = await partsRes.json();
    console.log(`📦 Total parts found: ${parts.length}`);
    
    // Check available stock parts
    const availableParts = parts.filter(part => parseInt(part.available_stock || 0) > 0);
    console.log(`✅ Parts with available stock: ${availableParts.length}`);
    
    // Check container_no values
    const partsWithContainers = parts.filter(part => part.container_no && part.container_no.trim() !== '');
    console.log(`📋 Parts with container_no: ${partsWithContainers.length}`);
    
    // Extract unique containers
    const allContainers = [...new Set(
      partsWithContainers.map(part => part.container_no)
    )].sort();
    console.log(`🗂️ Unique containers found: ${allContainers.length}`);
    console.log('Container list:', allContainers.slice(0, 10)); // Show first 10
    
    // Check local_purchase distribution
    const localParts = parts.filter(part => part.local_purchase === true || part.local_purchase === 'true');
    const containerParts = parts.filter(part => part.local_purchase === false || part.local_purchase === 'false');
    console.log(`🏠 Local purchase parts: ${localParts.length}`);
    console.log(`📦 Container purchase parts: ${containerParts.length}`);
    
    // Check local parts with containers
    const localWithContainers = localParts.filter(part => part.container_no && part.container_no.trim() !== '');
    const containerWithContainers = containerParts.filter(part => part.container_no && part.container_no.trim() !== '');
    console.log(`🏠📋 Local parts with containers: ${localWithContainers.length}`);
    console.log(`📦📋 Container parts with containers: ${containerWithContainers.length}`);
    
    if (localWithContainers.length > 0) {
      const localContainersList = [...new Set(localWithContainers.map(part => part.container_no))].sort();
      console.log('📝 Local containers:', localContainersList.slice(0, 5));
    }
    
    if (containerWithContainers.length > 0) {
      const containerContainersList = [...new Set(containerWithContainers.map(part => part.container_no))].sort();
      console.log('📦 Container containers:', containerContainersList.slice(0, 5));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugContainers();
