const API_URL = 'http://localhost:3002/api/sales';

async function testCreateSale() {
  try {
    console.log('Testing sale creation...');
    
    // Sample sale data
    const saleData = {
      customer: "687f9c8ffebe2d7e777f2a0d", // Using existing customer ID
      store: "686be7376d105189a96cf790", // Using existing store ID
      items: [
        {
          productName: "Test Product",
          serialNumber: "TEST-123",
          quantity: 1,
          unitPrice: 100,
          discount: 0
        }
      ],
      paymentMethod: "cash",
      notes: "Test sale created via API"
    };
    
    console.log('Creating sale with data:', JSON.stringify(saleData, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData)
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Sale created successfully!');
      console.log(`Sale Number: ${data.data.saleNumber}`);
      console.log(`Sale ID: ${data.data._id}`);
      console.log(`Created at: ${data.data.createdAt}`);
      
      // Now test if it appears in daily sales
      const today = new Date().toISOString().split('T')[0];
      console.log(`\nTesting daily sales for ${today}...`);
      
      const dailyResponse = await fetch(`${API_URL}/daily?date=${today}`);
      const dailyData = await dailyResponse.json();
      
      console.log('Daily sales response:', JSON.stringify(dailyData, null, 2));
      
    } else {
      console.log('❌ Sale creation failed:', data.message);
    }
    
  } catch (error) {
    console.error('Error creating sale:', error);
  }
}

testCreateSale();
