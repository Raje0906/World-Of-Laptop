import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Test database connection
    await db.connection.once('open', () => console.log('Connected to MongoDB'));
    
    // Get all sales (limited to 10 for testing)
    const sales = await db.Sale.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Get count of all sales
    const count = await db.Sale.countDocuments({});
    
    // Get sales from the last 7 days
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentSales = await db.Sale.countDocuments({
      createdAt: { $gte: lastWeek }
    });

    res.status(200).json({
      success: true,
      totalSales: count,
      recentSales,
      sampleSales: sales.map(sale => ({
        _id: sale._id,
        saleNumber: sale.saleNumber,
        customer: sale.customer,
        totalAmount: sale.totalAmount,
        createdAt: sale.createdAt,
        items: sale.items.map(item => ({
          productName: item.productName,
          serialNumber: item.serialNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          isManualEntry: item.isManualEntry
        }))
      }))
    });
  } catch (error) {
    console.error('Test sales error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error testing sales data'
    });
  }
}
