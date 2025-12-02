import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './utils/database.js';
import SocketServer from './websocket/socketServer.js';

// Routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import inviteRoutes from './routes/invites.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'TaskFlow Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// WebSocket Test Endpoint
app.get('/api/websocket-test', (req, res) => {
  const socketServer = app.get('socketServer');
  const stats = socketServer ? socketServer.getStats() : { error: 'WebSocket server not initialized' };
  
  res.json({
    message: 'WebSocket Test Endpoint',
    websocketStatus: socketServer ? 'active' : 'inactive',
    stats,
    serverTime: new Date().toISOString(),
    clientCount: socketServer ? socketServer.io.engine.clientsCount : 0
  });
});

// WebSocket Debug Endpoint
app.get('/api/websocket-debug', (req, res) => {
  const socketServer = app.get('socketServer');
  
  const debugInfo = {
    status: socketServer ? 'active' : 'inactive',
    config: {
      corsOrigin: process.env.CLIENT_URL || 'http://localhost:3000',
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
      wsPath: '/socket.io/'
    },
    serverTime: new Date().toISOString()
  };
  
  if (socketServer) {
    debugInfo.stats = socketServer.getStats();
    debugInfo.totalConnections = socketServer.io.engine.clientsCount;
    debugInfo.users = Array.from(socketServer.users.entries()).map(([userId, socketId]) => ({
      userId,
      socketId
    }));
  }
  
  res.json(debugInfo);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', commentRoutes);
app.use('/api', inviteRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });
  
  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      message: 'File too large. Maximum size is 10MB per file' 
    });
  }
  
  if (err.message.includes('invalid file type')) {
    return res.status(400).json({ 
      message: 'Invalid file type. Allowed types: images, PDF, documents, text files, archives' 
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Validation failed',
      errors 
    });
  }
  
  // Duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ 
      message: `${field} already exists` 
    });
  }
  
  // Socket.io errors
  if (err.message && err.message.includes('socket')) {
    return res.status(400).json({ 
      message: 'WebSocket error',
      error: err.message 
    });
  }
  
  // Default error
  const statusCode = err.status || 500;
  const errorResponse = {
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }
  
  res.status(statusCode).json(errorResponse);
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected successfully');
    
    const PORT = process.env.PORT || 5000;
    const server = http.createServer(app);
    
    // Initialize WebSocket server
    const socketServer = new SocketServer(server);
    app.set('socketServer', socketServer);
    
    // Store server instance for graceful shutdown
    app.set('serverInstance', server);
    
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                             🚀 TaskFlow Server                              ║
║                                                                             ║
║  📡 Server running on: http://localhost:${PORT}                               ${' '.repeat(51 - PORT.toString().length)}║
║  📊 Environment: ${(process.env.NODE_ENV || 'development').padEnd(52)}║
║  🔗 Client URL: ${(process.env.CLIENT_URL || 'http://localhost:3000').padEnd(49)}║
║  💾 Database: MongoDB connected                                             ║
║  ⚡ WebSocket: Active (path: /socket.io/)                                   ║
║                                                                             ║
║  📁 API Endpoints:                                                          ║
║    • Health: GET /api/health                                                ║
║    • WebSocket Test: GET /api/websocket-test                                ║
║    • WebSocket Debug: GET /api/websocket-debug                              ║
║    • Auth: POST /api/auth/{register,login}                                  ║
║    • Users: GET/PUT /api/users/me                                           ║
║    • Projects: CRUD /api/projects                                           ║
║    • Tasks: CRUD /api/tasks                                                 ║
║    • Comments: CRUD /api/tasks/{id}/comments                                ║
║    • Invites: CRUD /api/invites                                             ║
║                                                                             ║
║  📎 Uploads: /uploads/*                                                     ║
║                                                                             ║
║  🔐 WebSocket URL: ws://localhost:${PORT}/socket.io/                         ${' '.repeat(45 - PORT.toString().length)}║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);
      
      // Test WebSocket initialization
      setTimeout(() => {
        const wsStats = socketServer.getStats();
        console.log('📊 Initial WebSocket Stats:', wsStats);
      }, 1000);
    });
    
    // Graceful shutdown handling
    let isShuttingDown = false;

    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Timeout for force shutdown
        const forceShutdownTimeout = setTimeout(() => {
          console.error('❌ Forcefully shutting down after timeout');
          process.exit(1);
        }, 10000);
        
        // Close WebSocket connections
        if (socketServer && socketServer.io) {
          console.log('🔄 Closing WebSocket connections...');
          const wsStats = socketServer.getStats();
          console.log(`📊 Active WebSocket connections: ${wsStats.activeConnections}`);
          
          socketServer.io.close(() => {
            console.log('✅ WebSocket server closed');
          });
        }
        
        // Close HTTP server
        if (server) {
          console.log('🔄 Closing HTTP server...');
          server.close(async () => {
            console.log('✅ HTTP server closed');
            
            // Close database connection
            const mongoose = await import('mongoose');
            if (mongoose.connection.readyState !== 0) {
              await mongoose.connection.close();
              console.log('✅ Database connection closed');
            }
            
            clearTimeout(forceShutdownTimeout);
            console.log('👋 Server stopped gracefully');
            process.exit(0);
          });
          
          // Check active connections
          server.getConnections((err, count) => {
            if (!err && count > 0) {
              console.log(`📊 Active HTTP connections: ${count}`);
            }
          });
        } else {
          clearTimeout(forceShutdownTimeout);
          process.exit(0);
        }
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('🔥 Uncaught Exception:', {
        message: error.message,
        stack: error.stack
      });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise);
      console.error('Reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
    // Handle WebSocket server errors
    socketServer.io.on('error', (error) => {
      console.error('⚡ WebSocket server error:', error);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    
    // MongoDB specific errors
    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n🔧 MongoDB Connection Error:');
      console.error('   • Check if MongoDB is running');
      console.error('   • Verify MONGODB_URI in .env file');
      console.error('   • Default URI: mongodb://localhost:27017/taskflow');
      console.error('\n💡 Solutions:');
      console.error('   1. Start MongoDB: sudo systemctl start mongod (Linux)');
      console.error('   2. Start MongoDB: brew services start mongodb-community (macOS)');
      console.error('   3. Install MongoDB: https://www.mongodb.com/docs/manual/installation/');
      console.error('   4. Use MongoDB Atlas: https://www.mongodb.com/atlas');
    }
    
    // WebSocket specific errors
    if (error.message && error.message.includes('socket')) {
      console.error('\n🔧 WebSocket Error:');
      console.error('   • Check if port is already in use');
      console.error('   • Verify CORS settings in .env file');
    }
    
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
