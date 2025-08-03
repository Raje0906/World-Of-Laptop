# Deployment Guide

This application is configured to run with the backend on Render and frontend on Vercel.

## Environment Configuration

### Backend (Render) Environment Variables

Set these environment variables in your Render dashboard:

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Environment
NODE_ENV=production

# Optional: Email services
SENDGRID_API_KEY=your_sendgrid_api_key
MAILGUN_API_KEY=your_mailgun_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Frontend (Vercel) Environment Variables

Set these environment variables in your Vercel dashboard:

```bash
# API Configuration
VITE_API_URL=https://world-of-laptop.onrender.com

# Store Configuration
VITE_STORE_NAME=Laptop Store
VITE_STORE_WEBSITE=https://laptopstore.com
VITE_STORE_SUPPORT_EMAIL=support@laptopstore.com
VITE_STORE_SUPPORT_PHONE=+91 98765 43210

# Optional: Email services
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_USER_ID=your_emailjs_user_id

# Optional: WhatsApp
VITE_WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
VITE_WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
```

## Deployment Steps

### 1. Backend Deployment (Render)

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the following:
   - **Build Command:** `npm install`
   - **Start Command:** `node backend/server.js`
4. Add environment variables as listed above
5. Deploy

**Note:** The backend only serves the API and doesn't build the frontend. The frontend is deployed separately on Vercel.

### 2. Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Set the following:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add environment variables as listed above
4. Deploy

## Development Setup

For local development:

1. **Start backend server:**
   ```bash
   npm run server
   ```

2. **Start frontend server:**
   ```bash
   npm run client
   ```

3. **Or start both together:**
   ```bash
   npm run dev
   ```

## Environment Switching

The application automatically detects the environment:

- **Development:** Uses proxy to `http://localhost:3002`
- **Production:** Uses direct API calls to `https://world-of-laptop.onrender.com`

## Architecture

- **Backend (Render):** Pure API server, no frontend build
- **Frontend (Vercel):** React application, communicates with backend API
- **Database:** MongoDB (hosted separately)
- **Communication:** Frontend makes API calls to backend

## Troubleshooting

### CORS Issues
- Ensure the frontend domain is added to the backend CORS allowed origins
- Check that the backend is properly configured to allow the frontend domain

### Build Issues
- Make sure all dependencies are in the correct section (dependencies vs devDependencies)
- Verify that the build command is correct for your platform

### API Connection Issues
- Check that the `VITE_API_URL` environment variable is set correctly
- Verify that the backend is running and accessible
- Check network connectivity between frontend and backend

## Local Development Fallback

If the production backend is not available, you can:

1. Set `VITE_API_URL=http://localhost:3002` in your local `.env` file
2. Start the local backend server with `npm run server`
3. The frontend will automatically use the local backend

## Security Notes

- Never commit sensitive environment variables to version control
- Use strong JWT secrets in production
- Enable HTTPS in production
- Regularly update dependencies
- Monitor application logs for security issues 