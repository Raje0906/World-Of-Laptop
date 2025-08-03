import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/laptop-store';
  
  console.log('🔗 Using MongoDB URI:', mongoUri.replace(/:[^:]*@/, ':***@'));
  
  try {
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    mongoose.connection.on('connecting', () => {
      console.log('🔄 Connecting to MongoDB...');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB Connected to:', mongoose.connection.host);
      console.log('📊 Database Name:', mongoose.connection.name);
      console.log('🏷️  Connection State:', mongoose.connection.readyState);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.name);
      console.error('Error message:', err.message);
      if (err.name === 'MongoServerError') {
        console.error('Error code:', err.code);
        console.error('Error code name:', err.codeName);
      }
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });
    
    console.log(`MongoDB Connected to: ${conn.connection.host}`);
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error details:');
    console.error('- Error name:', error.name);
    console.error('- Error message:', error.message);
    console.error('- Error code:', error.code);
    console.error('- Error code name:', error.codeName);
    
    // Provide more helpful error messages
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nTroubleshooting tips:');
      console.error('1. Make sure MongoDB is running on your system');
      console.error('2. Check if the connection string is correct:', mongoUri);
      console.error('3. If using a remote database, ensure it\'s accessible from your network');
      console.error('4. Check if any firewall is blocking the connection');
    }
    
    process.exit(1);
  }
};

// Using both named and default export for compatibility
export { connectDB };
export default connectDB;
