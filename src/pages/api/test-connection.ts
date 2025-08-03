import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test database connection
    await db.connection.once('open', () => console.log('Connected to MongoDB'));
    
    // Test if Sales collection exists and has data
    const salesCount = await db.Sale.countDocuments({});
    
    res.status(200).json({
      success: true,
      dbConnected: db.connection.readyState === 1,
      salesCount,
      message: 'Test connection successful'
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Test connection failed'
    });
  }
}
