import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/laptop-store';

async function updateUserPassword(email, newPassword) {
  try {
    await mongoose.connect(MONGODB_URI);
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`No user found with email ${email}.`);
      process.exit(1);
    }
    // Just set the password - the pre-save hook will handle hashing it
    user.password = newPassword;
    await user.save();
    console.log(`Password for ${email} updated successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
}

// Usage: node updateUserPassword.js nikki@gmail.com testpass123
const email = process.argv[2] || "nikki@gmail.com";
const newPassword = process.argv[3] || "testpass123";
updateUserPassword(email, newPassword); 