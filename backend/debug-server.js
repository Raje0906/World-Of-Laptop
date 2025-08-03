import express from "express";
import { connectDB } from "./config/db.js";
import repairRoutes from "./routes/repairs.js";

const app = express();
const PORT = 3002;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Simple request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Connect to MongoDB
console.log('Connecting to MongoDB...');
connectDB().then(() => {
  console.log('MongoDB connected successfully');
  
  // Mount the repairs routes
  app.use('/api/repairs', repairRoutes);
  
  // Simple test route
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Test route is working!' });
  });
  
  // Start the server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Test the API at http://localhost:${PORT}/api/test`);
    console.log(`Test repair tracking at http://localhost:${PORT}/api/repairs/track/status?email=test@example.com`);
  });
  
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
