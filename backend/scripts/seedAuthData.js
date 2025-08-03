import mongoose from "mongoose";
import dotenv from "dotenv";
import Store from "../models/StoreMongoose.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/laptop-store';

const sampleStores = [
  {
    name: "North Store",
    address: "123 North Street, Downtown",
    phone: "+91-9876543210",
    email: "north@laptopstore.com",
    manager: "John Manager",
    status: "active"
  },
  {
    name: "South Store", 
    address: "456 South Avenue, Suburb",
    phone: "+91-9876543211",
    email: "south@laptopstore.com",
    manager: "Jane Manager",
    status: "active"
  },
  {
    name: "East Store",
    address: "789 East Road, Tech Park",
    phone: "+91-9876543212", 
    email: "east@laptopstore.com",
    manager: "Bob Manager",
    status: "active"
  }
];

const sampleUsers = [
  {
    name: "Admin User",
    email: "admin@laptopstore.com",
    phone: "+91-9999999999",
    password: "admin123",
    role: "admin",
    isActive: true
  },
  {
    name: "John Manager",
    email: "john.manager@laptopstore.com", 
    phone: "+91-8888888888",
    password: "manager123",
    role: "store manager",
    isActive: true
  },
  {
    name: "Sarah Sales",
    email: "sarah.sales@laptopstore.com",
    phone: "+91-7777777777", 
    password: "sales123",
    role: "sales",
    isActive: true
  },
  {
    name: "Mike Engineer",
    email: "mike.engineer@laptopstore.com",
    phone: "+91-6666666666",
    password: "engineer123", 
    role: "engineer",
    isActive: true
  }
];

async function seedAuthData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Store.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing stores and users');

    // Create stores
    const createdStores = await Store.insertMany(sampleStores);
    console.log(`Created ${createdStores.length} stores`);

    // Create users with store assignments and hashed passwords
    const usersWithStores = await Promise.all(sampleUsers.map(async (user, index) => {
      const storeIndex = index % createdStores.length;
      return {
        ...user,
        store_id: createdStores[storeIndex]._id
      };
    }));

    // Save users one by one to trigger pre-save hooks
    const createdUsers = [];
    for (const userData of usersWithStores) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }

    // Display created data
    console.log('\n📋 Created Stores:');
    createdStores.forEach(store => {
      console.log(`  - ${store.name}: ${store.address}`);
    });

    console.log('\n👥 Created Users:');
    createdUsers.forEach(user => {
      const storeInfo = user.store_id ? 
        `(Store: ${createdStores.find(s => s._id.toString() === user.store_id.toString())?.name})` : 
        '(Admin - All Stores)';
      console.log(`  - ${user.name} (${user.role}) ${storeInfo}`);
      console.log(`    Email: ${user.email} | Phone: ${user.phone}`);
    });

    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin@laptopstore.com / admin123');
    console.log('Manager: john.manager@laptopstore.com / manager123');
    console.log('Sales: sarah.sales@laptopstore.com / sales123');
    console.log('Engineer: mike.engineer@laptopstore.com / engineer123');

    console.log('\n✅ Authentication data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding authentication data:', error);
    process.exit(1);
  }
}

seedAuthData(); 