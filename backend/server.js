import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from 'mongoose';
import fs from 'fs';
import connectDB from './config/db.js';
import { testEmailRouter } from './routes/test-email.js';

// Load environment variables
dotenv.config();

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Set up file logging
const logStream = fs.createWriteStream('server.log', { flags: 'a' });
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  logStream.write(`[${new Date().toISOString()}] [LOG] ${message}\n`);
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  const message = args.map(arg => arg instanceof Error ? arg.stack : 
    (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
  logStream.write(`[${new Date().toISOString()}] [ERROR] ${message}\n`);
  originalConsoleError.apply(console, args);
};

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Import routes
import customerRoutes from "./routes/customers.js";
import productRoutes from "./routes/products.js";
import saleRoutes from "./routes/sales.js";
import repairRoutes from "./routes/repairs.js";
import notificationRoutes from "./routes/notifications.js";
import storeRoutes from "./routes/stores.js";
import authRoutes from "./routes/auth.js";
import reportsRoutes from "./routes/reports.js";
import usersRoutes from "./routes/users.js";

// Import middleware
import errorHandler from "./middleware/errorHandler.js";
import { authenticateToken } from "./middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Run notification system test in development
if (process.env.NODE_ENV !== 'production') {
  import('./services/realNotificationService.js')
    .then(notificationService => {
      if (notificationService && notificationService.testNotificationSystem) {
        return notificationService.testNotificationSystem();
      }
      console.log('testNotificationSystem function not found in the notification service');
    })
    .catch(error => {
      console.error('Error in notification system test:', error);
    });
}

const app = express();
const PORT = 3002; // Using port 3002 to avoid conflicts with other services

// Add request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Request headers:', req.headers);
  next();
});

// Initialize database connection
await connectDB();

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Very permissive CORS configuration for debugging
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3003',
      'https://world-of-laptop.vercel.app',
      'https://world-of-laptop.onrender.com',
      'https://world-of-laptop-api.onrender.com',
      'https://world-of-laptop-api.vercel.app',
      'https://world-of-laptop-git-main-world-of-laptop.vercel.app',
      'https://world-of-laptop-7o8v0qk4z-world-of-laptop.vercel.app',
      'https://world-of-laptop-7o8v0qk4z-world-of-laptop.vercel.app',
      'https://world-of-laptop.vercel.app',
      'https://world-of-laptop-git-main-world-of-laptop.vercel.app',
      /^https:\/\/world-of-laptop-[a-z0-9]+-world-of-laptop\.vercel\.app$/,
      /^https:\/\/world-of-laptop-[a-z0-9]+\.vercel\.app$/,
      /^https?:\/\/localhost(:[0-9]+)?$/,
      /^https?:\/\/127\.0\.0\.1(:[0-9]+)?$/,
      /^https?:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/
    ];

    // Check if the origin matches any of the allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'content-type',
    'Content-type',
    'Authorization', 
    'authorization',
    'X-Requested-With',
    'x-requested-with',
    'Accept',
    'accept',
    'Origin',
    'origin',
    'Access-Control-Allow-Origin',
    'access-control-allow-origin',
    'Access-Control-Allow-Headers',
    'access-control-allow-headers',
    'Access-Control-Allow-Methods',
    'access-control-allow-methods',
    'Access-Control-Allow-Credentials',
    'access-control-allow-credentials'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Total-Count',
    'x-total-count',
    'Content-Type',
    'content-type',
    'Authorization',
    'authorization'
  ],
  maxAge: 86400 // Cache preflight for 24 hours
};

// Add specific route for OPTIONS preflight requests
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));

// Manual CORS preflight handler for additional security
app.options('*', (req, res) => {
  console.log('OPTIONS request received:', req.method, req.url);
  console.log('Request headers:', req.headers);
  
  // Set CORS headers manually
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, content-type, Authorization, authorization, X-Requested-With, Accept, accept, Origin, origin, Cache-Control, X-File-Name, X-API-Key, X-Client-Version, X-Request-ID, User-Agent, Referer, x-requested-with, cache-control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  res.status(204).end();
});

app.use(compression());

// Rate limiting (relaxed for /api/auth and /api/health)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
// Only apply limiter to non-auth and non-health routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth') || req.path === '/api/health') {
    return next(); // No rate limit for /api/auth and /api/health
  }
  limiter(req, res, next);
});

// Stricter rate limiting for notifications
const notificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit notification requests
  message: "Too many notification requests, please try again later.",
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check (not rate limited)
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: "connected",
  });
});

// Simple test endpoint
app.get("/api/test-repair", (req, res) => {
  console.log('Test repair endpoint hit!');
  res.json({
    success: true,
    message: 'Test repair endpoint is working!',
    query: req.query
  });
});

// API Routes with debug logging
const apiRoutes = [
  { path: '/api/auth', router: authRoutes },
  { path: '/api/customers', router: customerRoutes },
  { path: '/api/products', router: productRoutes },
  { path: '/api/sales', router: saleRoutes },
  { path: '/api/repairs', router: repairRoutes },
  { path: '/api/notifications', router: notificationRoutes, middleware: notificationLimiter },
  { path: '/api/stores', router: storeRoutes },
  { path: '/api/reports', router: reportsRoutes },
  { path: '/api/users', router: usersRoutes },
  { path: '/api', router: testEmailRouter },
];

// Add specific route for /api/auth/check-role to handle preflight
app.options('/api/auth/check-role', cors(corsOptions));

apiRoutes.forEach(route => {
  console.log(`Registering route: ${route.path}`);
  if (route.middleware) {
    app.use(route.path, cors(corsOptions), route.middleware, route.router);
  } else {
    app.use(route.path, cors(corsOptions), route.router);
  }
  
  // Add logging for the check-role endpoint
  if (route.path === '/api/auth') {
    console.log('  - POST /api/auth/check-role - Check user role by email/phone');
  }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, "dist")));

  // Handle React routing, return all requests to React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  // Simple response in development
  app.get("/", (req, res) => {
    res.json({
      message: "Welcome to the Laptop Store CRM API",
      status: "running",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      api_docs: "/api"
    });
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Server will use the PORT constant declared at the top
console.log(`🔵 Starting server on port: ${PORT}`);

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log(`\n🚀 Server running at:`);
  console.log(`   - Local:   http://localhost:${port}`);
  console.log(`   - Network: http://${host === '::' ? 'localhost' : host}:${port}`);
  console.log(`\n🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${port}/api`);
  
  // Log all registered routes
  console.log('\n🔍 Registered API Routes:');
  apiRoutes.forEach(route => {
    console.log(`   - ${route.path}`);
  });
  
  // Log database connection status
  console.log(`\n📊 Database Status: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  if (mongoose.connection.readyState === 1) {
    console.log(`   - Database Name: ${mongoose.connection.name}`);
    console.log(`   - Database Host: ${mongoose.connection.host}`);
    console.log(`   - Database Port: ${mongoose.connection.port}`);
  }
  
  // Test the repair endpoint
  console.log('\n🔧 Testing repair endpoint...');
  const testUrl = `http://localhost:${port}/api/repairs/track/status?email=test@example.com`;
  console.log(`   - Test URL: ${testUrl}`);
  
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB Connected');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Connection Error:', err);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop any other servers using this port.`);
    console.error('Try running: netstat -ano | findstr :5002');
    console.error('Then: taskkill /PID <PID> /F');
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  db.close();
  console.log("Database connection closed");
  process.exit(0);
});

export default app;