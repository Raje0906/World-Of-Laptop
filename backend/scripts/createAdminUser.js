import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

// Admin user details
const adminUser = {
  name: 'Admin User',
  email: 'admin@store.com',
  phone: '1234567880',
  password: 'Admin@123', // Default password, should be changed after first login
  role: 'admin',
  isActive: true
};

// Connect to MongoDB
connectDB()
  .then(async () => {
    try {
      // Check if admin already exists
      const existingAdmin = await User.findOne({ email: adminUser.email });
      
      if (existingAdmin) {
        console.log('Admin user already exists:');
        console.log({
          name: existingAdmin.name,
          email: existingAdmin.email,
          role: existingAdmin.role
        });
        process.exit(0);
      }

      // Create new admin user
      const newAdmin = new User(adminUser);
      await newAdmin.save();
      
      console.log('Admin user created successfully:');
      console.log({
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      });
      
      console.log('\nIMPORTANT: Change the default password after first login!');
      process.exit(0);
    } catch (error) {
      console.error('Error creating admin user:', error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    process.exit(1);
  });
