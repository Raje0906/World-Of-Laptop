// Test script to check current API state
const API_URL = 'https://world-of-laptop.onrender.com/api/sales/daily';

async function testCurrentAPI() {
  console.log('Testing current API state...\n');
  
  const testCases = [
    { date: '2025-08-12', description: 'The problematic date' },
    { date: '2024-12-25', description: 'Current year date' },
    { date: '2025-01-01', description: 'Near future date' },
    { date: '2026-06-15', description: 'Far future date' }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.description} (${testCase.date})`);
    
    try {
      const response = await fetch(`${API_URL}?date=${testCase.date}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success:', {
          success: data.success,
          hasData: !!data.data,
          totalSales: data.data?.totalSales || 0
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Error:', {
          message: errorData.message || 'Unknown error',
          errors: errorData.errors || []
        });
      }
    } catch (error) {
      console.error('❌ Network Error:', error.message);
    }
    
    console.log('---');
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Also test the health endpoint to see if backend is running
async function testHealthEndpoint() {
  console.log('Testing health endpoint...');
  
  try {
    const response = await fetch('https://world-of-laptop.onrender.com/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Health Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is running:', data);
    } else {
      console.log('❌ Backend health check failed');
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
  }
  
  console.log('---');
}

async function runTests() {
  await testHealthEndpoint();
  await testCurrentAPI();
}

runTests();

