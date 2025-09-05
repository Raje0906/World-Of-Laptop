const API_URL = 'http://localhost:3002/api/sales';

async function testCompleteFlow() {
  try {
    console.log('🧪 Testing Complete Flow: Create Sale → Save to MongoDB → Retrieve from Daily Sales');
    console.log('=' .repeat(80));
    
    // Step 1: Create a new sale
    console.log('\n📝 Step 1: Creating a new sale...');
    const saleData = {
      customer: "687f9c8ffebe2d7e777f2a0d",
      storeId: "686be7376d105189a96cf791",
      items: [
        {
          productName: "Real Product Test",
          serialNumber: "REAL-TEST-001",
          quantity: 1,
          unitPrice: 15000,
          discount: 0
        }
      ],
      paymentMethod: "cash",
      notes: "Complete flow test sale"
    };
    
    console.log('Sale data:', JSON.stringify(saleData, null, 2));
    
    const createResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData)
    });
    
    const createData = await createResponse.json();
    
    console.log('Create response status:', createResponse.status);
    console.log('Create response:', JSON.stringify(createData, null, 2));
    
    if (!createData.success) {
      console.error('❌ Sale creation failed:', createData.message);
      return;
    }
    
    console.log('✅ Sale created successfully!');
    console.log(`Sale Number: ${createData.data.saleNumber}`);
    console.log(`Sale ID: ${createData.data._id}`);
    console.log(`Created At: ${createData.data.createdAt}`);
    
    // Step 2: Wait a moment for database to sync
    console.log('\n⏳ Step 2: Waiting for database sync...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Verify sale exists in all sales
    console.log('\n🔍 Step 3: Verifying sale exists in all sales...');
    const allSalesResponse = await fetch(API_URL);
    const allSalesData = await allSalesResponse.json();
    
    if (allSalesData.success && allSalesData.data.sales) {
      const createdSale = allSalesData.data.sales.find(sale => sale.saleNumber === createData.data.saleNumber);
      if (createdSale) {
        console.log('✅ Sale found in all sales list!');
        console.log(`Found sale: #${createdSale.saleNumber} - ${createdSale.customer?.name} - ₹${createdSale.totalAmount}`);
      } else {
        console.log('❌ Sale not found in all sales list!');
      }
    }
    
    // Step 4: Check daily sales for today
    console.log('\n📊 Step 4: Checking daily sales for today...');
    const today = new Date().toISOString().split('T')[0];
    const dailyResponse = await fetch(`${API_URL}/daily?date=${today}`);
    const dailyData = await dailyResponse.json();
    
    console.log('Daily sales response status:', dailyResponse.status);
    console.log('Daily sales response:', JSON.stringify(dailyData, null, 2));
    
    if (dailyData.success && dailyData.data) {
      console.log(`✅ Daily sales found ${dailyData.data.totalSales} sales for today`);
      console.log(`Total amount: ₹${dailyData.data.totalAmount}`);
      
      const dailySale = dailyData.data.sales.find(sale => sale.saleNumber === createData.data.saleNumber);
      if (dailySale) {
        console.log('✅ Sale found in daily sales!');
        console.log(`Daily sale: #${dailySale.saleNumber} - ${dailySale.customer?.name} - ₹${dailySale.total}`);
      } else {
        console.log('❌ Sale not found in daily sales!');
        console.log('Available sales in daily view:');
        dailyData.data.sales.forEach(sale => {
          console.log(`  - #${sale.saleNumber} - ${sale.customer?.name} - ₹${sale.total}`);
        });
      }
    } else {
      console.log('❌ Daily sales request failed:', dailyData.message);
    }
    
    console.log('\n🎯 Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteFlow();

