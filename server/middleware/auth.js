import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    console.log('🔑 Token received, verifying...');
    console.log('🔑 Token value (first 20 chars):', token.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔑 Token decoded:', decoded);
    console.log('🔑 User ID from token:', decoded.userId || decoded.id || decoded._id);
    
    // Пробуем разные варианты получения ID пользователя
    const userId = decoded.userId || decoded.id || decoded._id;
    
    if (!userId) {
      console.log('❌ No user ID found in token');
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('✅ User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.name, error.message);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Token verification failed:', error.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token expired');
      return res.status(401).json({ message: 'Token expired' });
    }

    console.error('❌ Other auth error:', error);
    res.status(500).json({ 
      message: 'Authentication failed',
      error: error.message 
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      console.log('🔓 Optional auth: Token found');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userId = decoded.userId || decoded.id || decoded._id;
      
      if (userId) {
        const user = await User.findById(userId).select('-password');
        if (user) {
          req.user = user;
          console.log('🔓 Optional auth: User found:', user.email);
        } else {
          console.log('🔓 Optional auth: User not found in database');
        }
      }
    } else {
      console.log('🔓 Optional auth: No token provided');
    }
    
    next();
  } catch (error) {
    console.log('🔓 Optional auth: Token verification failed, continuing without user');
    next();
  }
};