// Test script to verify reports endpoints work without authentication
const API_BASE = 'https://world-of-laptop.onrender.com/api';

async function testEndpoint(endpoint, description) {
  console.log(`Testing ${description}...`);
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', {
        success: data.success,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : []
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('---');
}

async function runTests() {
  console.log('Testing Reports Endpoints (No Authentication Required)\n');
  
  const tests = [
    { endpoint: '/reports/summary', description: 'Reports Summary' },
    { endpoint: '/reports/monthly?year=2025&month=8', description: 'Monthly Reports' },
    { endpoint: '/reports/sales/monthly?year=2025&month=8', description: 'Monthly Sales Reports' },
    { endpoint: '/reports/quarterly?year=2025&quarter=3', description: 'Quarterly Reports' },
    { endpoint: '/reports/annual?year=2025', description: 'Annual Reports' }
  ];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`Test ${i + 1}:`);
    await testEndpoint(test.endpoint, test.description);
    
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
  }
}

runTests();
