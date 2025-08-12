// Test script to verify daily sales API works with future dates
const API_URL = 'https://world-of-laptop.onrender.com/api/sales/daily';

async function testDailySales(date) {
  console.log(`Testing daily sales for date: ${date}`);
  
  try {
    const response = await fetch(`${API_URL}?date=${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Daily sales successful:', {
        success: data.success,
        totalSales: data.data?.totalSales,
        totalAmount: data.data?.totalAmount,
        date: data.data?.date
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Daily sales failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
    }
  } catch (error) {
    console.error('❌ Error testing daily sales:', error.message);
  }
}

// Test multiple dates including the problematic one
async function runTests() {
  console.log('Running daily sales tests...\n');
  
  const testDates = [
    '2025-08-12', // The problematic date
    '2024-12-25', // Current year
    '2025-01-01', // Future date
    '2026-06-15'  // Far future date
  ];
  
  for (let i = 0; i < testDates.length; i++) {
    console.log(`Test ${i + 1}:`);
    await testDailySales(testDates[i]);
    console.log('---');
    
    if (i < testDates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
  }
}

runTests();

