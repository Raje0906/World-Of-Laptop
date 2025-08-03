#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting build process...');
console.log('Current directory:', __dirname);

try {
  // Check if we're in the right directory
  if (!existsSync(join(__dirname, 'package.json'))) {
    throw new Error('package.json not found. Are you in the correct directory?');
  }

  // Run the build
  console.log('📦 Running Vite build...');
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  
  // Check if build was successful
  const distPath = join(__dirname, 'dist');
  if (!existsSync(distPath)) {
    throw new Error('Build failed - dist directory not created');
  }
  
  const files = readdirSync(distPath);
  console.log('✅ Build completed successfully!');
  console.log('📁 Files in dist directory:', files);
  
  // Check for essential files
  const essentialFiles = ['index.html', 'assets'];
  for (const file of essentialFiles) {
    if (!files.includes(file) && !files.some(f => f.startsWith(file))) {
      console.warn(`⚠️  Warning: ${file} not found in dist directory`);
    }
  }
  
  console.log('🎉 Build process completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 