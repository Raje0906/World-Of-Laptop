import express from "express";
import { body, param, query, validationResult } from "express-validator";
import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";

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

// GET /api/sales - Get all sales with filtering
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("storeId").optional().isMongoId(),
    query("customerId").optional().isMongoId(),
    query("status")
      .optional()
      .isIn([
        "pending",
        "completed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ]),
    query("paymentMethod")
      .optional()
      .isIn(["cash", "card", "upi", "emi", "bank_transfer", "cheque"]),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const { storeId, customerId, status, paymentMethod, startDate, endDate } =
        req.query;

      let query = { isActive: true };

      if (storeId) query.store = storeId;
      if (customerId) query.customer = customerId;
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const sales = await Sale.find(query)
        .populate("customer", "name email phone")
        .populate("store", "name code address")
        .populate("items.product", "name brand model sku")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Sale.countDocuments(query);

      res.json({
        success: true,
        data: {
          sales,
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
        message: "Error fetching sales",
        error: error.message,
      });
    }
  },
);

// GET /api/sales/stats - Get sales statistics
router.get(
  "/stats",
  [
    query("storeId").optional().isMongoId(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { storeId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date();

      // If no date range provided, use current month
      if (!startDate && !endDate) {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      }

      const stats = await Sale.getSalesStats(start, end, storeId);

      res.json({
        success: true,
        data: stats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalRefunded: 0,
          averageOrderValue: 0,
          totalItemsSold: 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching sales statistics",
        error: error.message,
      });
    }
  },
);

// GET /api/sales/daily - Get sales for a specific date
router.get(
  "/daily",
  [
    query("date")
      .optional()
      .isISO8601()
      .withMessage("Date must be in ISO format (YYYY-MM-DD)")
      .custom((value) => {
        if (value) {
          const date = new Date(value);
          const now = new Date();
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
          
          // Allow dates within a reasonable range (1 year past to 2 years future)
          if (date < oneYearAgo || date > twoYearsFromNow) {
            throw new Error("Date must be within a reasonable range (1 year past to 2 years future)");
          }
        }
        return true;
      }),
    query("storeId")
      .optional()
      .isMongoId()
      .withMessage("Invalid store ID format"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Limit must be between 1 and 1000"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { date, storeId, limit = 1000 } = req.query;
      
      // Default to today's date if no date provided
      const targetDate = date ? new Date(date) : new Date();
      
      // Ensure we're working with a clean date (no time component)
      targetDate.setHours(0, 0, 0, 0);
      
      // Set start and end of the target date
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Log request for monitoring (sanitized)
      console.log(`[DAILY SALES] Request: date=${targetDate.toISOString().split('T')[0]}, storeId=${storeId ? 'provided' : 'not-provided'}, limit=${limit}`);
      console.log(`[DAILY SALES] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
      console.log(`[DAILY SALES] Query parameters:`, { date, storeId, limit });

      // Build query with proper validation
      let query = {
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      };

      if (storeId) {
        query.store = storeId;
      }

      console.log(`[DAILY SALES] Final query:`, JSON.stringify(query, null, 2));
      console.log(`[DAILY SALES] MongoDB connection state:`, mongoose.connection.readyState);

      // Validate MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        console.error('[DAILY SALES] MongoDB not connected. State:', mongoose.connection.readyState);
        return res.status(500).json({
          success: false,
          message: "Database connection error",
        });
      }

      // Get sales for the specific date with pagination and proper error handling
      console.log(`[DAILY SALES] Querying MongoDB sales collection...`);
      const sales = await Sale.find(query)
        .populate("customer", "name email phone")
        .populate("store", "name code address")
        .populate("items.product", "name brand model sku")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean() // Use lean() for better performance when not modifying documents
        .exec();

      console.log(`[DAILY SALES] Found ${sales.length} sales for the date range`);
      if (sales.length > 0) {
        console.log(`[DAILY SALES] Sample sale:`, {
          id: sales[0]._id,
          saleNumber: sales[0].saleNumber,
          createdAt: sales[0].createdAt,
          totalAmount: sales[0].totalAmount,
          isActive: sales[0].isActive
        });
      }

      // Calculate daily statistics with proper error handling
      const dailyStats = {
        date: targetDate.toISOString().split('T')[0],
        totalSales: sales.length,
        totalAmount: sales.reduce((sum, sale) => {
          const amount = parseFloat(sale.totalAmount) || 0;
          return sum + amount;
        }, 0),
        totalItemsSold: sales.reduce((sum, sale) => {
          const itemCount = Array.isArray(sale.items) ? sale.items.length : 0;
          return sum + itemCount;
        }, 0),
        averageOrderValue: 0, // Will be calculated below
        sales: sales.map(sale => ({
          _id: sale._id,
          saleNumber: sale.saleNumber,
          customer: sale.customer ? {
            name: sale.customer.name || 'Unknown',
            email: sale.customer.email,
            phone: sale.customer.phone
          } : null,
          items: Array.isArray(sale.items) ? sale.items.map(item => ({
            name: item.product?.name || item.productName || 'Unknown Product',
            quantity: parseInt(item.quantity) || 0,
            price: parseFloat(item.unitPrice) || 0
          })) : [],
          total: parseFloat(sale.totalAmount) || 0,
          paymentMethod: sale.paymentMethod || 'unknown',
          createdAt: sale.createdAt
        }))
      };

      // Calculate average order value
      dailyStats.averageOrderValue = dailyStats.totalSales > 0
        ? dailyStats.totalAmount / dailyStats.totalSales
        : 0;

      // Round to 2 decimal places for currency
      dailyStats.averageOrderValue = Math.round(dailyStats.averageOrderValue * 100) / 100;

      console.log(`[DAILY SALES] Success: date=${dailyStats.date}, sales=${dailyStats.totalSales}, revenue=${dailyStats.totalAmount}`);

      res.json({
        success: true,
        message: `Retrieved ${dailyStats.totalSales} sales for ${dailyStats.date}`,
        data: dailyStats,
        resultCount: dailyStats.totalSales
      });

    } catch (error) {
      console.error("[DAILY SALES ERROR]", {
        error: error.message,
        stack: error.stack,
        date: req.query.date,
        storeId: req.query.storeId
      });

      res.status(500).json({
        success: false,
        message: "Error fetching daily sales",
        error: error.message
      });
    }
  }
);

// GET /api/sales/:id - Get sale by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid sale ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const sale = await Sale.findById(req.params.id)
        .populate("customer", "name email phone address")
        .populate("store", "name code address contact")
        .populate("items.product", "name brand model sku specifications");

      if (!sale || !sale.isActive) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      res.json({
        success: true,
        data: sale,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching sale",
        error: error.message,
      });
    }
  },
);

// GET /api/sales/number/:saleNumber - Get sale by sale number
router.get(
  "/number/:saleNumber",
  [param("saleNumber").notEmpty().withMessage("Sale number is required")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const sale = await Sale.findBySaleNumber(req.params.saleNumber)
        .populate("customer", "name email phone address")
        .populate("store", "name code address contact")
        .populate("items.product", "name brand model sku specifications");

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      res.json({
        success: true,
        data: sale,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching sale",
        error: error.message,
      });
    }
  },
);

// POST /api/sales - Create new sale
router.post(
  "/",
  [
    body("customer").isMongoId().withMessage("Valid customer ID is required"),
    body("store").optional().isMongoId().withMessage("Valid store ID is required"),
    body("storeId").optional().isMongoId().withMessage("Valid store ID is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("items.*").custom((item, { req }) => {
      // For manual entries, require productName
      if (!item.inventory && !item.productName) {
        throw new Error('Either inventory ID or product name is required');
      }
      return true;
    }),
    body("items.*.inventory")
      .optional()
      .isMongoId()
      .withMessage("Valid inventory ID is required"),
    body("items.*.productName")
      .optional()
      .isString()
      .withMessage("Product name must be a string"),
    body("items.*.serialNumber")
      .optional()
      .isString()
      .withMessage("Serial number must be a string"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be positive"),
    body("items.*.unitPrice")
      .isFloat({ min: 0 })
      .withMessage("Unit price must be positive"),
    body("items.*.discount").optional().isFloat({ min: 0, max: 100 }),
    body("paymentMethod").isIn([
      "cash",
      "card",
      "upi",
      "emi",
      "bank_transfer",
      "cheque",
    ]),
    body("paymentDetails").optional().isObject(),
    body("salesPerson").optional().isObject(),
    body("deliveryInfo").optional().isObject(),
    body("notes").optional().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('[SALE CREATE] Incoming body:', JSON.stringify(req.body, null, 2));
      const { customer, store, storeId, items, paymentMethod, paymentDetails, notes } =
        req.body;
      
      // Handle both store and storeId field names
      const finalStoreId = store || storeId;
      
      if (!finalStoreId) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required",
        });
      }

      // Validate MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        console.error('[SALE CREATE] MongoDB not connected. State:', mongoose.connection.readyState);
        return res.status(500).json({
          success: false,
          message: "Database connection error",
        });
      }

      console.log('[SALE CREATE] MongoDB connection state:', mongoose.connection.readyState);
      console.log('[SALE CREATE] Using store ID:', finalStoreId);

      let totalAmount = 0;
      const populatedItems = [];

      // Process items and calculate total
      for (const item of items) {
        const totalPrice = item.quantity * item.unitPrice;
        totalAmount += totalPrice;
        
        // For manual entries
        if (item.productName) {
          populatedItems.push({
            productName: item.productName,
            serialNumber: item.serialNumber || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice,
            discount: item.discount || 0,
            isManualEntry: true
          });
        } 
        // For inventory items
        else if (item.inventory) {
          const inventoryItem = await Inventory.findById(item.inventory);
          if (!inventoryItem) {
            return res.status(404).json({
              success: false,
              message: `Inventory item with ID ${item.inventory} not found`,
            });
          }
          if (!inventoryItem.product) {
            return res.status(400).json({
              success: false,
              message: `Inventory item with ID ${item.inventory} is missing a product reference.`,
            });
          }
          if (inventoryItem.stock < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Not enough stock for ${inventoryItem.name}`,
            });
          }
          
          populatedItems.push({
            product: inventoryItem.product,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice,
            discount: item.discount || 0,
            isManualEntry: false
          });
        }
      }

      // Create new sale
      const newSale = new Sale({
        customer,
        store: finalStoreId,
        items: populatedItems,
        totalAmount,
        paymentMethod,
        paymentDetails,
        notes,
      });

      console.log('[SALE CREATE] Sale object created:', {
        customer: newSale.customer,
        store: newSale.store,
        totalAmount: newSale.totalAmount,
        itemsCount: newSale.items.length,
        paymentMethod: newSale.paymentMethod
      });

      console.log('[SALE CREATE] Attempting to save sale to MongoDB...');
      
      try {
        await newSale.save();
        console.log('[SALE CREATE] ✅ Sale saved successfully to MongoDB!');
        console.log('[SALE CREATE] Sale ID:', newSale._id);
        console.log('[SALE CREATE] Sale Number:', newSale.saleNumber);
        console.log('[SALE CREATE] Created At:', newSale.createdAt);
        
        // Verify the sale was actually saved by querying it back
        const savedSale = await Sale.findById(newSale._id);
        if (savedSale) {
          console.log('[SALE CREATE] ✅ Sale verified in database:', savedSale.saleNumber);
        } else {
          console.error('[SALE CREATE] ❌ Sale not found in database after save!');
        }
      } catch (saveError) {
        console.error('[SALE CREATE] ❌ Error saving sale to MongoDB:', saveError);
        throw saveError;
      }

      const populatedSale = await Sale.findById(newSale._id)
        .populate("customer", "name email");

      res.status(201).json({
        success: true,
        message: "Sale created successfully",
        data: populatedSale,
      });
    } catch (error) {
      console.error('[SALE CREATE ERROR]', error);
      res.status(500).json({
        success: false,
        message: "Error creating sale",
        error: error.message,
        stack: error.stack,
      });
    }
  },
);

// POST /api/sales/simple - Create a simple sale with minimal fields
router.post(
  "/simple",
  [
    body("customerName")
      .isString()
      .isLength({ min: 2, max: 50 }),
    body("productId").isMongoId(),
    body("quantity").isInt({ min: 1 }),
    body("price").isFloat({ gt: 0 }),
    body("paymentMethod").isIn(["cash", "card", "upi"]),
    body("status").optional().isIn(["completed", "pending", "cancelled"]),
    body("saleDate").optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { customerName, productId, quantity, price, paymentMethod } = req.body;
      const status = req.body.status || "completed";
      const saleDate = req.body.saleDate ? new Date(req.body.saleDate) : new Date();

      // Validate MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({
          success: false,
          message: "Database connection error",
        });
      }

      // Ensure product exists
      const product = await Product.findById(productId).select("_id");
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Find or create customer by name (minimal)
      let customer = await Customer.findOne({ name: customerName }).select("_id");
      if (!customer) {
        customer = await Customer.create({ name: customerName });
      }

      const totalAmount = Number(quantity) * Number(price);

      const newSale = new Sale({
        customer: customer._id,
        items: [
          {
            product: product._id,
            quantity: Number(quantity),
            unitPrice: Number(price),
            totalPrice: totalAmount,
            discount: 0,
            isManualEntry: false,
          },
        ],
        totalAmount,
        paymentMethod,
        paymentStatus: status,
        createdAt: saleDate,
      });

      await newSale.save();

      const populatedSale = await Sale.findById(newSale._id)
        .populate("customer", "name")
        .populate("items.product", "name brand model");

      return res.status(201).json({
        success: true,
        message: "Sale created successfully",
        data: populatedSale,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error creating simple sale",
        error: error.message,
      });
    }
  }
);

// PUT /api/sales/:id/status - Update sale status
router.put(
  "/:id/status",
  [
    param("id").isMongoId().withMessage("Invalid sale ID"),
    body("status").isIn([
      "pending",
      "completed",
      "cancelled",
      "refunded",
      "partially_refunded",
    ]),
    body("reason").optional().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const sale = await Sale.findById(req.params.id);

      if (!sale || !sale.isActive) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      const { status, reason } = req.body;

      // Handle cancellation - restore inventory
      if (status === "cancelled" && sale.status !== "cancelled") {
        for (const item of sale.items) {
          const product = await Product.findById(item.product);
          if (product) {
            await product.updateInventory(sale.store, item.quantity, "add");
          }
        }
      }

      sale.status = status;
      if (reason) {
        sale.notes =
          (sale.notes || "") + `\nStatus changed to ${status}: ${reason}`;
      }

      await sale.save();

      res.json({
        success: true,
        message: "Sale status updated successfully",
        data: sale,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating sale status",
        error: error.message,
      });
    }
  },
);

// POST /api/sales/:id/refund - Add refund to sale
router.post(
  "/:id/refund",
  [
    param("id").isMongoId().withMessage("Invalid sale ID"),
    body("amount").isFloat({ min: 0.01 }).withMessage("Refund amount required"),
    body("reason").notEmpty().trim().withMessage("Refund reason required"),
    body("processedBy").notEmpty().trim().withMessage("Processed by required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const sale = await Sale.findById(req.params.id);

      if (!sale || !sale.isActive) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      if (!sale.canBeRefunded()) {
        return res.status(400).json({
          success: false,
          message: "Sale cannot be refunded",
        });
      }

      const { amount, reason, processedBy } = req.body;

      await sale.addRefund(amount, reason, processedBy);

      res.json({
        success: true,
        message: "Refund processed successfully",
        data: sale,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// GET /api/sales/:id/warranty/:productId - Get warranty status
router.get(
  "/:id/warranty/:productId",
  [
    param("id").isMongoId().withMessage("Invalid sale ID"),
    param("productId").isMongoId().withMessage("Invalid product ID"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const sale = await Sale.findById(req.params.id);

      if (!sale || !sale.isActive) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      const warrantyStatus = sale.getWarrantyStatus(req.params.productId);

      if (!warrantyStatus) {
        return res.status(404).json({
          success: false,
          message: "Product not found in this sale",
        });
      }

      res.json({
        success: true,
        data: warrantyStatus,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error checking warranty status",
        error: error.message,
      });
    }
  },
);

// GET /api/sales/stats - Get sales statistics
router.get(
  "/stats",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("groupBy").optional().isIn(["day", "week", "month"]),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;
      
      // Build the match query
      const matchQuery = { isActive: true };
      
      if (startDate && endDate) {
        matchQuery.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Group by date
      let groupFormat;
      switch (groupBy) {
        case "day":
          groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
          break;
        case "week":
          groupFormat = { $dateToString: { format: "%Y-%W", date: "$createdAt" } };
          break;
        case "month":
          groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
          break;
        default:
          groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      }

      const stats = await Sale.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: groupFormat,
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
            itemsSold: { $sum: { $sum: "$items.quantity" } },
            sales: { $push: "$$ROOT" },
          },
        },
        {
          $addFields: {
            avgOrderValue: { $divide: ["$totalAmount", "$count"] },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("[SALES STATS ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Error fetching sales statistics",
        error: error.message,
      });
    }
  }
);

export default router;
