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
      include: ['react', 'react-dom', 'react-is', 'recharts'],
    },
    server: {
      port: 8080,
      host: '0.0.0.0',
      strictPort: true,
      open: true,
      cors: false,
      proxy: mode === 'development' ? {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      } : undefined
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
      strictPort: true,
      open: true,
      cors: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          rewrite: (path) => path.replace(/^\/api/, '/api')
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
        external: [],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select']
          },
          // Ensure consistent file naming
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Ensure proper chunking
      chunkSizeWarningLimit: 1000,
      // Ensure proper module format
      target: 'esnext',
      modulePreload: false,
    },
    define: {
      // Define environment variables for the client
      __API_URL__: JSON.stringify(apiUrl),
      __IS_DEVELOPMENT__: JSON.stringify(mode === 'development'),
    },
  };
});
