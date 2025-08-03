import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: function() {
      // Store ID is required for all users except admin
      return this.role !== 'admin';
    }
  },
  role: {
    type: String,
    enum: ['admin', 'store manager', 'sales', 'engineer'],
    required: [true, 'Role is required'],
    default: 'sales'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Add text index for search functionality
userSchema.index({ 
  name: 'text',
  email: 'text',
  phone: 'text'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email or phone
userSchema.statics.findByEmailOrPhone = async function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  }).populate('store_id', 'name address');
};

// Static method to search users
userSchema.statics.search = async function(searchTerm, page = 1, limit = 20) {
  const query = searchTerm
    ? { $text: { $search: searchTerm } }
    : {};

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { created_at: -1 }
  };

  try {
    const users = await this.find(query)
      .populate('store_id', 'name address')
      .sort({ created_at: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select('-password'); // Exclude password from results

    const total = await this.countDocuments(query);

    return {
      users,
      total,
      page: options.page,
      totalPages: Math.ceil(total / options.limit)
    };
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Method to get user data without password
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model('User', userSchema);

export default User; 