const API_URL = 'http://localhost:3002/api/stores';

async function testStores() {
  try {
    console.log('Testing stores in database...');
    
    const response = await fetch(`${API_URL}`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Full response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.length || 0} stores in database`);
      
      if (data.data && data.data.length > 0) {
        console.log('\nAvailable stores:');
        data.data.forEach((store, index) => {
          console.log(`${index + 1}. Store ID: ${store._id} - Name: ${store.name} - Code: ${store.code}`);
        });
      }
    } else {
      console.log('No stores found or error in response');
    }
    
  } catch (error) {
    console.error('Error testing stores:', error);
  }
}

testStores();
