import mongoose from 'mongoose';
import Customer from './models/Customer.js';
import Repair from './models/Repair.js';

const connectDB = async () => {
  const mongoUri = 'mongodb://localhost:27017/laptop-store';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createRepairsForExistingCustomers = async () => {
  try {
    await connectDB();
    
    // Get all existing customers
    const customers = await Customer.find({});
    console.log(`Found ${customers.length} existing customers:`);
    
    customers.forEach(customer => {
      console.log(`- ${customer.name} (${customer.email}) - ${customer.phone}`);
    });
    
    if (customers.length === 0) {
      console.log('No customers found in database. Please add customers first.');
      process.exit(0);
    }
    
    // Create repairs for each customer
    const repairStatuses = ['received', 'diagnosed', 'in_repair', 'ready_for_pickup', 'delivered'];
    const deviceTypes = ['laptop', 'desktop', 'tablet', 'mobile'];
    const brands = ['Dell', 'HP', 'Lenovo', 'Apple', 'Samsung', 'Asus'];
    const issues = [
      'Screen not working properly',
      'Battery not charging',
      'Keyboard keys not responding',
      'Overheating issues',
      'Blue screen errors',
      'Slow performance',
      'WiFi connectivity issues',
      'Hard drive failure'
    ];
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      // Create 1-3 repairs per customer
      const numRepairs = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < numRepairs; j++) {
        const status = repairStatuses[Math.floor(Math.random() * repairStatuses.length)];
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const issue = issues[Math.floor(Math.random() * issues.length)];
        
        const repair = new Repair({
          customer: customer._id,
          deviceType: deviceType,
          brand: brand,
          model: `${brand} Model ${i + 1}${j + 1}`,
          issueDescription: issue,
          diagnosis: `Diagnosis for ${issue.toLowerCase()}`,
          repairCost: Math.floor(Math.random() * 8000) + 2000,
          partsCost: Math.floor(Math.random() * 5000) + 1000,
          laborCost: Math.floor(Math.random() * 3000) + 500,
          status: status,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          estimatedCompletion: new Date(Date.now() + (Math.floor(Math.random() * 14) + 3) * 24 * 60 * 60 * 1000),
          technician: ['Raj Technician', 'Priya Engineer', 'Arjun Expert'][Math.floor(Math.random() * 3)],
          notes: `Repair for ${customer.name}'s ${deviceType}`,
          receivedDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        });
        
        await repair.save();
        console.log(`Created repair ${repair._id} for ${customer.name} - Status: ${status}`);
      }
    }
    
    console.log('\n✅ Successfully created repairs for all existing customers!');
    console.log('\nYou can now test repair tracking with any of these emails/phones:');
    customers.forEach(customer => {
      console.log(`- Email: ${customer.email}`);
      console.log(`- Phone: ${customer.phone}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createRepairsForExistingCustomers(); 