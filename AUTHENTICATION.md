# 🔐 Authentication System Documentation

## Overview

This CRM system implements a comprehensive authentication and authorization system with role-based access control (RBAC) and store-based data isolation.

## Features

### ✅ Implemented Features

- **User Authentication**: Login with email/phone and password
- **User Registration**: New user registration with role assignment
- **Role-Based Access Control**: 4 user roles with different permissions
- **Store-Based Access**: Non-admin users can only access their assigned store
- **JWT Token Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password hashing for security
- **Protected Routes**: Frontend route protection with authentication checks
- **User Profile Management**: User information display and logout functionality

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | System administrator | Full access to all stores and data |
| **Store Manager** | Store-level manager | Access to assigned store only |
| **Sales** | Sales representative | Access to assigned store only |
| **Engineer** | Repair technician | Access to assigned store only |

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  phone: String (required, unique),
  password: String (hashed, required),
  store_id: ObjectId (ref: 'Store', required for non-admin),
  role: String (enum: ['admin', 'store manager', 'sales', 'engineer']),
  isActive: Boolean (default: true),
  lastLogin: Date,
  created_at: Date,
  updated_at: Date
}
```

### Stores Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  address: String (required),
  phone: String,
  email: String,
  manager: String,
  status: String (default: 'active'),
  created_at: Date,
  updated_at: Date
}
```

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/login`
Login with email/phone and password.

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "password": "password123",
  "store_id": "store_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+1234567890",
      "role": "sales",
      "store_id": "store_id"
    }
  }
}
```

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "Full Name",
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "store_id": "store_id_here",
  "role": "sales"
}
```

#### GET `/api/auth/me`
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

#### GET `/api/auth/stores`
Get list of all active stores for dropdown selection.

## Frontend Components

### Authentication Context (`src/contexts/AuthContext.tsx`)
Manages global authentication state and provides authentication methods.

**Key Methods:**
- `login(token, user)`: Store authentication data
- `logout()`: Clear authentication data
- `checkAuth()`: Verify token validity
- `updateUser(userData)`: Update user information

### Protected Route (`src/components/ProtectedRoute.tsx`)
Wrapper component that checks authentication and role permissions.

**Usage:**
```jsx
<ProtectedRoute requiredRoles={['admin', 'store manager']}>
  <AdminComponent />
</ProtectedRoute>
```

### Login Page (`src/pages/Login.tsx`)
Comprehensive login and registration form with:
- Email/phone login
- Store selection
- User registration
- Form validation
- Error handling

## Middleware

### Authentication Middleware (`middleware/auth.js`)

#### `authenticateToken`
Verifies JWT token and loads user data.

#### `requireRole(roles)`
Checks if user has required role(s).

#### `requireStoreAccess`
Ensures user has access to requested store.

#### `addStoreFilter`
Adds store filter to queries for non-admin users.

## Security Features

### Password Security
- **Bcrypt Hashing**: Passwords are hashed with bcrypt (salt rounds: 12)
- **Minimum Length**: 6 characters required
- **No Plain Text Storage**: Passwords are never stored in plain text

### Token Security
- **JWT Tokens**: 24-hour expiration
- **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
- **Token Validation**: Server-side token verification on each request

### Access Control
- **Role-Based**: Different permissions based on user role
- **Store-Based**: Non-admin users restricted to their assigned store
- **Route Protection**: Frontend routes protected from unauthorized access

## Setup Instructions

### 1. Install Dependencies
```bash
npm install bcryptjs
```

### 2. Seed Initial Data
```bash
npm run seed:auth
```

This creates:
- 3 sample stores (North, South, East)
- 4 sample users with different roles
- Admin user with full access

### 3. Test Credentials

| Role | Email | Password | Store Access |
|------|-------|----------|--------------|
| Admin | admin@laptopstore.com | admin123 | All stores |
| Manager | john.manager@laptopstore.com | manager123 | North Store |
| Sales | sarah.sales@laptopstore.com | sales123 | South Store |
| Engineer | mike.engineer@laptopstore.com | engineer123 | East Store |

## Usage Examples

### Protecting Routes
```jsx
// Admin only route
<ProtectedRoute requiredRoles={['admin']}>
  <AdminDashboard />
</ProtectedRoute>

// Manager and above
<ProtectedRoute requiredRoles={['admin', 'store manager']}>
  <ManagerPanel />
</ProtectedRoute>
```

### Using Authentication Context
```jsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, logout, token } = useAuth();
  
  if (!user) return <div>Please log in</div>;
  
  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### API Calls with Authentication
```jsx
const response = await fetch('/api/customers', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Environment Variables

Add these to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-here
MONGO_URI=mongodb://localhost:27017/laptop-store
NODE_ENV=development
```

## Production Considerations

### Security Enhancements
1. **HTTPS Only**: Use HTTPS in production
2. **HttpOnly Cookies**: Consider using httpOnly cookies instead of localStorage
3. **Token Refresh**: Implement token refresh mechanism
4. **Rate Limiting**: Add rate limiting to auth endpoints
5. **Password Policy**: Implement stronger password requirements
6. **Session Management**: Add session timeout and management

### Database Security
1. **Indexes**: Add proper indexes for performance
2. **Validation**: Implement additional data validation
3. **Audit Logs**: Add user activity logging
4. **Backup**: Regular database backups

## Troubleshooting

### Common Issues

1. **"User not found" Error**
   - Check if user exists in database
   - Verify email/phone format
   - Ensure user is active

2. **"Access denied to this store" Error**
   - Verify user's store assignment
   - Check if user is admin (admin can access all stores)
   - Ensure store_id is correct

3. **Token Expired Error**
   - User needs to log in again
   - Check JWT_SECRET environment variable
   - Verify token format

4. **Password Issues**
   - Ensure password meets minimum requirements (6 characters)
   - Check if password is being hashed properly
   - Verify bcrypt installation

### Debug Mode
Set `NODE_ENV=development` to enable debug logging and bypass authentication for development.

## Support

For issues or questions about the authentication system:
1. Check the console logs for error messages
2. Verify database connection
3. Ensure all environment variables are set
4. Check if MongoDB is running
5. Verify all dependencies are installed 