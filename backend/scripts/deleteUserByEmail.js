import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/laptop-store';

async function deleteUserByEmail(email) {
  try {
    await mongoose.connect(MONGODB_URI);
    const result = await User.deleteOne({ email });
    if (result.deletedCount > 0) {
      console.log(`User with email ${email} deleted.`);
    } else {
      console.log(`No user found with email ${email}.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error deleting user:', error);
    process.exit(1);
  }
}

// Usage: node deleteUserByEmail.js john@gmail.com
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email as an argument.');
  process.exit(1);
}
deleteUserByEmail(email); 