import mongoose from 'mongoose';

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking MongoDB connection...');
    
    const mongoURI = 'mongodb://127.0.0.1:27017/laptop-store';
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Count documents in customers collection if it exists
    if (collections.some(c => c.name === 'customers')) {
      const count = await mongoose.connection.db.collection('customers').countDocuments();
      console.log(`\n📊 Total customers: ${count}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkDatabase();
