import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  line1: {
    type: String,
    required: true
  },
  line2: String,
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  }
});

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: addressSchema,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add text index for search functionality
customerSchema.index({ 
  name: 'text',
  email: 'text',
  'phone': 'text',
  'address.line1': 'text',
  'address.city': 'text',
  'address.state': 'text',
  'address.pincode': 'text'
});

// Update the updatedAt field before saving
customerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method for searching customers
customerSchema.statics.search = async function(searchTerm, page = 1, limit = 20) {
  const query = searchTerm
    ? { $text: { $search: searchTerm } }
    : {};

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 }
  };

  try {
    const customers = await this.find(query)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    const total = await this.countDocuments(query);

    return {
      customers,
      total,
      page: options.page,
      totalPages: Math.ceil(total / options.limit)
    };
  } catch (error) {
    console.error('Error searching customers:', error);
    throw error;
  }
};

// Add static method to find customer by email
customerSchema.statics.findByEmail = async function(email) {
  try {
    return await this.findOne({ email });
  } catch (error) {
    console.error('Error finding customer by email:', error);
    throw error;
  }
};

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
