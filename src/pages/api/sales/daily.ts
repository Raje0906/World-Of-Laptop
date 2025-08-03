import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import db from '@/lib/db';

// Enable debug logging
const debug = process.env.NODE_ENV !== 'production';
const log = (...args: any[]) => debug && console.log('[DAILY SALES API]', ...args);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  log('Request received:', req.method, req.url);
  
  if (req.method !== 'GET') {
    log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    log('Session:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { startDate, endDate, storeId } = req.query;
    log('Query params:', { startDate, endDate, storeId });
    
    // Set start of day and end of day for the date range
    const start = new Date(startDate as string);
    const startOfDay = new Date(start);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const end = new Date(endDate as string || startDate as string);
    const endOfDay = new Date(end);
    endOfDay.setUTCHours(23, 59, 59, 999);

    log('Date range:', { 
      start: startOfDay.toISOString(), 
      end: endOfDay.toISOString(),
      localStart: startOfDay.toString(),
      localEnd: endOfDay.toString()
    });

    // Build the query - allow access to all stores
    const query: any = {
      isActive: true,
      $or: [
        {
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        },
        // Also check for sales with string dates (legacy support)
        {
          'createdAt.$date': {
            $gte: startOfDay.toISOString(),
            $lte: endOfDay.toISOString()
          }
        }
      ]
    };

    // Still allow filtering by store if specified, but don't restrict to user's store
    if (storeId) {
      query.store = storeId;
    }
    
    log('Database query:', JSON.stringify(query, null, 2));

    // Get sales for the date range
    log('Fetching sales from database...');
    const sales = await db.Sale.find(query)
      .populate('customer', 'name phone')
      .populate('store', 'name')
      .sort({ createdAt: -1 });
      
    log(`Found ${sales.length} sales in date range`);
    if (sales.length > 0) {
      log('Sample sale:', {
        _id: sales[0]._id,
        saleNumber: sales[0].saleNumber,
        customer: sales[0].customer,
        totalAmount: sales[0].totalAmount,
        createdAt: sales[0].createdAt,
        items: sales[0].items
      });
    }

    // Group sales by date
    const salesByDate = sales.reduce((acc, sale) => {
      const date = sale.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          totalSales: 0,
          totalAmount: 0,
          sales: []
        };
      }
      
      acc[date].totalSales += 1;
      acc[date].totalAmount += sale.totalAmount;
      acc[date].sales.push(sale);
      
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by date (newest first)
    const result = Object.values(salesByDate).sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    log(`Returning ${result.length} days of sales data`);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
