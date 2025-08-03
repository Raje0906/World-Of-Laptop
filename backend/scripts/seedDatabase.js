import mongoose from "mongoose";
import dotenv from "dotenv";
import Store from "../models/Store.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Repair from "../models/Repair.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

dotenv.config();

// Sample data
const storesData = [
  {
    name: "Laptop Store - Central",
    code: "CENTRAL",
    address: {
      street: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400001",
      country: "India",
    },
    contact: {
      phone: "+91 98765 43210",
      email: "central@laptopstore.com",
      whatsapp: "+91 98765 43210",
    },
    manager: {
      name: "Rajesh Kumar",
      phone: "+91 98765 43211",
      email: "rajesh@laptopstore.com",
    },
    branding: {
      primaryColor: "#3b82f6",
      theme: "blue",
    },
  },
  {
    name: "Laptop Store - North",
    code: "NORTH",
    address: {
      street: "456 Innovation Plaza",
      city: "Delhi",
      state: "Delhi",
      zipCode: "110001",
      country: "India",
    },
    contact: {
      phone: "+91 98765 43220",
      email: "north@laptopstore.com",
      whatsapp: "+91 98765 43220",
    },
    manager: {
      name: "Priya Sharma",
      phone: "+91 98765 43221",
      email: "priya@laptopstore.com",
    },
    branding: {
      primaryColor: "#10b981",
      theme: "green",
    },
  },
  {
    name: "Laptop Store - South",
    code: "SOUTH",
    address: {
      street: "789 Tech Hub",
      city: "Bangalore",
      state: "Karnataka",
      zipCode: "560001",
      country: "India",
    },
    contact: {
      phone: "+91 98765 43230",
      email: "south@laptopstore.com",
      whatsapp: "+91 98765 43230",
    },
    manager: {
      name: "Arjun Reddy",
      phone: "+91 98765 43231",
      email: "arjun@laptopstore.com",
    },
    branding: {
      primaryColor: "#f59e0b",
      theme: "orange",
    },
  },
];

const customersData = [
  {
    name: "Amit Singh",
    email: "amit.singh@email.com",
    phone: "+91 98765 00001",
    address: {
      line1: "101 Park Avenue",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    customerType: "individual",
    loyaltyPoints: 150,
  },
  {
    name: "Neha Patel",
    email: "neha.patel@email.com",
    phone: "+91 98765 00002",
    address: {
      line1: "202 Garden Street",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
    },
    customerType: "individual",
    loyaltyPoints: 75,
  },
  {
    name: "TechCorp Solutions",
    email: "contact@techcorp.com",
    phone: "+91 98765 00003",
    address: {
      line1: "303 Business Center",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
    },
    customerType: "business",
    loyaltyPoints: 500,
  },
];

const productsData = [
  {
    name: "Dell Inspiron 15 3000",
    brand: "Dell",
    model: "Inspiron 15 3000",
    category: "laptop",
    sku: "DELL-INS-15-3000",
    barcode: "123456789001",
    specifications: {
      processor: "Intel Core i5-1135G7",
      ram: "8GB DDR4",
      storage: "512GB SSD",
      graphics: "Intel Iris Xe",
      display: '15.6" FHD',
      os: "Windows 11 Home",
      battery: "3-cell 42WHr",
      weight: "1.83 kg",
    },
    pricing: {
      costPrice: 35000,
      sellingPrice: 42000,
      mrp: 45000,
      discount: 6.67,
    },
    cost: 35000,
    price: 42000,
    description: "Reliable everyday laptop for work and study",
    tags: ["bestseller", "student", "office"],
  },
  {
    name: "HP Pavilion Gaming 15",
    brand: "HP",
    model: "Pavilion Gaming 15",
    category: "laptop",
    sku: "HP-PAV-GAME-15",
    barcode: "123456789002",
    specifications: {
      processor: "AMD Ryzen 5 5600H",
      ram: "16GB DDR4",
      storage: "512GB SSD",
      graphics: "NVIDIA GTX 1650",
      display: '15.6" FHD 144Hz',
      os: "Windows 11 Home",
      battery: "4-cell 52.5WHr",
      weight: "2.23 kg",
    },
    pricing: {
      costPrice: 55000,
      sellingPrice: 65000,
      mrp: 70000,
      discount: 7.14,
    },
    cost: 55000,
    price: 65000,
    description: "Gaming laptop with excellent performance",
    tags: ["gaming", "performance", "popular"],
  },
  {
    name: "MacBook Air M2",
    brand: "Apple",
    model: "MacBook Air M2",
    category: "laptop",
    sku: "APPLE-MBA-M2",
    barcode: "123456789003",
    specifications: {
      processor: "Apple M2",
      ram: "8GB Unified Memory",
      storage: "256GB SSD",
      graphics: "8-core GPU",
      display: '13.6" Liquid Retina',
      os: "macOS Monterey",
      battery: "Up to 18 hours",
      weight: "1.24 kg",
    },
    pricing: {
      costPrice: 95000,
      sellingPrice: 115000,
      mrp: 119900,
      discount: 4.09,
    },
    cost: 95000,
    price: 115000,
    description: "Ultra-portable laptop with M2 chip",
    tags: ["premium", "ultrabook", "apple"],
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await Promise.all([
      Store.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Sale.deleteMany({}),
      Repair.deleteMany({}),
      User.deleteMany({}), // Clear existing users
    ]);

    // Create stores
    console.log("🏪 Creating stores...");
    const stores = await Store.insertMany(storesData);
    console.log(`✅ Created ${stores.length} stores`);

    // Create customers
    console.log("👥 Creating customers...");
    const customersWithStores = customersData.map((customer, index) => ({
      ...customer,
      preferredStore: stores[index % stores.length]._id,
    }));
    const customers = await Customer.insertMany(customersWithStores);
    console.log(`✅ Created ${customers.length} customers`);

    // Create products
    console.log("📦 Creating products...");
    const products = await Product.insertMany(productsData);
    console.log(`✅ Created ${products.length} products`);

    // Create inventory for each product and store
    console.log("🏷️ Creating inventory...");
    const Inventory = (await import('../models/Inventory.js')).default;
    let inventoryItems = [];
    for (const product of products) {
      for (const store of stores) {
        inventoryItems.push({
          name: product.name,
          brand: product.brand,
          category: product.category,
          product: product._id,
          stock: Math.floor(Math.random() * 50) + 10,
          price: product.pricing ? product.pricing.sellingPrice : 0,
          lowStockThreshold: 5,
          store: store.name,
          description: product.description || '',
          sku: product.sku,
          isActive: true,
        });
      }
    }
    await Inventory.insertMany(inventoryItems);
    console.log(`✅ Created ${inventoryItems.length} inventory items`);

    // Create sample sales
    console.log("💰 Creating sample sales...");
    const salesData = [];
    for (let i = 0; i < 10; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const store = stores[Math.floor(Math.random() * stores.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;

      const subtotal = product.pricing.sellingPrice * quantity;
      const taxAmount = subtotal * 0.18; // 18% tax
      const totalAmount = subtotal + taxAmount;

      salesData.push({
        customer: customer._id,
        store: store._id,
        items: [
          {
            product: product._id,
            quantity,
            unitPrice: product.pricing.sellingPrice,
            totalPrice: product.pricing.sellingPrice * quantity,
            warranty: {
              startDate: new Date(),
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            },
          },
        ],
        subtotal,
        taxAmount,
        totalAmount,
        paymentMethod: ["cash", "card", "upi"][Math.floor(Math.random() * 3)],
        status: "completed",
        salesPerson: {
          name: "Sales Agent",
          id: "SA001",
        },
      });
    }

    const sales = await Sale.insertMany(salesData);
    console.log(`✅ Created ${sales.length} sales`);

    // Create sample repairs
    console.log("🔧 Creating sample repairs...");
    const repairsData = [];
    const deviceTypes = ["laptop", "desktop", "tablet"];
    const statuses = [
      "received",
      "diagnosed",
      "in_progress",
      "completed",
      "ready_for_pickup",
    ];
    const priorities = ["low", "normal", "high"];

    for (let i = 0; i < 15; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const store = stores[Math.floor(Math.random() * stores.length)];
      const deviceType =
        deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority =
        priorities[Math.floor(Math.random() * priorities.length)];

      repairsData.push({
        customer: customer._id,
        store: store._id,
        device: {
          type: deviceType,
          brand: ["Dell", "HP", "Lenovo", "Apple"][
            Math.floor(Math.random() * 4)
          ],
          model: `Model ${i + 1}`,
          serialNumber: `SN${Date.now()}${i}`,
        },
        problemDescription: [
          "Screen not working properly",
          "Battery not charging",
          "Keyboard keys not responding",
          "Overheating issues",
          "Blue screen errors",
        ][Math.floor(Math.random() * 5)],
        status,
        priority,
        contactInfo: {
          whatsappNumber: customer.phone,
          notificationEmail: customer.email,
          consentGiven: Math.random() > 0.2, // 80% consent rate
          consentDate: new Date(),
        },
        costs: {
          estimatedCost: Math.floor(Math.random() * 5000) + 1000,
          partsCost: Math.floor(Math.random() * 3000) + 500,
          laborCost: Math.floor(Math.random() * 2000) + 500,
        },
        assignedTechnician: {
          name: ["Raj Technician", "Priya Engineer", "Arjun Expert"][
            Math.floor(Math.random() * 3)
          ],
          id: `TECH${String(i + 1).padStart(3, "0")}`,
          specialization: deviceType,
        },
      });
    }

    const repairs = await Repair.insertMany(repairsData);
    console.log(`✅ Created ${repairs.length} repairs`);

    // Create default admin user
    console.log("👤 Creating default admin user...");
    const hashedPassword = await bcrypt.hash("Admin@12345", 10);
    const adminUser = new User({
      name: "Admin",
      email: "admin@laptopstore.com",
      phone: "+91 99999 99999",
      password: hashedPassword,
      role: "admin",
      isActive: true
    });
    await adminUser.save();
    console.log("✅ Created default admin user: admin@laptopstore.com / Admin@12345");

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`• ${stores.length} stores`);
    console.log(`• ${customers.length} customers`);
    console.log(`• ${products.length} products`);
    console.log(`• ${sales.length} sales`);
    console.log(`• ${repairs.length} repairs`);
    console.log(`• 1 default admin user`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();
