import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 3000,
  socketTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority'
};

// MongoDB connection URI
const mongoURI = 'mongodb://127.0.0.1:27017/laptop-store?retryWrites=true&w=majority';
console.log('🔗 Using MongoDB URI:', mongoURI);

// Log MongoDB connection events
mongoose.connection.on('connecting', () => {
  console.log('🔄 Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected');
  console.log(`📊 Database Name: ${mongoose.connection.name}`);
  console.log(`🏷️  Connection State: ${mongoose.connection.readyState}`);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB Disconnected');
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log(`🔗 Attempting to connect to MongoDB at: ${mongoURI}`);
    console.log('MongoDB Connection Options:', JSON.stringify(mongoOptions, null, 2));
    
    // Set up connection event handlers
    mongoose.connection.on('connecting', () => {
      console.log('🔄 Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB Connected');
      console.log(`📊 Database Name: ${mongoose.connection.name}`);
      console.log(`🏷️  Connection State: ${mongoose.connection.readyState}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err);
    });

    // Connect to MongoDB
    await mongoose.connect(mongoURI, mongoOptions);
    
    // List all collections
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📋 Available collections: ${collections.map(c => c.name).join(', ')}`);
    } catch (collectionError) {
      console.error('❌ Error listing collections:', collectionError);
    }
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName,
    });
    
    // Provide helpful error messages for common issues
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n🔍 Troubleshooting Tips:');
      console.error('1. Make sure MongoDB is running locally or the connection string is correct');
      console.error('2. Check if the MongoDB service is started (run `mongod` in a terminal)');
      console.error('3. Verify the database name and credentials in your .env file');
      console.error('4. Ensure your IP is whitelisted if connecting to MongoDB Atlas');
    }
    
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
});

// Close the Mongoose connection when the Node process ends
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed through app termination');
  process.exit(0);
});

// Export the connection function and mongoose instance
export { connectDB, mongoose as default };
