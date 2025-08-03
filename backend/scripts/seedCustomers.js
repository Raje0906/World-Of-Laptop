import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/laptop-store';

const sampleCustomers = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    address: {
      line1: '123 Main St',
      city: 'New York',
      state: 'NY',
      pincode: '10001'
    }
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '0987654321',
    address: {
      line1: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      pincode: '90001'
    }
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Customer.deleteMany({});
    console.log('Cleared existing customers');

    // Insert sample data
    const createdCustomers = await Customer.insertMany(sampleCustomers);
    console.log(`Seeded ${createdCustomers.length} customers`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
