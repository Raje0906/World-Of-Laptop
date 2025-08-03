import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
}, { _id: false });

const managerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
}, { _id: false });

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Store name is required'],
    trim: true
  },
  address: {
    type: addressSchema,
    required: true
  },
  contact: {
    phone: String,
    email: String,
    whatsapp: String,
  },
  manager: {
    type: managerSchema,
    required: true
  },
  branding: {
    primaryColor: String,
    theme: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
storeSchema.index({ name: 1 });
storeSchema.index({ status: 1 });

// Static method to search stores
storeSchema.statics.search = async function(searchTerm, page = 1, limit = 20) {
  try {
    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { 'address.street': { $regex: searchTerm, $options: 'i' } },
        { 'address.city': { $regex: searchTerm, $options: 'i' } },
        { 'address.state': { $regex: searchTerm, $options: 'i' } },
        { 'address.zipCode': { $regex: searchTerm, $options: 'i' } },
        { 'address.country': { $regex: searchTerm, $options: 'i' } },
        { 'contact.email': { $regex: searchTerm, $options: 'i' } },
        { 'contact.phone': { $regex: searchTerm, $options: 'i' } },
        { 'contact.whatsapp': { $regex: searchTerm, $options: 'i' } },
        { 'manager.name': { $regex: searchTerm, $options: 'i' } },
        { 'manager.email': { $regex: searchTerm, $options: 'i' } },
        { 'manager.phone': { $regex: searchTerm, $options: 'i' } },
      ]
    };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { name: 1 },
      collation: { locale: 'en', strength: 2 }
    };

    return await this.paginate(query, options);
  } catch (error) {
    console.error('Error searching stores:', error);
    throw error;
  }
};

// Static method to find active stores
storeSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ name: 1 });
};

const Store = mongoose.model('Store', storeSchema);

export default Store;