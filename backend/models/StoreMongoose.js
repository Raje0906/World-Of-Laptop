import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Store name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Store address is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  manager: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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
storeSchema.index({ 
  name: 'text',
  address: 'text',
  manager: 'text'
});

// Static method to search stores
storeSchema.statics.search = async function(searchTerm, page = 1, limit = 20) {
  const query = searchTerm
    ? { $text: { $search: searchTerm } }
    : {};

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { created_at: -1 }
  };

  try {
    const stores = await this.find(query)
      .sort({ created_at: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    const total = await this.countDocuments(query);

    return {
      stores,
      total,
      page: options.page,
      totalPages: Math.ceil(total / options.limit)
    };
  } catch (error) {
    console.error('Error searching stores:', error);
    throw error;
  }
};

// Static method to find active stores
storeSchema.statics.findActive = async function() {
  return this.find({ status: 'active' }).sort({ name: 1 });
};

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

export default Store; 