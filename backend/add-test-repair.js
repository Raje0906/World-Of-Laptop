import mongoose from 'mongoose';
import Customer from './models/Customer.js';
import Repair from './models/Repair.js';

const connectDB = async () => {
  const mongoUri = 'mongodb://localhost:27017/laptop-store';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const addTestRepair = async () => {
  try {
    await connectDB();
    
    // Find the customer with email rajeaditya999@gmail.com
    const customer = await Customer.findOne({ email: 'rajeaditya999@gmail.com' });
    
    if (!customer) {
      console.log('Customer not found. Creating one...');
      const newCustomer = new Customer({
        name: 'Aditya Raje',
        email: 'rajeaditya999@gmail.com',
        phone: '+919699616876',
        address: {
          line1: 'F-104, TARANGANA RESIDENCY',
          line2: 'NEAR KHUTWAD CHOWK',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        },
        customerType: 'individual',
        loyaltyPoints: 0
      });
      
      await newCustomer.save();
      console.log('Created new customer:', newCustomer._id);
    } else {
      console.log('Found existing customer:', customer._id);
    }
    
    // Create a test repair
    const testRepair = new Repair({
      customer: customer ? customer._id : newCustomer._id,
      deviceType: 'laptop',
      brand: 'Dell',
      model: 'Inspiron 15 3000',
      serialNumber: 'SN123456789',
      issueDescription: 'Screen not working properly - black screen on startup',
      diagnosis: 'LCD panel needs replacement',
      repairCost: 5000,
      partsCost: 3500,
      laborCost: 1500,
      status: 'in_progress',
      priority: 'high',
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      technician: 'Raj Technician',
      notes: 'Customer reported black screen issue. LCD panel ordered.',
      receivedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    });
    
    await testRepair.save();
    console.log('Created test repair:', testRepair._id);
    console.log('Repair status:', testRepair.status);
    
    // Test the tracking endpoint
    console.log('\nTesting tracking endpoint...');
    const response = await fetch('http://localhost:3002/api/repairs/track/status?email=rajeaditya999%40gmail.com');
    const data = await response.json();
    console.log('Tracking response:', data);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addTestRepair(); 