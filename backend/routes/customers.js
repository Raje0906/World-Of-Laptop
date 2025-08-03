import express from "express";
import { body, param, query, validationResult } from "express-validator";
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

// GET /api/customers - Get all customers with pagination and search
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const skip = (page - 1) * limit;

      // Build the search query
      let query = {};
      if (search) {
        console.log(`🔍 Searching customers with query: ${search}`);
        
        // Create a case-insensitive regex pattern
        const searchRegex = new RegExp(search, 'i');
        
        // More flexible search across multiple fields
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { 'address.line1': { $regex: search, $options: 'i' } },
          { 'address.city': { $regex: search, $options: 'i' } },
          { 'address.state': { $regex: search, $options: 'i' } },
          { 'address.pincode': { $regex: search, $options: 'i' } }
        ];
        
        console.log('Generated MongoDB query:', JSON.stringify(query, null, 2));
        
        // Also log the actual query being executed
        console.log('Executing find with:', {
          query: query,
          skip: skip,
          limit: limit,
          sort: { createdAt: -1 }
        });
      }

      // Get total count and paginated results
      const [total, customers] = await Promise.all([
        Customer.countDocuments(query),
        Customer.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        data: customers,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching customers"
      });
    }
  }
);

// GET /api/customers/search - Search for customers by email or phone
router.get(
  "/search",
  [
    query("email").optional().isEmail().normalizeEmail(),
    query("phone").optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, phone } = req.query;
      
      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          message: "Either email or phone must be provided"
        });
      }
      
      const query = {};
      if (email) query.email = email.toLowerCase();
      if (phone) query.phone = phone;
      
      const customers = await Customer.find(query).limit(1).lean();
      
      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({
        success: false,
        message: "Error searching customers"
      });
    }
  }
);

// POST /api/customers - Create a new customer or return existing one
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Please enter a valid email"),
    body("phone").trim().notEmpty().withMessage("Phone number is required"),
    body("address.line1").trim().notEmpty().withMessage("Address line 1 is required"),
    body("address.city").trim().notEmpty().withMessage("City is required"),
    body("address.state").trim().notEmpty().withMessage("State is required"),
    body("address.pincode").trim().notEmpty().withMessage("Pincode is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, phone, address } = req.body;
      
      // Check if customer with this email already exists
      let customer = await Customer.findOne({ email: email.toLowerCase() });
      
      if (customer) {
        // Update customer info if it exists
        customer.name = name || customer.name;
        customer.phone = phone || customer.phone;
        customer.address = { ...customer.address, ...address };
        customer.updatedAt = new Date();
        
        await customer.save();
        
        return res.status(200).json({
          success: true,
          message: "Customer updated successfully",
          data: customer
        });
      }
      
      // Create new customer if doesn't exist
      const customerData = {
        name,
        email: email.toLowerCase(),
        phone,
        address
      };
      
      // Create new customer
      const newCustomer = await Customer.create(customerData);
      
      if (!newCustomer) {
        throw new Error("Failed to create customer");
      }

      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: newCustomer
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error creating customer"
      });
    }
  }
);

// GET /api/customers/stats - Get customer statistics
router.get(
  "/stats",
  async (req, res) => {
    try {
      const Customer = (await import("../models/Customer.js")).default;
      const Sale = (await import("../models/Sale.js")).default;

      const [totalCustomers, activeCustomers] = await Promise.all([
        Customer.countDocuments({}),
        Customer.countDocuments({ status: "active" })
      ]);

      // Aggregate total revenue from sales
      const salesAgg = await Sale.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
      ]);
      const totalRevenue = salesAgg[0]?.totalRevenue || 0;
      const averageSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

      res.json({
        success: true,
        data: {
          totalCustomers,
          activeCustomers,
          totalRevenue,
          averageSpend
        }
      });
    } catch (error) {
      console.error("Error fetching customer stats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching customer stats"
      });
    }
  }
);

// GET /api/customers/:id - Get a single customer by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid customer ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const customer = await Customer.findById(req.params.id);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      
      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching customer"
      });
    }
  }
);

// PUT /api/customers/:id - Update a customer
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid customer ID"),
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().withMessage("Invalid email"),
    body("phone").optional().notEmpty().withMessage("Phone number cannot be empty"),
    body("address").optional().isObject().withMessage("Address must be an object"),
    body("address.line1").if(body('address').exists()).notEmpty().withMessage("Address line 1 is required"),
    body("address.city").if(body('address').exists()).notEmpty().withMessage("City is required"),
    body("address.state").if(body('address').exists()).notEmpty().withMessage("State is required"),
    body("address.pincode").if(body('address').exists()).notEmpty().withMessage("Pincode is required")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check if customer exists
      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      
      // Check for duplicate email if email is being updated
      if (updates.email && updates.email !== customer.email) {
        const existingEmail = await Customer.findOne({ email: updates.email });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "A customer with this email already exists"
          });
        }
      }
      
      // Check for duplicate phone if phone is being updated
      if (updates.phone && updates.phone !== customer.phone) {
        const existingPhone = await Customer.findOne({ phone: updates.phone });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: "A customer with this phone number already exists"
          });
        }
      }
      
      // Update customer
      const updatedCustomer = await Customer.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
      
      res.json({
        success: true,
        message: "Customer updated successfully",
        data: updatedCustomer
      });
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error updating customer"
      });
    }
  }
);

// DELETE /api/customers/:id - Delete a customer
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid customer ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if customer exists
      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      
      // Delete the customer
      await Customer.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: "Customer deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error deleting customer"
      });
    }
  }
);

export default router;
