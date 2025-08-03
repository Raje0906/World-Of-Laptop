import mongoose from 'mongoose';

// Define the update history schema
const updateHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['stock', 'price', 'status', 'other'],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  note: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  model: {
    type: String,
    trim: true,
    default: ''
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
    default: function() {
      return `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be a positive number']
  },
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost must be a positive number']
  },
  stock_quantity: {
    type: Number,
    default: 0,
    min: [0, 'Stock quantity cannot be negative']
  },
  min_stock_level: {
    type: Number,
    default: 5,
    min: [0, 'Minimum stock level cannot be negative']
  },
  description: {
    type: String,
    default: ''
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  warranty_period: {
    type: Number,
    default: 12, // months
    min: [0, 'Warranty period cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  
  // Track update history
  update_history: [updateHistorySchema],
  
  // Track creation and updates
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

// Add text index for search
productSchema.index({
  name: 'text',
  brand: 'text',
  model: 'text',
  description: 'text'
});

// Static method to search products
productSchema.statics.search = async function(query) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

const Product = mongoose.model('Product', productSchema);

class ProductModel {
  static create(productData) {
    const product = new Product(productData);
    return product.save();
    const stmt = db.prepare(`
      INSERT INTO products (
        name, brand, model, category, price, cost, stock_quantity,
        min_stock_level, description, specifications, warranty_period, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name, brand, model, category, price, cost, stock_quantity || 0,
      min_stock_level || 5, description, specifications, warranty_period || 12, status || 'active'
    );
    
    return this.findById(result.lastInsertRowid);
  }

  static findAll(page = 1, limit = 20, search = '', category = '') {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM products';
    let countQuery = 'SELECT COUNT(*) as total FROM products';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(name LIKE ? OR brand LIKE ? OR model LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = db.prepare(query).all(...params);
    const countParams = params.slice(0, -2); // Remove limit and offset for count
    const totalResult = db.prepare(countQuery).get(...countParams);
    
    return {
      products,
      total: totalResult.total,
      page,
      totalPages: Math.ceil(totalResult.total / limit)
    };
  }

  static findById(id) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  }

  static update(id, productData) {
    const {
      name, brand, model, category, price, cost, stock_quantity,
      min_stock_level, description, specifications, warranty_period, status
    } = productData;
    
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, brand = ?, model = ?, category = ?, price = ?, cost = ?,
          stock_quantity = ?, min_stock_level = ?, description = ?, 
          specifications = ?, warranty_period = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      name, brand, model, category, price, cost, stock_quantity,
      min_stock_level, description, specifications, warranty_period, status, id
    );
    
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    return stmt.run(id);
  }

  static updateStock(id, quantity) {
    const stmt = db.prepare(`
      UPDATE products 
      SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(quantity, id);
    return this.findById(id);
  }

  static getLowStock() {
    return db.prepare(`
      SELECT * FROM products 
      WHERE stock_quantity <= min_stock_level AND status = 'active'
      ORDER BY stock_quantity ASC
    `).all();
  }

  static getStats() {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE status = "active"').get();
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level AND status = "active"').get();
    const totalValue = db.prepare('SELECT SUM(price * stock_quantity) as value FROM products WHERE status = "active"').get();

    return {
      total: totalProducts.count,
      lowStock: lowStock.count,
      totalValue: totalValue.value || 0
    };
  }

  static getCategories() {
    return db.prepare('SELECT DISTINCT category FROM products WHERE status = "active" ORDER BY category').all();
  }
}

export default Product;