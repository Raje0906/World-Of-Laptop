#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying build process...');

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

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
try {
  if (existsSync(join(__dirname, 'dist'))) {
    execSync('rm -rf dist', { stdio: 'inherit', cwd: __dirname });
  }
  console.log('✅ Dist directory cleaned');
} catch (error) {
  console.log('⚠️ Could not clean dist directory (this is okay if it doesn\'t exist)');
}

// Run build
console.log('🏗️ Running build...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Verify build output
console.log('🔍 Verifying build output...');
const distPath = join(__dirname, 'dist');

if (!existsSync(distPath)) {
  console.error('❌ Dist directory not found after build');
  process.exit(1);
}

const files = readdirSync(distPath);
console.log('📁 Files in dist directory:', files);

// Check for essential files
const essentialFiles = ['index.html', 'assets'];
const missingFiles = essentialFiles.filter(file => !files.includes(file));

if (missingFiles.length > 0) {
  console.error('❌ Missing essential files:', missingFiles);
  process.exit(1);
}

// Check assets directory
const assetsPath = join(distPath, 'assets');
if (existsSync(assetsPath)) {
  const assetFiles = readdirSync(assetsPath);
  console.log('📦 Asset files:', assetFiles);
  
  // Check for JavaScript files
  const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
  if (jsFiles.length === 0) {
    console.error('❌ No JavaScript files found in assets directory');
    process.exit(1);
  }
  
  console.log('✅ JavaScript files found:', jsFiles);
}

// Check index.html
const indexPath = join(distPath, 'index.html');
if (existsSync(indexPath)) {
  console.log('✅ index.html exists');
  
  // Read and check index.html content
  const fs = await import('fs');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check for script tags
  if (!indexContent.includes('<script')) {
    console.error('❌ No script tags found in index.html');
    process.exit(1);
  }
  
  console.log('✅ index.html contains script tags');
} else {
  console.error('❌ index.html not found');
  process.exit(1);
}

console.log('🎉 Build verification completed successfully!');
console.log('📋 Summary:');
console.log('  - Dependencies: ✅');
console.log('  - Build process: ✅');
console.log('  - Essential files: ✅');
console.log('  - Assets: ✅');
console.log('  - index.html: ✅');
console.log('');
console.log('🚀 Ready for deployment!'); 