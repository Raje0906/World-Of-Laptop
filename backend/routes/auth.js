import express from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Store from "../models/Store.js";
import StoreMongoose from "../models/StoreMongoose.js";
import { authenticateToken } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }
  next();
};

// Generate JWT token with 10-minute inactivity timeout
const generateToken = (user) => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      store_id: user.store_id,
      iat: now, // Issued at time
    },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: "24h" } // Token will still expire after 24h regardless of activity
  );
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("identifier")
      .notEmpty()
      .withMessage("Email or phone number is required"),
    body("password").notEmpty().withMessage("Password is required"),
    body("store_id")
      .optional()
      .notEmpty()
      .withMessage("Store selection is required for non-admin users"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { identifier, password, store_id } = req.body;

      console.log('Login attempt:', { 
        identifier: identifier,
        store_id: store_id || 'not provided' 
      });

      // Find user by email or phone
      const user = await User.findByEmailOrPhone(identifier);
      
      console.log('User found:', user ? { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        store_id: user.store_id,
        isActive: user.isActive 
      } : 'No user found');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email/phone or password",
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        console.log('Login attempt for deactivated account:', user.email);
        return res.status(403).json({
          success: false,
          message: "Account is deactivated. Please contact your administrator.",
        });
      }

      // Verify password
      console.log('Attempting password verification...');
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        console.log('Invalid password for user:', user.email);
        return res.status(401).json({
          success: false,
          message: "Invalid email/phone or password",
        });
      }

      // For all users, verify the selected store exists and is active
      if (!store_id) {
        return res.status(400).json({
          success: false,
          message: "Store selection is required",
        });
      }

      // Verify store exists and is active
      const store = await Store.findById(store_id);
      if (!store || store.status !== 'active') {
        console.log('Store status check failed:', { 
          storeExists: !!store, 
          storeStatus: store?.status,
          storeId: store_id 
        });
        return res.status(400).json({
          success: false,
          message: "The selected store is not available",
        });
      }
      
      // Update user's store assignment to the selected store
      user.store_id = store_id;

      // Update last login timestamp
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = generateToken(user);

      // Prepare user data for response
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        store_id: user.store_id,
      };

      // If store_id exists, populate store details
      if (user.store_id) {
        const store = await Store.findById(user.store_id).select('name address isActive').lean();
        if (store) {
          userData.store = {
            id: store._id,
            name: store.name,
            address: store.address,
            isActive: store.isActive
          };
        }
      }

      console.log('Login successful:', { 
        userId: user._id, 
        role: user.role,
        store: user.store_id || 'N/A'
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: userData,
          token: token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  }
);

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
  "/register",
  [
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters long"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("phone")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Please provide a valid phone number"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("store_id")
      .optional()
      .notEmpty()
      .withMessage("Store selection is required for non-admin users"),
    body("role")
      .isIn(["admin", "store manager", "sales", "engineer"])
      .withMessage("Invalid role selected"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, phone, password, store_id, role } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      let createdByAdmin = false;

      // Check if the request is from an admin
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
          const adminUser = await User.findById(decoded.id);
          if (adminUser && adminUser.role === 'admin') {
            createdByAdmin = true;
          }
        } catch (err) {
          // Invalid or expired token - treat as regular registration
          console.log('Invalid or expired token, proceeding as regular registration');
        }
      }

      // Only admins can create other admins
      if (role === 'admin' && !createdByAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only administrators can create admin accounts",
        });
      }

      // Validate store_id for non-admin roles
      if (role !== 'admin' && !store_id) {
        return res.status(400).json({
          success: false,
          message: "Store selection is required for non-admin users",
        });
      }

      // Check if store exists for non-admin users
      if (role !== 'admin') {
        const store = await Store.findById(store_id);
        if (!store) {
          return res.status(400).json({
            success: false,
            message: "Selected store does not exist",
          });
        }
      }

      // Check for existing user with same email or phone
      const existingUser = await User.findOne({
        $or: [{ email }, { phone }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email or phone already exists",
        });
      }

      // Create new user
      const newUser = new User({
        name,
        email,
        phone,
        password,
        role,
        store_id: role === 'admin' ? undefined : store_id,
        isActive: true, // Users created by admin are active by default
      });

      // The pre-save hook will hash the password
      await newUser.save();

      // Generate token if this is a self-registration
      let tokenResponse = null;
      if (!createdByAdmin) {
        tokenResponse = generateToken(newUser);
      }

      res.status(201).json({
        success: true,
        message: createdByAdmin 
          ? "User created successfully" 
          : "User registered successfully",
        data: {
          token: tokenResponse,
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role,
            store_id: newUser.store_id,
            isActive: newUser.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
    const user = await User.findById(decoded.id).populate("store_id", "name address");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          store_id: user.store_id,
          store: user.store_id,
        },
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
});

// @route   GET /api/auth/stores
// @desc    Get all stores for dropdown
// @access  Public
router.get("/stores", async (req, res) => {
  try {
    console.log('Fetching stores...');
    const stores = await Store.find({ status: "active" }).select("name address");
    console.log('Found stores:', stores);
    
    res.json({
      success: true,
      data: { stores },
    });
  } catch (error) {
    console.error("Get stores error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stores",
    });
  }
});

// @route   GET /api/auth/debug/users
// @desc    Get all users (for debugging)
// @access  Public (only for development)
router.get("/debug/users", async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('store_id', 'name address');
    
    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
});

// @route   GET /api/auth/admin/users
// @desc    Get all users (admin only)
// @access  Private (admin only)
router.get("/admin/users", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const users = await User.find().select('-password').populate('store_id', 'name address');
    
    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
});

// @route   PUT /api/auth/admin/users/:userId/store
// @desc    Update user's store assignment (admin only)
// @access  Private (admin only)
router.put("/admin/users/:userId/store", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { userId } = req.params;
    const { store_id } = req.body;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify store exists (if store_id is provided)
    if (store_id) {
      const store = await Store.findById(store_id);
      if (!store) {
        return res.status(400).json({
          success: false,
          message: "Selected store does not exist",
        });
      }
    }

    // Update user's store assignment
    user.store_id = store_id || null;
    await user.save();

    // Return updated user data
    const updatedUser = await User.findById(userId).select('-password').populate('store_id', 'name address');

    res.json({
      success: true,
      message: "User store assignment updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Update user store error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user store assignment",
    });
  }
});

// @route   PUT /api/auth/admin/users/:userId/role
// @desc    Update user's role (admin only)
// @access  Private (admin only)
router.put("/admin/users/:userId/role", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!["admin", "store manager", "sales", "engineer"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user's role
    user.role = role;
    
    // If changing to admin, remove store assignment
    if (role === "admin") {
      user.store_id = null;
    }
    
    await user.save();

    // Return updated user data
    const updatedUser = await User.findById(userId).select('-password').populate('store_id', 'name address');

    res.json({
      success: true,
      message: "User role updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user role",
    });
  }
});

// @route   DELETE /api/auth/admin/users/:userId
// @desc    Delete a user (admin only)
// @access  Private (admin only)
router.delete("/admin/users/:userId", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
    });
  }
});

export default router; 