const API_URL = 'http://localhost:3002/api/sales/daily';

async function testTodaySales() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing daily sales for today: ${today}`);
    
    const response = await fetch(`${API_URL}?date=${today}`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.totalSales} sales for today`);
      console.log(`Total amount: ${data.data.totalAmount}`);
      
      if (data.data.sales && data.data.sales.length > 0) {
        console.log('\nSales found:');
        data.data.sales.forEach((sale, index) => {
          console.log(`${index + 1}. Sale #${sale.saleNumber} - ${sale.customer?.name} - ₹${sale.total} - ${sale.createdAt}`);
        });
      } else {
        console.log('No sales found for today');
      }
    }
    
  } catch (error) {
    console.error('Error testing today sales:', error);
  }
}

testTodaySales();

