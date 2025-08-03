import express from 'express';
import { emailService } from '../services/emailService.js';

export const testEmailRouter = express.Router();

testEmailRouter.get('/test-email', async (req, res) => {
  try {
    console.log('Testing email service...');
    
    const testParams = {
      to_email: 'test@example.com', // Replace with your test email
      user_name: 'Test User',
      device_name: 'Test Device',
      issue_description: 'Test issue',
      repair_id: 'TEST123',
      status: 'in_progress',
      estimated_date: new Date().toLocaleDateString(),
      message: 'This is a test email from the repair system.'
    };

    console.log('Sending test email with params:', {
      ...testParams,
      to_email: testParams.to_email // Don't mask in test
    });

    // Test with main config
    console.log('Testing with main config...');
    const mainResult = await emailService.sendEmail(testParams, false);
    console.log('Main config result:', mainResult);

    // Test with notify config
    console.log('Testing with notify config...');
    const notifyResult = await emailService.sendEmail(testParams, true);
    console.log('Notify config result:', notifyResult);

    res.json({
      success: true,
      mainConfig: mainResult,
      notifyConfig: notifyResult
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default testEmailRouter;
