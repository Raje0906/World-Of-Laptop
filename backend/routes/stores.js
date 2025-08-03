import express from "express";
import { body, param, query, validationResult } from "express-validator";
import Store from "../models/Store.js";

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

// GET /api/stores - Get all stores
router.get(
  "/",
  [
    query("city").optional().isString().trim(),
    query("active").optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { city, active } = req.query;
      let query = {};
      
      // Build query based on filters
      if (city) {
        query.city = { $regex: city, $options: 'i' };
      }
      if (active !== undefined) {
        query.status = active === 'true' ? 'active' : 'inactive';
      }
      
      const stores = await Store.find(query).sort({ name: 1 });
      
      return res.status(200).json({
        success: true,
        count: stores.length,
        data: stores,
      });
    } catch (error) {
      console.error('Error fetching stores:', error);
      res.status(500).json({
        success: false,
        message: "Error fetching stores",
        error: error.message,
      });
    }
  },
);

// GET /api/stores/active - Get only active stores
router.get("/active", async (req, res) => {
  try {
    const stores = await Store.find({ status: 'active' }).sort({ name: 1 });

    res.json({
      success: true,
      count: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error('Error fetching active stores:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching active stores",
      error: error.message,
    });
  }
});

// GET /api/stores/:id - Get store by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid store ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const store = await Store.findById(req.params.id);

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      res.json({
        success: true,
        data: store,
      });
    } catch (error) {
      console.error(`Error fetching store with id ${req.params.id}:`, error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: "Invalid store ID format",
        });
      }
      res.status(500).json({
        success: false,
        message: "Error fetching store",
        error: error.message,
      });
    }
  },
);

// GET /api/stores/code/:code - Get store by code
router.get(
  "/code/:code",
  [param("code").notEmpty().withMessage("Store code is required")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const store = await Store.findByCode(req.params.code);

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      res.json({
        success: true,
        data: store,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching store",
        error: error.message,
      });
    }
  },
);

// POST /api/stores - Create new store
router.post(
  "/",
  [
    body("name").notEmpty().trim().withMessage("Store name is required"),
    body("address")
      .notEmpty()
      .withMessage("Address is required"),
    body("phone")
      .optional()
      .matches(/^\+?[\d\s-()]{10,15}$/)
      .withMessage("Valid phone number is required"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("manager")
      .optional()
      .trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const storeData = {
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        email: req.body.email,
        manager: req.body.manager,
        status: req.body.status || 'active'
      };

      const store = new Store(storeData);
      await store.save();

      res.status(201).json({
        success: true,
        message: "Store created successfully",
        data: store,
      });
    } catch (error) {
      console.error('Error creating store:', error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Store with this name already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Error creating store",
        error: error.message,
      });
    }
  },
);

// PUT /api/stores/:id - Update store
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid store ID"),
    body("name").optional().notEmpty().trim(),
    body("address").optional().notEmpty(),
    body("phone")
      .optional()
      .matches(/^\+?[\d\s-()]{10,15}$/),
    body("email").optional().isEmail().normalizeEmail(),
    body("manager").optional().notEmpty().trim(),
    body("status")
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status must be either active or inactive'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const store = await Store.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      res.json({
        success: true,
        message: "Store updated successfully",
        data: store,
      });
    } catch (error) {
      console.error(`Error updating store with id ${req.params.id}:`, error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: "Invalid store ID format",
        });
      }
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Store with this name already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Error updating store",
        error: error.message,
      });
    }
  },
);

// DELETE /api/stores/:id - Delete store
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid store ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const store = await Store.findByIdAndDelete(req.params.id);

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      res.json({
        success: true,
        message: "Store deleted successfully",
        data: store,
      });
    } catch (error) {
      console.error(`Error deleting store with id ${req.params.id}:`, error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: "Invalid store ID format",
        });
      }
      res.status(500).json({
        success: false,
        message: "Error deleting store",
        error: error.message,
      });
    }
  },
);

export default router;
