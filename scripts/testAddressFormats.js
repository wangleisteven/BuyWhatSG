#!/usr/bin/env node

/**
 * Test different address formats with OneMap API
 */

// OneMap API credentials
const ONEMAP_EMAIL = 'wanglei.steven@gmail.com';
const ONEMAP_PASSWORD = '1qaz@WSX3edc$RFV';

/**
 * Get OneMap API access token
 */
const getOneMapToken = async () => {
  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ONEMAP_EMAIL,
      password: ONEMAP_PASSWORD,
    }),
  });

  const data = await response.json();
  return data.access_token;
};

/**
 * Test geocoding with different address formats
 */
const testAddressFormat = async (token, address, description) => {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`Address: ${address}`);
  
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodedAddress}&returnGeom=Y&getAddrDetails=Y`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (data.found > 0 && data.results.length > 0) {
      const result = data.results[0];
      console.log(`✓ SUCCESS - Found ${data.found} result(s)`);
      console.log(`  Latitude: ${result.LATITUDE}`);
      console.log(`  Longitude: ${result.LONGITUDE || result.LONGTITUDE}`);
      console.log(`  Address: ${result.ADDRESS}`);
      console.log(`  Building: ${result.BUILDING}`);
      return true;
    } else {
      console.log(`❌ FAILED - No results found`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ ERROR:`, error.message);
    return false;
  }
};

// Run tests with different address formats
const runAddressTests = async () => {
  try {
    console.log('🔐 Getting OneMap token...');
    const token = await getOneMapToken();
    console.log('✓ Token obtained successfully');
    
    // Test different address formats
    const testCases = [
      // Simple formats
      { address: '1 Raffles Place', description: 'Simple building address' },
      { address: 'Raffles Place', description: 'Location name only' },
      { address: '048616', description: 'Postal code only' },
      
      // Block addresses
      { address: '453 Ang Mo Kio Ave 10', description: 'HDB block address' },
      { address: 'Blk 453 Ang Mo Kio Ave 10', description: 'HDB block with "Blk" prefix' },
      { address: '453 Ang Mo Kio Avenue 10', description: 'HDB block with full "Avenue"' },
      { address: '560453', description: 'AMK postal code' },
      
      // Shopping mall addresses
      { address: 'AMK Hub', description: 'Mall name only' },
      { address: '53 Ang Mo Kio Ave 3', description: 'Mall street address' },
      { address: '569933', description: 'Mall postal code' },
      
      // MRT station
      { address: 'Ang Mo Kio MRT', description: 'MRT station name' },
      { address: 'Ang Mo Kio', description: 'Area name only' },
      
      // Central area
      { address: 'Marina Bay Sands', description: 'Famous landmark' },
      { address: '10 Bayfront Ave', description: 'MBS street address' },
      { address: 'ION Orchard', description: 'Orchard mall' },
      { address: '2 Orchard Turn', description: 'ION street address' },
      
      // Airport
      { address: 'Changi Airport Terminal 2', description: 'Airport terminal' },
      { address: '65 Airport Boulevard', description: 'Airport street address' },
    ];
    
    let successCount = 0;
    
    for (const testCase of testCases) {
      const success = await testAddressFormat(token, testCase.address, testCase.description);
      if (success) successCount++;
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 SUMMARY: ${successCount}/${testCases.length} address formats worked`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

runAddressTests();