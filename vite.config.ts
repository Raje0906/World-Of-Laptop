import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Debug logging
  console.log('Mode:', mode);
  console.log('VITE_API_URL:', env.VITE_API_URL);
  console.log('All env vars:', Object.keys(env).filter(key => key.startsWith('VITE_')));
  
  // Use local development server for now since production seems to have issues
  const apiUrl = 'http://localhost:3002';
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
      proxy: {
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
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ 
                  error: 'Proxy error', 
                  message: err.message,
                  target: options.target 
                }));
              }
            });
          }
        }
      }
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
  };
});
