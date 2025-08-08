#!/usr/bin/env node

/**
 * Test script to debug OneMap API connection
 */

// OneMap API credentials
const ONEMAP_EMAIL = 'wanglei.steven@gmail.com';
const ONEMAP_PASSWORD = '1qaz@WSX3edc$RFV';

/**
 * Test OneMap API authentication
 */
const testOneMapAuth = async () => {
  console.log('🔐 Testing OneMap API authentication...');
  
  try {
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

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      throw new Error(`Failed to get OneMap token: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    console.log('✓ Authentication successful!');
    console.log('Token:', data.access_token?.substring(0, 20) + '...');
    
    return data.access_token;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
};

/**
 * Test geocoding with a simple address
 */
const testGeocode = async (token) => {
  console.log('\n🗺️ Testing geocoding with simple address...');
  
  const testAddress = '1 Raffles Place, Singapore';
  console.log('Test address:', testAddress);
  
  try {
    const encodedAddress = encodeURIComponent(testAddress);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodedAddress}&returnGeom=Y&getAddrDetails=Y`;
    
    console.log('Request URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    
    if (data.found > 0 && data.results.length > 0) {
      const result = data.results[0];
      console.log('✓ Geocoding successful!');
      console.log('Latitude:', result.LATITUDE);
      console.log('Longitude:', result.LONGITUDE || result.LONGTITUDE);
      console.log('Address found:', result.ADDRESS);
    } else {
      console.log('❌ No results found for address');
    }
    
  } catch (error) {
    console.error('❌ Geocoding failed:', error);
  }
};

/**
 * Test without authentication
 */
const testWithoutAuth = async () => {
  console.log('\n🔓 Testing geocoding without authentication...');
  
  const testAddress = '1 Raffles Place, Singapore';
  
  try {
    const encodedAddress = encodeURIComponent(testAddress);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodedAddress}&returnGeom=Y&getAddrDetails=Y`;
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
};

// Run tests
const runTests = async () => {
  try {
    // Test authentication
    const token = await testOneMapAuth();
    
    // Test geocoding with auth
    await testGeocode(token);
    
    // Test without auth
    await testWithoutAuth();
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

runTests();