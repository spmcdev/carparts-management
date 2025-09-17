// Debug script to check container data on staging
const API_BASE = 'https://carparts-backend-staging.up.railway.app';

// Helper function to get filtered containers (same as frontend)
const getFilteredContainers = (parts, purchaseTypeFilter) => {
  let filteredParts = parts;
  
  // Filter by purchase type if specified
  if (purchaseTypeFilter !== '') {
    const isLocalPurchase = purchaseTypeFilter === 'true';
    filteredParts = parts.filter(part => {
      const partIsLocal = part.local_purchase === true || part.local_purchase === 'true';
      return partIsLocal === isLocalPurchase;
    });
  }
  
  // Extract unique container/batch numbers
  return [...new Set(
    filteredParts
      .filter(part => 
        part.container_no && 
        part.container_no.trim() !== ''
      )
      .map(part => part.container_no)
  )].sort();
};

async function debugContainers() {
  try {
    console.log('🔍 Debugging container data for all report types...');
    
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
    
    // Test all report type container filters
    console.log('\n=== TESTING ALL REPORT TYPE CONTAINERS ===');
    
    // 1. Available Stock containers (parts with available_stock > 0)
    const availableParts = parts.filter(part => parseInt(part.available_stock || 0) > 0);
    console.log(`\n1️⃣ AVAILABLE STOCK REPORT:`);
    console.log(`   Parts with available stock: ${availableParts.length}`);
    
    console.log(`   All types: ${getFilteredContainers(availableParts, '').join(', ')}`);
    console.log(`   Local only: ${getFilteredContainers(availableParts, 'true').join(', ')}`);
    console.log(`   Container only: ${getFilteredContainers(availableParts, 'false').join(', ')}`);
    
    // 2. Sold Stock containers (all parts)
    console.log(`\n2️⃣ SOLD STOCK REPORT:`);
    console.log(`   All parts: ${parts.length}`);
    console.log(`   All types: ${getFilteredContainers(parts, '').join(', ')}`);
    console.log(`   Local only: ${getFilteredContainers(parts, 'true').join(', ')}`);
    console.log(`   Container only: ${getFilteredContainers(parts, 'false').join(', ')}`);
    
    // 3. Parent Parts containers (include both parent parts and their children)
    const parentIds = new Set();
    parts.forEach(part => {
      if (part.parent_id) {
        parentIds.add(part.parent_id);
      }
    });
    const parentAndChildParts = parts.filter(part => 
      parentIds.has(part.id) || part.parent_id
    );
    console.log(`\n3️⃣ PARENT PARTS REPORT:`);
    console.log(`   Parent parts: ${parts.filter(part => parentIds.has(part.id)).length}`);
    console.log(`   Child parts: ${parts.filter(part => part.parent_id).length}`);
    console.log(`   Parent + Child parts: ${parentAndChildParts.length}`);
    console.log(`   All types: ${getFilteredContainers(parentAndChildParts, '').join(', ')}`);
    console.log(`   Local only: ${getFilteredContainers(parentAndChildParts, 'true').join(', ')}`);
    console.log(`   Container only: ${getFilteredContainers(parentAndChildParts, 'false').join(', ')}`);
    
    // 4. Comprehensive Stock containers (all parts, same as sold stock)
    console.log(`\n4️⃣ COMPREHENSIVE STOCK REPORT:`);
    console.log(`   All parts: ${parts.length}`);
    console.log(`   All types: ${getFilteredContainers(parts, '').join(', ')}`);
    console.log(`   Local only: ${getFilteredContainers(parts, 'true').join(', ')}`);
    console.log(`   Container only: ${getFilteredContainers(parts, 'false').join(', ')}`);
    
    // Debug parent-child relationships
    console.log(`\n🔗 PARENT-CHILD RELATIONSHIPS:`);
    const childParts = parts.filter(part => part.parent_id);
    const parentParts = parts.filter(part => parentIds.has(part.id));
    console.log(`   Child parts: ${childParts.length}`);
    console.log(`   Parent parts: ${parentParts.length}`);
    
    if (parentParts.length > 0) {
      console.log(`   Sample parent: ${parentParts[0].name} (ID: ${parentParts[0].id})`);
    }
    if (childParts.length > 0) {
      console.log(`   Sample child: ${childParts[0].name} (Parent ID: ${childParts[0].parent_id})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugContainers();
