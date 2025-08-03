import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Debug logging
  console.log('Mode:', mode);
  console.log('VITE_API_URL:', env.VITE_API_URL);
  console.log('All env vars:', Object.keys(env).filter(key => key.startsWith('VITE_')));
  
  // Determine API URL based on environment
  let apiUrl: string;
  
  if (mode === 'production') {
    // Production: Use Render backend
    apiUrl = env.VITE_API_URL || 'https://world-of-laptop.onrender.com';
  } else {
    // Development: Use localhost with fallback to production
    apiUrl = env.VITE_API_URL || 'http://localhost:3002';
  }
  
  console.log('Using API URL:', apiUrl);
  
  return {
    root: __dirname,
    publicDir: 'public',
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-is'],
    },
    server: {
      port: 8080,
      host: '0.0.0.0',
      strictPort: true,
      open: true,
      cors: false,
      proxy: mode === 'development' ? {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          timeout: 10000, // 10 second timeout
          configure: (proxy, options) => {
            console.log('Proxy configured for:', options.target);
            
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Proxying request:', req.method, req.url, '->', options.target + req.url);
            });
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Proxy response:', proxyRes.statusCode, req.url);
            });
            
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err.message);
              console.error('Error code:', err.code);
              console.error('Error details:', {
                message: err.message,
                code: err.code,
                target: options.target
              });
              
              if (!res.headersSent) {
                res.writeHead(503, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ 
                  error: 'Backend Server Unavailable', 
                  message: 'The backend server is not running or not accessible',
                  details: err.message,
                  target: options.target,
                  suggestion: 'Make sure to run "npm run server" or "npm run dev" to start the backend server'
                }));
              }
            });
          }
        }
      } : undefined
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    define: {
      // Define environment variables for the client
      __API_URL__: JSON.stringify(apiUrl),
      __IS_DEVELOPMENT__: JSON.stringify(mode === 'development'),
    },
  };
});
