import express from "express";
import { body, param, query, validationResult } from "express-validator";
import Product from "../models/Product.js";
import mongoose from "mongoose";

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

// Update product stock quantity
router.put(
  "/:id/stock",
  [
    param("id").isMongoId().withMessage("Invalid product ID"),
    body("quantity").isInt({ min: 0 }).withMessage("Quantity must be a positive integer"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      const product = await Product.findByIdAndUpdate(
        id,
        { stock_quantity: quantity },
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: product,
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock',
        error: error.message,
      });
    }
  }
);

// Validation rules for product creation
const productValidationRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a positive integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be a positive integer'),
  body('warranty_period').optional().isInt({ min: 0 }).withMessage('Warranty period must be a positive integer'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];

// Create a new product
router.post(
  "/",
  productValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Create product in the database
      const product = await Product.create(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('Error creating product:', error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A product with this SKU already exists',
          error: error.message
        });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error.message
      });
    }
  }
);

// GET /api/products - Get all products with filtering
// Get all products with filtering
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 1000 }),
    query("search").optional().isString().trim(),
    query("category").optional().isString(),
    query("status").optional().isIn(["active", "inactive"]),
    query("lowStock").optional().isBoolean(),
    query("barcode").optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      let limit = 20;
      if (req.query.limit) {
        const parsedLimit = parseInt(req.query.limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 1000) {
          limit = parsedLimit;
        }
      }
      const skip = (page - 1) * limit;
      const { search, category, status, lowStock, barcode } = req.query;

      // Build the query
      const query = {};
      
      // Status filter
      if (status) {
        query.status = status;
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: search },
          { barcode: search }
        ];
      }

      // Add low stock filter
      if (lowStock === 'true') {
        query.stock_quantity = { $lte: 10 }; // Example threshold for low stock
      }
      
      if (barcode) {
        query.barcode = barcode;
      }

      const [products, total] = await Promise.all([
        Product.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Product.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching products",
        error: error.message,
      });
    }
  },
);

// GET /api/products/search - Product search by SKU, barcode, serial number
// Search product by barcode
router.get(
  "/barcode/:barcode",
  [
    param("barcode").notEmpty().withMessage("Barcode is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { barcode } = req.params;
      
      const product = await Product.findOne({ barcode });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
      
      res.json({
        success: true,
        data: product
      });
      
    } catch (error) {
      console.error('Error searching product by barcode:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search product by barcode',
        error: error.message
      });
    }
  }
);

// General search endpoint
router.get(
  "/search",
  [
    query("q").notEmpty().withMessage("Search query is required"),
    query("type").optional().isIn(["sku", "barcode", "serial", "text"]),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q, type = "text" } = req.query;

      let product;

      switch (type) {
        case "sku":
          product = await Product.findBySKU(q);
          break;
        case "barcode":
          product = await Product.findByBarcode(q);
          break;
        case "serial":
          product = await Product.findBySerialNumber(q);
          break;
        default:
          const products = await Product.searchProducts(q)
            .populate("inventory.store", "name code")
            .limit(20);
          return res.json({
            success: true,
            data: products,
          });
      }

      if (product) {
        await product.populate("inventory.store", "name code");
      }

      res.json({
        success: true,
        data: product ? [product] : [],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error searching products",
        error: error.message,
      });
    }
  },
);

// GET /api/products/low-stock/:storeId - Get low stock products for a store
router.get(
  "/low-stock/:storeId",
  [param("storeId").isMongoId().withMessage("Invalid store ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const products = await Product.getLowStockProducts(
        req.params.storeId,
      ).populate("inventory.store", "name code");

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching low stock products",
        error: error.message,
      });
    }
  },
);

// PATCH /api/products/bulk-update - Bulk update products
router.patch(
  '/bulk-update',
  [
    body('productIds').isArray().withMessage('Product IDs must be an array'),
    body('updateType').isIn(['stock', 'price', 'status']).withMessage('Invalid update type'),
    body('value').custom((value, { req }) => {
      if (req.body.updateType !== 'status' && (value === '' || value === null || value === undefined)) {
        throw new Error('Value is required for this update type');
      }
      return true;
    }),
    body('note').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productIds, updateType, value, note } = req.body;
      
      // Create update object based on update type
      const update = {};
      const now = new Date();
      
      switch (updateType) {
        case 'stock':
          update.$inc = { stock_quantity: parseFloat(value) };
          update.updated_at = now;
          break;
          
        case 'price':
          update.price = parseFloat(value);
          update.updated_at = now;
          break;
          
        case 'status':
          update.status = value || 'active';
          update.updated_at = now;
          break;
      }
      
      // Add update note to history if note exists
      if (note) {
        update.$push = {
          update_history: {
            date: now,
            type: updateType,
            value: updateType === 'status' ? value : parseFloat(value),
            note: note
          }
        };
      }
      
      // Update all matching products
      const result = await Product.updateMany(
        { _id: { $in: productIds } },
        update
      );
      
      res.json({
        success: true,
        message: `Successfully updated ${result.modifiedCount} products`,
        updatedCount: result.modifiedCount
      });
      
    } catch (error) {
      console.error('Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update products',
        error: error.message
      });
    }
  }
);

// GET /api/products/:id - Get product by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid product ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id).populate(
        "inventory.store",
        "name code address",
      );

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching product",
        error: error.message,
      });
    }
  },
);

// POST /api/products - Create new product
router.post(
  "/",
  [
    body("name").notEmpty().trim().withMessage("Product name is required"),
    body("brand").notEmpty().trim().withMessage("Brand is required"),
    body("model").notEmpty().trim().withMessage("Model is required"),
    body("sku").notEmpty().trim().withMessage("SKU is required"),
    body("category").isIn([
      "laptop",
      "desktop",
      "tablet",
      "accessory",
      "software",
      "service",
    ]),
    body("pricing.costPrice")
      .isFloat({ min: 0 })
      .withMessage("Cost price must be positive"),
    body("pricing.sellingPrice")
      .isFloat({ min: 0 })
      .withMessage("Selling price must be positive"),
    body("pricing.mrp").optional().isFloat({ min: 0 }),
    body("pricing.discount").optional().isFloat({ min: 0, max: 100 }),
    body("barcode").optional().trim(),
    body("serialNumber").optional().trim(),
    body("description").optional().trim(),
    body("tags").optional().isArray(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if product with same SKU exists
      const existingProduct = await Product.findOne({
        sku: req.body.sku.toUpperCase(),
        isActive: true,
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }

      const product = new Product(req.body);
      await product.save();

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "Product with this SKU, barcode, or serial number already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating product",
        error: error.message,
      });
    }
  },
);

// PUT /api/products/:id - Update product
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid product ID"),
    body("name").optional().notEmpty().trim(),
    body("brand").optional().notEmpty().trim(),
    body("model").optional().notEmpty().trim(),
    body("category")
      .optional()
      .isIn([
        "laptop",
        "desktop",
        "tablet",
        "accessory",
        "software",
        "service",
      ]),
    body("pricing.costPrice").optional().isFloat({ min: 0 }),
    body("pricing.sellingPrice").optional().isFloat({ min: 0 }),
    body("pricing.mrp").optional().isFloat({ min: 0 }),
    body("pricing.discount").optional().isFloat({ min: 0, max: 100 }),
    body("description").optional().trim(),
    body("tags").optional().isArray(),
    body("status").optional().isIn(["active", "discontinued", "out_of_stock"]),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      Object.assign(product, req.body);
      await product.save();

      await product.populate("inventory.store", "name code");

      res.json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating product",
        error: error.message,
      });
    }
  },
);

// PUT /api/products/:id/inventory - Update product inventory for a store
router.put(
  "/:id/inventory",
  [
    param("id").isMongoId().withMessage("Invalid product ID"),
    body("storeId").isMongoId().withMessage("Store ID is required"),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be non-negative"),
    body("operation").optional().isIn(["set", "add", "subtract"]),
    body("lowStockThreshold").optional().isInt({ min: 0 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const {
        storeId,
        quantity,
        operation = "set",
        lowStockThreshold,
      } = req.body;

      await product.updateInventory(storeId, quantity, operation);

      // Update low stock threshold if provided
      if (lowStockThreshold !== undefined) {
        const inventory = product.getInventoryByStore(storeId);
        if (inventory) {
          inventory.lowStockThreshold = lowStockThreshold;
          await product.save();
        }
      }

      await product.populate("inventory.store", "name code");

      res.json({
        success: true,
        message: "Inventory updated successfully",
        data: product,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating inventory",
        error: error.message,
      });
    }
  },
);

// POST /api/products/:id/reserve - Reserve inventory
router.post(
  "/:id/reserve",
  [
    param("id").isMongoId().withMessage("Invalid product ID"),
    body("storeId").isMongoId().withMessage("Store ID is required"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be positive"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const { storeId, quantity } = req.body;

      await product.reserveInventory(storeId, quantity);

      res.json({
        success: true,
        message: "Inventory reserved successfully",
        data: {
          productId: product._id,
          storeId,
          reservedQuantity: quantity,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// POST /api/products/:id/release-reservation - Release reserved inventory
router.post(
  "/:id/release-reservation",
  [
    param("id").isMongoId().withMessage("Invalid product ID"),
    body("storeId").isMongoId().withMessage("Store ID is required"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be positive"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const { storeId, quantity } = req.body;

      await product.releaseReservedInventory(storeId, quantity);

      res.json({
        success: true,
        message: "Reserved inventory released successfully",
        data: {
          productId: product._id,
          storeId,
          releasedQuantity: quantity,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error releasing reserved inventory",
        error: error.message,
      });
    }
  },
);

// DELETE /api/products/:id - Soft delete product
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid product ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      product.isActive = false;
      await product.save();

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting product",
        error: error.message,
      });
    }
  },
);

export default router;
