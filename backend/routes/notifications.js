import express from "express";
import { body, param, query, validationResult } from "express-validator";
import { sendRepairNotifications } from "../services/realNotificationService.js";
import Repair from "../models/Repair.js";
import Customer from "../models/Customer.js";
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

// GET /api/notifications/test - Test notification services
router.get("/test", async (req, res) => {
  try {
    // Check environment variables
    const requiredEnvVars = [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_FROM",
      "EMAIL_HOST",
      "EMAIL_PORT",
      "EMAIL_USER",
      "EMAIL_PASS",
    ];

    const missingVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );

    const status = {
      environment: {
        allVariablesSet: missingVars.length === 0,
        missingVariables: missingVars,
      },
      services: {
        whatsapp: {
          configured: !!(
            process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_WHATSAPP_FROM
          ),
          accountSid: process.env.TWILIO_ACCOUNT_SID ? "Set" : "Missing",
          authToken: process.env.TWILIO_AUTH_TOKEN ? "Set" : "Missing",
          fromNumber: process.env.TWILIO_WHATSAPP_FROM || "Missing",
        },
        email: {
          configured: !!(
            process.env.EMAIL_HOST &&
            process.env.EMAIL_PORT &&
            process.env.EMAIL_USER &&
            process.env.EMAIL_PASS
          ),
          host: process.env.EMAIL_HOST || "Missing",
          port: process.env.EMAIL_PORT || "Missing",
          user: process.env.EMAIL_USER ? "Set" : "Missing",
          pass: process.env.EMAIL_PASS ? "Set" : "Missing",
        },
      },
    };

    res.json({
      success: true,
      message: "Notification service status",
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking notification services",
      error: error.message,
    });
  }
});

// POST /api/notifications/test-send - Send test notifications
router.post(
  "/test-send",
  [
    body("whatsappNumber")
      .matches(/^\+?[\d\s-()]{10,15}$/)
      .withMessage("Valid WhatsApp number is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("type").optional().isIn(["whatsapp", "email", "both"]),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { whatsappNumber, email, type = "both" } = req.body;

      // Create mock data for testing
      const mockRepair = {
        ticketNumber: "TEST-" + Date.now(),
        status: "completed",
        device: {
          brand: "Test Brand",
          model: "Test Model",
        },
        problemDescription: "Test repair for notification system",
        contactInfo: {
          whatsappNumber,
          notificationEmail: email,
          consentGiven: true,
        },
        createdAt: new Date(),
      };

      const mockCustomer = {
        name: "Test Customer",
        email,
        phone: whatsappNumber,
      };

      const mockStore = {
        name: "Test Store",
        contact: {
          phone: "+91 98765 43210",
          email: "test@store.com",
        },
        address: {
          street: "123 Test Street",
          city: "Test City",
          state: "Test State",
          zipCode: "123456",
        },
      };

      const results = await sendRepairNotifications(
        mockRepair,
        mockCustomer,
        mockStore,
        "test",
      );

      res.json({
        success: true,
        message: "Test notifications sent",
        data: {
          results,
          sentTo: {
            whatsapp:
              type === "whatsapp" || type === "both" ? whatsappNumber : null,
            email: type === "email" || type === "both" ? email : null,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error sending test notifications",
        error: error.message,
      });
    }
  },
);

// POST /api/notifications/repair/:repairId - Send repair notification
router.post(
  "/repair/:repairId",
  [
    param("repairId").isMongoId().withMessage("Invalid repair ID"),
    body("type").isIn([
      "created",
      "status_updated",
      "completed",
      "ready_for_pickup",
      "custom",
    ]),
    body("customMessage").optional().trim(),
    body("force").optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const repair = await Repair.findById(req.params.repairId)
        .populate("customer", "name email phone")
        .populate("store", "name code address contact");

      if (!repair || !repair.isActive) {
        return res.status(404).json({
          success: false,
          message: "Repair not found",
        });
      }

      const { type, customMessage, force = false } = req.body;

      // Check consent unless forced
      if (!force && !repair.canSendNotification()) {
        return res.status(400).json({
          success: false,
          message:
            "Customer has not given consent for notifications or contact information is missing",
        });
      }

      const results = await sendRepairNotifications(
        repair,
        repair.customer,
        repair.store,
        type,
        customMessage,
      );

      // Update repair timeline
      repair.timeline.push({
        status: repair.status,
        timestamp: new Date(),
        updatedBy: "System",
        notes: `${type} notification sent`,
        notificationSent: true,
      });

      await repair.save();

      res.json({
        success: true,
        message: "Repair notification sent successfully",
        data: {
          repairId: repair._id,
          ticketNumber: repair.ticketNumber,
          results,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error sending repair notification",
        error: error.message,
      });
    }
  },
);

// POST /api/notifications/bulk-repair - Send bulk repair notifications
router.post(
  "/bulk-repair",
  [
    body("repairIds").isArray({ min: 1 }).withMessage("Repair IDs required"),
    body("repairIds.*").isMongoId().withMessage("Valid repair IDs required"),
    body("type").isIn([
      "status_updated",
      "completed",
      "ready_for_pickup",
      "custom",
    ]),
    body("customMessage").optional().trim(),
    body("force").optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { repairIds, type, customMessage, force = false } = req.body;

      const repairs = await Repair.find({
        _id: { $in: repairIds },
        isActive: true,
      })
        .populate("customer", "name email phone")
        .populate("store", "name code address contact");

      if (repairs.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No valid repairs found",
        });
      }

      const results = [];

      for (const repair of repairs) {
        try {
          // Check consent unless forced
          if (!force && !repair.canSendNotification()) {
            results.push({
              repairId: repair._id,
              ticketNumber: repair.ticketNumber,
              success: false,
              error: "No notification consent",
            });
            continue;
          }

          const notificationResults = await sendRepairNotifications(
            repair,
            repair.customer,
            repair.store,
            type,
            customMessage,
          );

          // Update repair timeline
          repair.timeline.push({
            status: repair.status,
            timestamp: new Date(),
            updatedBy: "System",
            notes: `Bulk ${type} notification sent`,
            notificationSent: true,
          });

          await repair.save();

          results.push({
            repairId: repair._id,
            ticketNumber: repair.ticketNumber,
            success: true,
            results: notificationResults,
          });
        } catch (error) {
          results.push({
            repairId: repair._id,
            ticketNumber: repair.ticketNumber,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        message: `Bulk notifications completed: ${successCount} successful, ${failureCount} failed`,
        data: {
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
          },
          results,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error sending bulk notifications",
        error: error.message,
      });
    }
  },
);

// GET /api/notifications/history/:repairId - Get notification history for repair
router.get(
  "/history/:repairId",
  [param("repairId").isMongoId().withMessage("Invalid repair ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const repair = await Repair.findById(req.params.repairId);

      if (!repair || !repair.isActive) {
        return res.status(404).json({
          success: false,
          message: "Repair not found",
        });
      }

      const notificationHistory = repair.timeline.filter(
        (entry) => entry.notificationSent,
      );

      res.json({
        success: true,
        data: {
          repairId: repair._id,
          ticketNumber: repair.ticketNumber,
          notificationHistory,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching notification history",
        error: error.message,
      });
    }
  },
);

export default router;
