const API_URL = 'http://localhost:3002/api/products';

async function testProducts() {
  try {
    console.log('Testing products in database...');
    
    const response = await fetch(`${API_URL}`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.length || 0} products in database`);
      
      if (data.data && data.data.length > 0) {
        console.log('\nAvailable products:');
        data.data.slice(0, 10).forEach((product, index) => {
          console.log(`${index + 1}. Product ID: ${product._id} - Name: ${product.name} - Brand: ${product.brand} - Model: ${product.model} - Price: ₹${product.price}`);
        });
        
        if (data.data.length > 10) {
          console.log(`... and ${data.data.length - 10} more products`);
        }
      } else {
        console.log('No products found in database');
      }
    } else {
      console.log('No products data available');
    }
    
  } catch (error) {
    console.error('Error testing products:', error);
  }
}

testProducts();

