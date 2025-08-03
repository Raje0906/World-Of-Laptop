import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Repair from '../models/Repair.js';
import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import db from '../database/db.js';

const router = express.Router();

// Summary route
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const salesStatsArr = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const salesStats = salesStatsArr[0] || { totalSales: 0, totalRevenue: 0 };
    
    const activeRepairs = await Repair.countDocuments({
      status: { $in: ['received', 'diagnosed', 'in_repair'] }
    });
    const totalCustomers = await Customer.countDocuments();

    res.json({
      success: true,
      data: {
        totalSales: salesStats.totalSales,
        totalRevenue: salesStats.totalRevenue,
        activeRepairs,
        totalCustomers
      }
    });
  } catch (err) {
    console.error('Error generating summary report:', err);
    res.status(500).json({ message: 'Failed to generate summary report' });
  }
});

// Helper function to calculate repair metrics
function calculateRepairMetrics(repairs) {
  const totalRepairs = repairs.length;
  const completedRepairs = repairs.filter(r => r.status === 'completed').length;
  const totalRevenue = repairs.reduce((sum, repair) => sum + (repair.actualCost || 0), 0);

  // Average repair time for completed repairs
  const completedRepairsWithTime = repairs.filter(r => r.status === 'completed' && r.actualCompletion && r.receivedDate);
  let averageRepairTime = 0;
  if (completedRepairsWithTime.length > 0) {
    const totalDays = completedRepairsWithTime.reduce((sum, repair) => {
      const start = new Date(repair.receivedDate);
      const end = new Date(repair.actualCompletion);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    averageRepairTime = totalDays / completedRepairsWithTime.length;
  }

  // Most common issues
  const issues = repairs.reduce((acc, repair) => {
    const issue = repair.issueDescription || 'Unknown';
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {});
  const topIssues = Object.entries(issues)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Store performance
  const storePerformance = repairs.reduce((acc, repair) => {
    const storeId = repair.storeId || 'unknown';
    if (!acc[storeId]) acc[storeId] = { repairs: 0, revenue: 0 };
    acc[storeId].repairs += 1;
    acc[storeId].revenue += repair.actualCost || 0;
    return acc;
  }, {});
  const storePerformanceArray = Object.entries(storePerformance).map(([storeId, data]) => ({
    storeId,
    repairs: data.repairs,
    revenue: data.revenue
  }));

  return {
    totalRepairs,
    completedRepairs,
    averageRepairTime,
    totalRevenue,
    topIssues,
    storePerformance: storePerformanceArray
  };
}

// Helper function to calculate sales metrics
function calculateSalesMetrics(sales) {
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  const productSales = sales.flatMap(sale => sale.items);
  const totalItemsSold = productSales.reduce((sum, item) => sum + item.quantity, 0);

  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  const topProducts = productSales.reduce((acc, item) => {
    if (!item.product) {
      const unknownProductId = 'unknown';
      if (!acc[unknownProductId]) {
        acc[unknownProductId] = { name: 'Unknown Product', count: 0 };
      }
      acc[unknownProductId].count += item.quantity;
      return acc;
    }
    const productId = item.product._id.toString();
    if (!acc[productId]) {
      acc[productId] = {
        name: item.product.name || 'Unknown Product',
        count: 0
      };
    }
    acc[productId].count += item.quantity;
    return acc;
  }, {});

  const topProductsArray = Object.values(topProducts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSales,
    totalRevenue,
    totalItemsSold,
    averageOrderValue,
    topProducts: topProductsArray,
  };
}

// Monthly report
router.get('/monthly', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const user = req.user || {}; // Handle case where user might be undefined
    
    if (!year || !month) {
      return res.status(400).json({ 
        success: false,
        message: 'Year and month are required' 
      });
    }
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    
    // Base query with date range
    let query = { 
      receivedDate: { 
        $gte: startDate, 
        $lte: endDate 
      } 
    };
    
    // Add store filter for non-admin users
    if (user.role !== 'admin' && user.store_id) {
      query.storeId = user.store_id;
    }
    
    const repairs = await Repair.find(query);
    const metrics = calculateRepairMetrics(repairs);
    
    res.json({ 
      success: true, 
      data: { 
        period: `${startDate.toLocaleString('default', { month: 'long' })} ${year}`, 
        repairs: metrics 
      } 
    });
    
  } catch (err) {
    console.error('Error generating monthly report:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate monthly report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Monthly Sales Report
router.get('/sales/monthly', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const user = req.user || {};
    
    if (!year || !month) {
      return res.status(400).json({ 
        success: false,
        message: 'Year and month are required' 
      });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // Base query with date range
    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
      ...(user.role !== 'admin' && user.store_id && { storeId: user.store_id })
    };

    const sales = await Sale.find(query).populate('items.product');
    const metrics = calculateSalesMetrics(sales);
    
    res.json({ 
      success: true, 
      data: { 
        period: `${startDate.toLocaleString('default', { month: 'long' })} ${year}`, 
        sales: metrics 
      } 
    });
  } catch (err) {
    console.error('Error generating monthly sales report:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate monthly sales report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Monthly Store Report
router.get('/store/monthly', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ message: 'Year and month are required' });

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const salesQuery = { createdAt: { $gte: startDate, $lte: endDate } };
    const sales = await Sale.find(salesQuery).populate('items.product');
    const salesMetrics = calculateSalesMetrics(sales);

    const repairsQuery = { receivedDate: { $gte: startDate, $lte: endDate } };
    const repairs = await Repair.find(repairsQuery);
    const repairMetrics = calculateRepairMetrics(repairs);

    res.json({
      success: true,
      data: {
        period: `${startDate.toLocaleString('default', { month: 'long' })} ${year}`,
        sales: salesMetrics,
        repairs: repairMetrics,
      },
    });
  } catch (err) {
    console.error('Error generating monthly store report:', err);
    res.status(500).json({ message: 'Failed to generate monthly store report' });
  }
});

// Quarterly report
router.get('/quarterly', authenticateToken, async (req, res) => {
  try {
    const { year, quarter } = req.query;
    const user = req.user || {};
    
    if (!year || !quarter) {
      return res.status(400).json({ 
        success: false,
        message: 'Year and quarter are required' 
      });
    }
    
    const quarterStart = (parseInt(quarter) - 1) * 3;
    const startDate = new Date(parseInt(year), quarterStart, 1);
    const endDate = new Date(parseInt(year), quarterStart + 2, 31, 23, 59, 59);
    
    // Common query options
    const commonOptions = {
      ...(user.role !== 'admin' && user.store_id && { storeId: user.store_id })
    };
    
    // Sales query
    const salesQuery = { 
      createdAt: { $gte: startDate, $lte: endDate },
      ...commonOptions
    };
    
    // Repairs query
    const repairsQuery = { 
      receivedDate: { $gte: startDate, $lte: endDate },
      ...commonOptions
    };

    // Execute both queries in parallel
    const [sales, repairs] = await Promise.all([
      Sale.find(salesQuery).populate('items.product'),
      Repair.find(repairsQuery)
    ]);

    const salesMetrics = calculateSalesMetrics(sales);
    const repairMetrics = calculateRepairMetrics(repairs);

    res.json({
      success: true,
      data: {
        period: `Q${quarter} ${year}`,
        sales: salesMetrics,
        repairs: repairMetrics,
      },
    });
  } catch (err) {
    console.error('Error generating quarterly report:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate quarterly report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Annual report
router.get('/annual', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    const user = req.user || {};
    
    if (!year) {
      return res.status(400).json({ 
        success: false,
        message: 'Year is required' 
      });
    }
    
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
    
    // Build queries for sales and repairs
    const salesQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      ...(user.role !== 'admin' && user.store_id && { storeId: user.store_id })
    };
    const repairsQuery = {
      receivedDate: { $gte: startDate, $lte: endDate },
      ...(user.role !== 'admin' && user.store_id && { storeId: user.store_id })
    };
    
    // Get both sales and repairs for the year
    const [sales, repairs] = await Promise.all([
      Sale.find(salesQuery).populate('items.product'),
      Repair.find(repairsQuery)
    ]);
    
    const salesMetrics = calculateSalesMetrics(sales);
    const repairMetrics = calculateRepairMetrics(repairs);
    
    res.json({ 
      success: true, 
      data: { 
        period: `${year}`,
        sales: salesMetrics,
        repairs: repairMetrics
      } 
    });
    
  } catch (err) {
    console.error('Error generating annual report:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate annual report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router; 