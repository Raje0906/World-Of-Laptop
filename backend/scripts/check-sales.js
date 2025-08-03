const mongoose = require('mongoose');
require('dotenv').config();

async function checkSales() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get the sales collection
    const sales = await mongoose.connection.db.collection('sales').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log(`Found ${sales.length} sales in the database\n`);
    
    if (sales.length > 0) {
      console.log('Latest sales:');
      sales.forEach((sale, index) => {
        console.log(`\nSale #${index + 1}:`);
        console.log(`- ID: ${sale._id}`);
        console.log(`- Sale Number: ${sale.saleNumber}`);
        console.log(`- Customer: ${sale.customer?.name || 'N/A'}`);
        console.log(`- Total Amount: ${sale.totalAmount}`);
        console.log(`- Created At: ${sale.createdAt}`);
        console.log(`- Items (${sale.items?.length || 0}):`);
        
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.productName || 'N/A'} (${item.quantity} x ${item.unitPrice})`);
            console.log(`     Serial: ${item.serialNumber || 'N/A'}`);
            console.log(`     Manual Entry: ${item.isManualEntry ? 'Yes' : 'No'}`);
          });
        }
      });
    }

  } catch (error) {
    console.error('Error checking sales:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSales();
