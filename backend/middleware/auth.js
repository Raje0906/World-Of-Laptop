import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Enhanced authentication middleware with role-based access
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // For development, allow requests without authentication but still try to verify token if provided
  if (process.env.NODE_ENV === "development" && !token) {
    // Set a default user for development
    req.user = { role: 'admin', id: 'dev-user', store_id: null };
    return next();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
    
    // Check for token expiration due to inactivity (10 minutes)
    const TEN_MINUTES = 10 * 60; // 10 minutes in seconds
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (decoded.iat && (currentTime - decoded.iat) > TEN_MINUTES) {
      return res.status(401).json({
        success: false,
        message: "Session expired due to inactivity. Please log in again.",
        code: "SESSION_EXPIRED"
      });
    }
    
    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Role-based access control middleware
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Store-based access control middleware
export const requireStoreAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Admin has access to all stores
  if (req.user.role === "admin") {
    return next();
  }

  // For non-admin users, check if they have access to the requested store
  const requestedStoreId = req.params.storeId || req.body.store_id || req.query.store_id;
  
  if (requestedStoreId && req.user.store_id.toString() !== requestedStoreId) {
    return res.status(403).json({
      success: false,
      message: "Access denied to this store",
    });
  }

  next();
};

// Add store filter to query for non-admin users
export const addStoreFilter = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Admin can see all data
  if (req.user.role === "admin") {
    return next();
  }

  // For non-admin users, filter by their store
  req.storeFilter = { store_id: req.user.store_id };
  next();
};

// Generate token for testing
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || "fallback-secret", {
    expiresIn: "24h",
  });
};

// Simple login endpoint for development (keeping for backward compatibility)
export const createAuthRoutes = (router) => {
  router.post("/login", (req, res) => {
    const { username, password } = req.body;

    // Simple authentication for development
    if (username === "admin" && password === "admin123") {
      const token = generateToken({
        username,
        role: "admin",
        storeId: null,
      });

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            username,
            role: "admin",
          },
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
  });
};

export default {
  authenticateToken,
  requireRole,
  requireStoreAccess,
  addStoreFilter,
  generateToken,
  createAuthRoutes,
};
