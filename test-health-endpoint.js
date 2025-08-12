// Test script to verify health endpoint is not rate limited
const API_URL = 'https://world-of-laptop.onrender.com/api/health';

async function testHealthEndpoint() {
  console.log('Testing health endpoint...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check successful:', data);
    } else {
      console.log('❌ Health check failed:', response.statusText);
    }
  } catch (error) {
    console.error('❌ Error testing health endpoint:', error.message);
  }
}

// Test multiple times to ensure no rate limiting
async function runTests() {
  console.log('Running health endpoint tests...\n');
  
  for (let i = 1; i <= 5; i++) {
    console.log(`Test ${i}:`);
    await testHealthEndpoint();
    console.log('---');
    
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
  }
}

runTests(); 