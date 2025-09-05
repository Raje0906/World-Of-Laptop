const API_URL = 'http://localhost:3002/api/sales';

async function testRecentSales() {
  try {
    console.log('Testing for recent sales in the last 24 hours...');
    
    const response = await fetch(`${API_URL}`);
    const data = await response.json();
    
    if (data.success && data.data && data.data.sales) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      console.log(`Current time: ${now.toISOString()}`);
      console.log(`Looking for sales after: ${yesterday.toISOString()}`);
      
      const recentSales = data.data.sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= yesterday;
      });
      
      console.log(`\nFound ${recentSales.length} sales in the last 24 hours:`);
      
      if (recentSales.length > 0) {
        recentSales.forEach((sale, index) => {
          const saleDate = new Date(sale.createdAt);
          console.log(`${index + 1}. Sale #${sale.saleNumber} - ${sale.customer?.name} - ₹${sale.totalAmount} - ${saleDate.toLocaleString()}`);
        });
      } else {
        console.log('No sales found in the last 24 hours');
        
        // Show the most recent sale
        if (data.data.sales.length > 0) {
          const mostRecent = data.data.sales[0];
          const saleDate = new Date(mostRecent.createdAt);
          console.log(`\nMost recent sale: Sale #${mostRecent.saleNumber} on ${saleDate.toLocaleString()}`);
        }
      }
      
      // Check for any sales with today's date
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      console.log(`\nLooking for sales today (${todayStart.toLocaleDateString()}):`);
      console.log(`Today start: ${todayStart.toISOString()}`);
      console.log(`Today end: ${todayEnd.toISOString()}`);
      
      const todaySales = data.data.sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= todayStart && saleDate <= todayEnd;
      });
      
      console.log(`Found ${todaySales.length} sales today`);
      
    } else {
      console.log('No sales data available');
    }
    
  } catch (error) {
    console.error('Error testing recent sales:', error);
  }
}

testRecentSales();

