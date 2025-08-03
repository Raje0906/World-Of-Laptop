import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Inventory from '../models/Inventory.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/laptop-store';

async function addIsActiveField() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB');

    // Add isActive: true to all existing documents
    const result = await Inventory.updateMany(
      { isActive: { $exists: false } }, // Find docs without isActive
      { $set: { isActive: true } }      // Set isActive to true
    );

    console.log(`Updated ${result.modifiedCount} documents`);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
addIsActiveField();
