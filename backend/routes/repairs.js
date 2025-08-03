import express from "express";
import Repair from "../models/Repair.js";
import Customer from "../models/Customer.js";
import mongoose from "mongoose";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Get all repairs
router.get('/', async (req, res) => {
  try {
    const repairs = await Repair.find()
      .populate('customer', 'name')
      .sort({ receivedDate: -1 });
    res.json({ success: true, data: repairs });
  } catch (error) {
    console.error('Error fetching repairs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch repairs' });
  }
});

// Debug all incoming requests to repairs router
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Query params:', req.query);
  console.log('Request headers:', req.headers);
  next();
});

// Track repair by ticket number, phone number, or email
router.get('/track/status', async (req, res) => {
  console.log('\n--- Track Status Request ---');
  console.log('Query params:', req.query);
  console.log('URL:', req.originalUrl);
  console.log('Headers:', req.headers);
  
  try {
    // Manually validate query parameters
    const { ticket, phone, customerName } = req.query;
    
    // Check if at least one parameter is provided
    if (!ticket && !phone && !customerName) {
      console.log('Validation error: No search parameters provided');
      return res.status(400).json({
        success: false,
        message: 'Please provide a ticket number, phone number, or customer name'
      });
    }
    
    console.log('Processing repair tracking request with:', { 
      ticket, 
      phone: phone ? '***' : undefined, 
      customerName: customerName ? '***' : undefined
    });
    
    // Build the query based on provided parameters
    const query = {};

    // If ticket is provided, search by ticketNumber
    if (ticket) {
      query.ticketNumber = ticket;
    }
    
    // If customer name is provided, add it to the customer query
    if (customerName) {
      // If we already have a customer query, add to it, otherwise create a new one
      if (!query.customer) {
        query.customer = {};
      }
      query.customer.name = { $regex: customerName, $options: 'i' };
    }

    // If searching by phone or name, first find matching customers
    let customerIds = [];
    if (phone || customerName) {
      const customerQuery = {};
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        customerQuery.phone = { $regex: cleanPhone, $options: 'i' };
      }
      if (customerName) {
        customerQuery.name = { $regex: customerName, $options: 'i' };
      }
      const customers = await Customer.find(customerQuery).select('_id');
      customerIds = customers.map(c => c._id);
      if (customerIds.length === 0 && !ticket) {
        return res.status(404).json({
          success: false,
          message: 'No customers found with the provided details'
        });
      }
      if (customerIds.length > 0) {
        query.customer = { $in: customerIds };
      }
    }

    // If we have multiple search criteria, ensure they all match
    // (query already has the combined conditions above)

    // Find repairs with the built query
    const repairs = await Repair.find(query)
      .populate({
        path: 'customer',
        select: 'name phone email address',
        options: { allowNull: true }
      })
      .sort({ receivedDate: -1 });

    if (!repairs || repairs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No repairs found with the provided details'
      });
    }

    // Format the response
    const response = repairs.map(repair => ({
      _id: repair._id, // include MongoDB ObjectId
      ticketNumber: repair.ticketNumber,
      status: repair.status,
      device: repair.deviceType ? `${repair.deviceType} ${repair.brand || ''} ${repair.model || ''}`.trim() : 'N/A',
      issue: repair.issueDescription || 'No description provided',
      receivedDate: repair.receivedDate,
      estimatedCompletion: repair.estimatedCompletion,
      totalCost: repair.totalCost || 0,
      customer: {
        name: repair.customer?.name || 'N/A',
        phone: repair.customer?.phone || 'N/A',
        email: repair.customer?.email || 'N/A',
        address: {
          line1: repair.customer?.address?.line1 || '',
          line2: repair.customer?.address?.line2 || '',
          city: repair.customer?.address?.city || '',
          state: repair.customer?.address?.state || '',
          pincode: repair.customer?.address?.pincode || ''
        }
      }
    }));

    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Error tracking repair:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create a new repair with customer data
router.post(
  '/',
  [
    // Validate request body
    body('customer').custom((value, { req }) => {
      // Allow either customer ID or full customer object
      if (typeof value === 'string') {
        return mongoose.Types.ObjectId.isValid(value);
      } else if (typeof value === 'object') {
        return (
          value.name &&
          value.phone &&
          value.email &&
          value.address?.line1 &&
          value.address?.city &&
          value.address?.state &&
          value.address?.pincode
        );
      }
      return false;
    }).withMessage('Valid customer ID or customer details are required'),
    body('deviceType').notEmpty().withMessage('Device type is required'),
    body('brand').notEmpty().withMessage('Device brand is required'),
    body('model').notEmpty().withMessage('Device model is required'),
    body('issueDescription').notEmpty().withMessage('Issue description is required'),
    body('repairCost').optional().isNumeric().withMessage('Repair cost must be a number').default(0),
    body('partsCost').optional().isNumeric().withMessage('Parts cost must be a number').default(0),
    body('laborCost').optional().isNumeric().withMessage('Labor cost must be a number').default(0),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority level').default('medium'),
  ],
  async (req, res) => {
    try {
      // Debug: Log the incoming request data
      console.log('=== REPAIR CREATION REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Content-Type:', req.headers['content-type']);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('=== VALIDATION ERRORS ===');
        console.log('Errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed',
        });
      }

      let customer;
      const customerData = req.body.customer;

      // If customer is an ID, find the existing customer
      if (typeof customerData === 'string') {
        customer = await Customer.findById(customerData);
        if (!customer) {
          return res.status(404).json({
            success: false,
            message: 'Customer not found',
          });
        }
      } 
      // If customer is an object, find or create the customer
      else if (typeof customerData === 'object') {
        // Try to find existing customer by email or phone
        customer = await Customer.findOne({
          $or: [
            { email: customerData.email.toLowerCase() },
            { phone: customerData.phone }
          ]
        });

        // If customer exists, update their information
        if (customer) {
          customer.name = customerData.name || customer.name;
          customer.phone = customerData.phone || customer.phone;
          customer.address = { ...customer.address, ...customerData.address };
          await customer.save();
        } 
        // If customer doesn't exist, create a new one
        else {
          customer = new Customer({
            name: customerData.name,
            email: customerData.email.toLowerCase(),
            phone: customerData.phone,
            address: customerData.address
          });
          await customer.save();
        }
      }

      // Generate a unique ticket number with retry logic
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const phone = customer.phone || '';
      const last4 = phone.replace(/\D/g, '').slice(-4).padStart(4, '0');
      
      // Function to generate a potential ticket number
      const generateTicketNumber = () => {
        const random4 = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
        return `${dd}${mm}${yyyy}${last4}${random4}`;
      };
      
      // Check if the generated ticket number already exists
      let ticketNumber;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        ticketNumber = generateTicketNumber();
        const existingRepair = await Repair.findOne({ ticketNumber });
        if (!existingRepair) {
          break; // Found a unique ticket number
        }
        attempts++;
        
        // If we've tried several times and still get duplicates, add a timestamp to ensure uniqueness
        if (attempts === maxAttempts - 1) {
          ticketNumber = `${dd}${mm}${yyyy}${last4}${Date.now().toString().slice(-4)}`;
          break;
        }
      }

      // Create new repair
      const newRepair = new Repair({
        customer: customer._id,
        deviceType: req.body.deviceType,
        brand: req.body.brand,
        model: req.body.model,
        serialNumber: req.body.serialNumber,
        issueDescription: req.body.issueDescription,
        diagnosis: req.body.diagnosis || 'Pending diagnosis',
        repairCost: parseFloat(req.body.repairCost) || 0,
        partsCost: parseFloat(req.body.partsCost) || 0,
        laborCost: parseFloat(req.body.laborCost) || 0,
        status: 'received',
        priority: req.body.priority || 'medium',
        estimatedCompletion: req.body.estimatedCompletion || null,
        technician: req.body.technician || '',
        notes: req.body.notes || 'Repair created',
        ticketNumber,
      });

      // Save to database
      const savedRepair = await newRepair.save();

      // Populate customer details in the response
      const populatedRepair = await Repair.findById(savedRepair._id).populate('customer');

      // Send notifications
      let notificationResult = { whatsapp: { success: false }, email: { success: false } };
      try {
        const customerPop = populatedRepair.customer;
        const store = { name: 'Laptop Store', contact: { phone: '+91 98765 43210', email: 'info@laptopstore.com' } };
        const { sendRepairNotifications } = await import('../services/realNotificationService.js');
        notificationResult = await sendRepairNotifications(populatedRepair, customerPop, store, 'status_updated');
        console.log('Notification result:', notificationResult);
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }

      res.status(201).json({
        success: true,
        message: 'Repair created successfully',
        data: populatedRepair,
        notification: notificationResult
      });
    } catch (error) {
      console.error('Error creating repair:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A customer with this email or phone already exists',
          error: error.message,
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating repair',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// Send repair update to customer
router.post('/:repairId/send-update', async (req, res) => {
  try {
    const { repairId } = req.params;
    const { message } = req.body;

    console.log(`Sending update for repair ${repairId}`);

    // Validate repair ID
    if (!mongoose.Types.ObjectId.isValid(repairId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repair ID format'
      });
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required and cannot be empty'
      });
    }

    // Find the repair with customer details
    const repair = await Repair.findById(repairId).populate('customer');
    
    if (!repair) {
      return res.status(404).json({
        success: false,
        message: 'Repair not found'
      });
    }

    if (!repair.customer) {
      return res.status(400).json({
        success: false,
        message: 'No customer associated with this repair'
      });
    }

    const customer = repair.customer;
    const deviceInfo = `${repair.deviceType || ''} ${repair.brand || ''} ${repair.model || ''}`.trim();
    
    // Format the update message
    const formattedMessage = `🔧 Repair Update for ${deviceInfo} (Ticket #${repair.ticketNumber})\n\n` +
      `${message}\n\n` +
      `Current Status: ${repair.status.charAt(0).toUpperCase() + repair.status.slice(1).replace('_', ' ')}\n` +
      `Last Updated: ${new Date().toLocaleString()}\n\n` +
      `Thank you for choosing our service!`;

    // Send WhatsApp notification if phone exists
    let whatsappSent = false;
    if (customer.phone) {
      try {
        const { sendWhatsAppNotification } = await import('../services/whatsappService.js');
        await sendWhatsAppNotification(customer.phone, formattedMessage);
        whatsappSent = true;
        console.log('WhatsApp update sent to:', customer.phone);
      } catch (error) {
        console.error('Error sending WhatsApp update:', error);
      }
    }

    // Send email notification if email exists
    let emailSent = false;
    if (customer.email) {
      // Email notifications should be sent from the frontend using EmailJS.
      // Remove backend email sending logic.
      // Example: await emailService.sendEmail(...)
      // emailSent = true;
      // console.log('Email update sent to:', customer.email);
    }

    // Add update to repair history
    repair.updates = repair.updates || [];
    repair.updates.push({
      message: message,
      sentAt: new Date(),
      via: {
        whatsapp: whatsappSent,
        email: emailSent
      }
    });
    await repair.save();

    res.json({
      success: true,
      message: 'Repair update sent successfully',
      data: {
        whatsappSent,
        emailSent,
        update: {
          message,
          sentAt: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Error sending repair update:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending repair update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update repair status
router.put('/:repairId/status', async (req, res) => {
  try {
    const { repairId } = req.params;
    const { status, notes } = req.body;

    console.log(`Updating repair ${repairId} status to: ${status}`);

    // Validate repair ID
    if (!mongoose.Types.ObjectId.isValid(repairId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repair ID format'
      });
    }

    // Validate status
    const validStatuses = ['received', 'diagnosed', 'in_repair', 'ready_for_pickup', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Find and update the repair
    const repair = await Repair.findById(repairId).populate('customer');
    
    if (!repair) {
      return res.status(404).json({
        success: false,
        message: 'Repair not found'
      });
    }

    // Update the repair status
    repair.status = status;
    if (notes) {
      repair.notes = notes;
    }
    
    // If marking as completed/delivered, set completion date
    if (status === 'delivered') {
      repair.updatedAt = new Date();
    }

    await repair.save();

    // Send notifications if status is 'delivered' (completed)
    if (status === 'delivered' && repair.customer) {
      try {
        const customer = repair.customer;
        const deviceInfo = `${repair.deviceType || ''} ${repair.brand || ''} ${repair.model || ''}`.trim();
        const totalCost = repair.totalCost || repair.repairCost || 0;
        
        // WhatsApp notification
        if (customer.phone) {
          const whatsappMessage = `🎉 Great news ${customer.name}! 

Your ${deviceInfo} repair is COMPLETE! ✅

📋 Repair Details:
• Issue: ${repair.issueDescription || 'Not specified'}
• Total Cost: ₹${totalCost.toLocaleString()}
• Completion Date: ${new Date().toLocaleDateString()}

📍 Pickup Location: Laptop Store
📞 Contact: +91 98765 43210
⏰ Store Hours: Mon-Sat 10AM-8PM, Sun 11AM-6PM

Please bring a valid ID for pickup. Thank you for choosing Laptop Store! 🙏`;

          // Import and send WhatsApp notification
          const { sendWhatsAppNotification } = await import('../services/whatsappService.js');
          await sendWhatsAppNotification(customer.phone, whatsappMessage);
          console.log('WhatsApp notification sent to:', customer.phone);
        }

        // Email notification
        if (customer.email) {
          // Email notifications should be sent from the frontend using EmailJS.
          // Remove backend email sending logic.
          // Example: await emailService.sendEmail(...)
          // console.log('Email notification sent to:', customer.email);
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the update if notifications fail
      }
    }

    // Return updated repair
    const updatedRepair = await Repair.findById(repairId).populate('customer');
    
    res.json({
      success: true,
      message: `Repair status updated to ${status}`,
      data: {
        ticketNumber: updatedRepair._id,
        status: updatedRepair.status,
        device: updatedRepair.deviceType ? `${updatedRepair.deviceType} ${updatedRepair.brand || ''} ${updatedRepair.model || ''}`.trim() : 'N/A',
        issue: updatedRepair.issueDescription || 'No description provided',
        receivedDate: updatedRepair.receivedDate,
        estimatedCompletion: updatedRepair.estimatedCompletion,
        totalCost: updatedRepair.totalCost || 0,
        customer: {
          name: updatedRepair.customer?.name || 'N/A',
          phone: updatedRepair.customer?.phone || 'N/A',
          email: updatedRepair.customer?.email || 'N/A',
          address: {
            line1: updatedRepair.customer?.address?.line1 || '',
            line2: updatedRepair.customer?.address?.line2 || '',
            city: updatedRepair.customer?.address?.city || '',
            state: updatedRepair.customer?.address?.state || '',
            pincode: updatedRepair.customer?.address?.pincode || ''
          }
        }
      }
    });

  } catch (error) {
    console.error('Error updating repair status:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the repair status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update repair price
router.put('/:id/price', async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repair ID format'
      });
    }

    if (price === undefined || isNaN(parseFloat(price))) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    const repair = await Repair.findById(id);
    if (!repair) {
      return res.status(404).json({
        success: false,
        message: 'Repair not found'
      });
    }

    // Create price history entry
    const priceHistoryEntry = {
      repairCost: parseFloat(price),
      partsCost: repair.partsCost || 0,
      laborCost: repair.laborCost || 0,
      totalCost: parseFloat(price) + (repair.partsCost || 0) + (repair.laborCost || 0),
      updatedAt: new Date(),
      updatedBy: req.user?._id || null
    };

    // Update repair with new price and history
    const updatedRepair = await Repair.findByIdAndUpdate(
      id,
      {
        $set: {
          repairCost: parseFloat(price),
          totalCost: priceHistoryEntry.totalCost,
          updatedAt: new Date()
        },
        $push: { priceHistory: priceHistoryEntry }
      },
      { new: true }
    ).populate('customer');

    res.json({
      success: true,
      message: 'Repair price updated successfully',
      data: updatedRepair
    });
  } catch (error) {
    console.error('Error updating repair price:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating repair price',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark repair as completed
router.post('/:id/complete', async (req, res) => {
  console.log('\n=== Complete Repair Request ===');
  console.log('Headers:', req.headers);
  console.log('Params:', req.params);
  
  try {
    const { id } = req.params;
    console.log('Processing repair completion for ID:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repair ID format'
      });
    }

    console.log('Updating repair status to completed...');
    // Find and update the repair
    const repair = await Repair.findByIdAndUpdate(
      id,
      { 
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).populate('customer');
    
    console.log('Repair update result:', {
      _id: repair?._id,
      status: repair?.status,
      customerId: repair?.customer?._id,
      customerEmail: repair?.customer?.email,
      customerPhone: repair?.customer?.phone
    });

    if (!repair) {
      return res.status(404).json({
        success: false,
        message: 'Repair not found'
      });
    }

    // Send notifications
    try {
      const customer = repair.customer;
      if (!customer) {
        console.error('No customer data found for repair:', repair._id);
        throw new Error('No customer data found');
      }

      console.log('Sending notifications for repair:', {
        repairId: repair._id,
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        }
      });

      const deviceInfo = `${repair.deviceType || 'Device'} ${repair.brand || ''} ${repair.model || ''}`.trim();
      const totalCost = repair.totalCost || 0;

      // WhatsApp notification
      if (customer?.phone) {
        try {
          const whatsappMessage = `🛠️ *Repair Completed* 🎉\n\n` +
            `Hello ${customer.name || 'there'},\n\n` +
            `Your ${deviceInfo} repair is now complete and ready for pickup!\n\n` +
            `📋 *Repair Details*\n` +
            `• Device: ${deviceInfo}\n` +
            `• Issue: ${repair.issueDescription || 'Not specified'}\n` +
            `• Total Cost: ₹${totalCost.toLocaleString()}\n` +
            `• Completion Date: ${new Date().toLocaleDateString()}\n\n` +
            `📍 *Pickup Location*\n` +
            `Laptop Store\n` +
            `📞 +91 98765 43210\n` +
            `⏰ Mon-Sat 10AM-8PM, Sun 11AM-6PM\n\n` +
            `Please bring a valid ID for pickup. Thank you for choosing Laptop Store! 🙏`;

          console.log('Sending WhatsApp to:', customer.phone);
          const { sendWhatsAppNotification } = await import('../services/whatsappService.js');
          const whatsappResult = await sendWhatsAppNotification(customer.phone, whatsappMessage);
          console.log('WhatsApp notification result:', whatsappResult);
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError);
          throw whatsappError;
        }
      } else {
        console.log('No phone number available for WhatsApp notification');
      }

      // Email notification
      if (customer?.email) {
        // Email notifications should be sent from the frontend using EmailJS.
        // Remove backend email sending logic.
        // Example: await emailService.sendEmail(...)
        // console.log('Email notification sent to:', customer.email);
      } else {
        console.log('No email address available for email notification');
      }
    } catch (notificationError) {
      console.error('Error in notification process:', {
        error: notificationError.message,
        stack: notificationError.stack
      });
      // Don't fail the request if notifications fail
    }

    // Return success response
    res.json({
      success: true,
      message: 'Repair marked as completed and customer notified',
      data: {
        ticketNumber: repair._id,
        status: 'completed',
        completedAt: repair.completedAt
      }
    });

  } catch (error) {
    console.error('Error completing repair:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking the repair as completed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
