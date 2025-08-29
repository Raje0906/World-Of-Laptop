const API_URL = 'http://localhost:3002/api/sales/daily';

async function testDailySales() {
  try {
    // Test July 30, 2025 (where we have a sale)
    console.log(`Testing daily sales for July 30, 2025`);
    
    const response = await fetch(`${API_URL}?date=2025-07-30`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.totalSales} sales for July 30, 2025`);
      console.log(`Total amount: ${data.data.totalAmount}`);
      console.log(`Average order value: ${data.data.averageOrderValue}`);
      
      if (data.data.sales && data.data.sales.length > 0) {
        console.log('Sample sale:', {
          id: data.data.sales[0]._id,
          saleNumber: data.data.sales[0].saleNumber,
          customer: data.data.sales[0].customer?.name,
          total: data.data.sales[0].total,
          createdAt: data.data.sales[0].createdAt
        });
      }
    }
    
    // Test July 27, 2025 (where we have 2 sales)
    console.log(`\nTesting daily sales for July 27, 2025`);
    
    const response2 = await fetch(`${API_URL}?date=2025-07-27`);
    const data2 = await response2.json();
    
    console.log('Response status:', response2.status);
    console.log('Response data:', JSON.stringify(data2, null, 2));
    
    if (data2.success && data2.data) {
      console.log(`Found ${data2.data.totalSales} sales for July 27, 2025`);
      console.log(`Total amount: ${data2.data.totalAmount}`);
      console.log(`Average order value: ${data2.data.averageOrderValue}`);
    }
    
    // Test July 20, 2025 (where we have 1 sale)
    console.log(`\nTesting daily sales for July 20, 2025`);
    
    const response3 = await fetch(`${API_URL}?date=2025-07-20`);
    const data3 = await response3.json();
    
    console.log('Response status:', response3.status);
    console.log('Response data:', JSON.stringify(data3, null, 2));
    
    if (data3.success && data3.data) {
      console.log(`Found ${data3.data.totalSales} sales for July 20, 2025`);
      console.log(`Total amount: ${data3.data.totalAmount}`);
      console.log(`Average order value: ${data3.data.averageOrderValue}`);
    }
    
  } catch (error) {
    console.error('Error testing daily sales:', error);
  }
}

testDailySales();
