const API_URL = 'http://localhost:3002/api/sales';

async function testFrontendSale() {
  try {
    console.log('Testing frontend sale creation...');
    
    // Simulate the exact sale data from your frontend console log
    const saleData = {
      customer: "687f9c8ffebe2d7e777f2a0d",
      storeId: "686be7376d105189a96cf791", // Using storeId as frontend sends
      items: [
        {
          productName: "Test Product from Frontend",
          serialNumber: "FRONTEND-123",
          quantity: 1,
          unitPrice: 45555,
          discount: 0
        }
      ],
      paymentMethod: "cash",
      subtotal: 45555,
      tax: 8199.9,
      total: 53754.9,
      date: new Date().toISOString()
    };
    
    console.log('Creating sale with frontend data:', JSON.stringify(saleData, null, 2));
    
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
      console.log('✅ Frontend sale created successfully!');
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
      console.log('❌ Frontend sale creation failed:', data.message);
      if (data.error) {
        console.log('Error details:', data.error);
      }
    }
    
  } catch (error) {
    console.error('Error creating frontend sale:', error);
  }
}

testFrontendSale();
