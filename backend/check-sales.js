import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkSales() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get the sales collection
    const sales = await mongoose.connection.db.collection('sales').find({}).toArray();
    
    console.log(`Found ${sales.length} sales in the database`);
    
    if (sales.length > 0) {
      console.log('Latest sale:', {
        _id: sales[0]._id,
        saleNumber: sales[0].saleNumber,
        customer: sales[0].customer,
        totalAmount: sales[0].totalAmount,
        createdAt: sales[0].createdAt,
        items: sales[0].items
      });
    }

    // Check if the sales collection is properly indexed
    const indexes = await mongoose.connection.db.collection('sales').indexes();
    console.log('Indexes on sales collection:', indexes);

  } catch (error) {
    console.error('Error checking sales:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkSales();
