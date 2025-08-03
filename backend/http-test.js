const http = require('http');
const PORT = 3004;

const server = http.createServer((req, res) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Handle repair tracking endpoint
  if (req.url.startsWith('/api/repairs/track/status')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const email = url.searchParams.get('email');
    
    console.log('Query parameters:', url.searchParams.toString());
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'Repair tracking endpoint is working!',
      query: {
        email
      }
    }));
    return;
  }
  
  // Default response for other routes
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify({
    message: 'Hello from HTTP server!',
    path: req.url,
    method: req.method
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 HTTP server running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/api/repairs/track/status?email=test@example.com`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('\n❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  process.exit(1);
});
