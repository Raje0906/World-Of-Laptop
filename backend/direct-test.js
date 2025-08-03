import express from 'express';
import { connectDB } from './config/db.js';
import repairRoutes from './routes/repairs.js';

const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/repairs', repairRoutes);

// Start server
async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('MongoDB connected successfully');
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      
      // Test the endpoint after server starts
      testEndpoint();
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Test the endpoint
async function testEndpoint() {
  const testEmail = 'rajeaditya999@gmail.com';
  const url = `http://localhost:${PORT}/api/repairs/track/status?email=${encodeURIComponent(testEmail)}`;
  
  console.log('\n--- Testing Repair Endpoint ---');
  console.log('URL:', url);
  
  try {
    console.log('Sending GET request...');
    const response = await fetch(url);
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('Error response:', await response.text());
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

// Start the server
startServer();
