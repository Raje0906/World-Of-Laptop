import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET /api/users?role=engineer - Get users filtered by role
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
});

export default router; 