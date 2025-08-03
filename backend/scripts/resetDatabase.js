import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function resetDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Drop the entire database
    await mongoose.connection.db.dropDatabase();
    console.log("🗑️ Database dropped successfully");

    console.log("✅ Database reset completed!");
    console.log("💡 Run 'npm run seed' to populate with sample data");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  }
}

// Run the reset function
resetDatabase();
