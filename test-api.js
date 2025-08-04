// Simple test script to verify API client configuration
console.log('Testing API client configuration...');

// Simulate the environment detection logic
const hasExplicitApiUrl = process.env.VITE_API_URL && process.env.VITE_API_URL.trim() !== '';
const isLocalhost = false; // Simulate production environment

let apiUrl;
if (hasExplicitApiUrl) {
  apiUrl = process.env.VITE_API_URL + '/api';
} else if (isLocalhost) {
  apiUrl = '/api';
} else {
  apiUrl = 'https://world-of-laptop.onrender.com/api';
}

console.log('Environment variables:');
console.log('- VITE_API_URL:', process.env.VITE_API_URL);
console.log('- hasExplicitApiUrl:', hasExplicitApiUrl);
console.log('- isLocalhost:', isLocalhost);
console.log('- Final API URL:', apiUrl);

// Test the backend health endpoint
async function testBackendHealth() {
  try {
    console.log('\nTesting backend health endpoint...');
    const response = await fetch(`${apiUrl}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy:', data);
    } else {
      console.log('❌ Backend health check failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Backend health check error:', error.message);
  }
}

// Test the stores endpoint
async function testStoresEndpoint() {
  try {
    console.log('\nTesting stores endpoint...');
    const response = await fetch(`${apiUrl}/stores`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Stores endpoint working:', data);
    } else {
      console.log('❌ Stores endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Stores endpoint error:', error.message);
  }
}

// Run tests
testBackendHealth().then(() => testStoresEndpoint()); 