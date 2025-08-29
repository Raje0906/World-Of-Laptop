const API_URL = 'http://localhost:3002/api/sales';

async function testAllSales() {
  try {
    console.log('Testing all sales in database...');
    
    const response = await fetch(`${API_URL}`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    
    console.log('Full response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data && data.data.sales) {
      console.log(`Found ${data.data.sales.length || 0} total sales in database`);
      
      if (data.data.sales && data.data.sales.length > 0) {
        console.log('\nSample sales:');
        data.data.sales.slice(0, 5).forEach((sale, index) => {
          console.log(`${index + 1}. Sale #${sale.saleNumber} - ${sale.customer?.name || 'Unknown'} - ₹${sale.totalAmount} - ${new Date(sale.createdAt).toLocaleDateString()}`);
        });
        
        // Check date ranges
        const dates = data.data.sales.map(sale => new Date(sale.createdAt));
        const earliest = new Date(Math.min(...dates));
        const latest = new Date(Math.max(...dates));
        
        console.log(`\nDate range of sales:`);
        console.log(`Earliest: ${earliest.toLocaleDateString()}`);
        console.log(`Latest: ${latest.toLocaleDateString()}`);
        
        // Check for sales in the last 7 days
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentSales = data.data.sales.filter(sale => new Date(sale.createdAt) >= lastWeek);
        
        console.log(`\nSales in last 7 days: ${recentSales.length}`);
        if (recentSales.length > 0) {
          recentSales.forEach(sale => {
            console.log(`- Sale #${sale.saleNumber} on ${new Date(sale.createdAt).toLocaleDateString()}`);
          });
        }
      }
    } else {
      console.log('No sales found or error in response');
    }
    
  } catch (error) {
    console.error('Error testing all sales:', error);
  }
}

testAllSales();
