import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/your-db-name"; // Update fallback if needed

async function resetPassword(email, newPassword) {
  await mongoose.connect(MONGO_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.log("User not found");
    process.exit(1);
  }

  user.password = newPassword; // This will trigger the pre-save hook to hash it ONCE
  await user.save();

  console.log("Password reset for", email);
  process.exit(0);
}

resetPassword("nikki@gmail.com", "testpass123"); 