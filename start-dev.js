#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting development environment...');
console.log('Current directory:', __dirname);

// Check if we're in the right directory
if (!existsSync(join(__dirname, 'package.json'))) {
  console.error('❌ package.json not found. Are you in the correct directory?');
  process.exit(1);
}

// Check if node_modules exists
if (!existsSync(join(__dirname, 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Function to check if a port is in use
function isPortInUse(port) {
  try {
    execSync(`netstat -ano | findstr :${port}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Check if ports are available
const backendPort = 3002;
const frontendPort = 8080;

console.log(`🔍 Checking if port ${backendPort} is available...`);
if (isPortInUse(backendPort)) {
  console.log(`⚠️  Port ${backendPort} is already in use. Backend server might already be running.`);
} else {
  console.log(`✅ Port ${backendPort} is available`);
}

console.log(`🔍 Checking if port ${frontendPort} is available...`);
if (isPortInUse(frontendPort)) {
  console.log(`⚠️  Port ${frontendPort} is already in use. Frontend server might already be running.`);
} else {
  console.log(`✅ Port ${frontendPort} is available`);
}

console.log('\n🎯 Starting development servers...');
console.log('This will start both backend and frontend servers concurrently.');
console.log('Press Ctrl+C to stop both servers.\n');

// Start the development environment
try {
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
  });

  devProcess.on('error', (error) => {
    console.error('❌ Failed to start development servers:', error.message);
    process.exit(1);
  });

  devProcess.on('close', (code) => {
    console.log(`\n🛑 Development servers stopped with code ${code}`);
  });

} catch (error) {
  console.error('❌ Failed to start development environment:', error.message);
  console.log('\n💡 Alternative: Start servers manually:');
  console.log('Terminal 1: npm run server');
  console.log('Terminal 2: npm run client');
  process.exit(1);
} 