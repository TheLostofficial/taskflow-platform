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

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'TaskFlow Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', commentRoutes); // комментарии используют префикс /api в самом файле
app.use('/api', inviteRoutes); // инвайты используют префикс /api в самом файле

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
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
  
  // JWT ошибки
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Validation failed',
      errors 
    });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ 
      message: `${field} already exists` 
    });
  }
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 5000;
    
    const server = http.createServer(app);
    
    const socketServer = new SocketServer(server);
    
    app.set('socketServer', socketServer);
    
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                    🚀 TaskFlow Server                    ║
║                                                          ║
║  📡 Server running on: http://localhost:${PORT}           ${' '.repeat(42 - PORT.toString().length)}║
║  📊 Environment: ${(process.env.NODE_ENV || 'development').padEnd(43)}║
║  🔗 Client URL: ${(process.env.CLIENT_URL || 'http://localhost:3000').padEnd(40)}║
║  💾 Database: MongoDB connected                          ║
║  ⚡ WebSocket: Active                                    ║
║                                                          ║
║  📁 API Endpoints:                                       ║
║    • Health: GET /api/health                             ║
║    • Auth: POST /api/auth/{register,login}               ║
║    • Users: GET/PUT /api/users/me                        ║
║    • Projects: CRUD /api/projects                        ║
║    • Tasks: CRUD /api/tasks                              ║
║    • Comments: CRUD /api/tasks/{id}/comments             ║
║    • Invites: CRUD /api/invites                          ║
║                                                          ║
║  📎 Uploads: /uploads/*                                  ║
║                                                          ║
║  🔐 WebSocket: ws://localhost:${PORT}                     ${' '.repeat(42 - PORT.toString().length)}║
╚══════════════════════════════════════════════════════════╝
      `);
    });
    
    // Graceful shutdown
    let isShuttingDown = false;

    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
      
      try {
        setTimeout(() => {
          console.error('❌ Forcefully shutting down after timeout');
          process.exit(1);
        }, 10000);
        
        if (socketServer && socketServer.io) {
          console.log('🔄 Closing WebSocket connections...');
          socketServer.io.close(() => {
            console.log('✅ WebSocket server closed');
          });
        }
        
        if (server) {
          server.close(async () => {
            console.log('✅ HTTP server closed');
            
            const mongoose = await import('mongoose');
            if (mongoose.connection.readyState !== 0) {
              await mongoose.connection.close();
              console.log('✅ Database connection closed');
            }
            
            console.log('👋 Server stopped gracefully');
            process.exit(0);
          });
          
          server.getConnections((err, count) => {
            if (count > 0) {
              console.log(`📊 Active connections: ${count}`);
            }
          });
        } else {
          process.exit(0);
        }
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error('🔥 Uncaught Exception:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise);
      console.error('Reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n🔧 MongoDB Connection Error:');
      console.error('   • Check if MongoDB is running');
      console.error('   • Verify MONGODB_URI in .env file');
      console.error('   • Default URI: mongodb://localhost:27017/taskflow');
      console.error('\n💡 Solutions:');
      console.error('   1. Start MongoDB: sudo systemctl start mongod');
      console.error('   2. Install MongoDB: https://www.mongodb.com/docs/manual/installation/');
      console.error('   3. Use MongoDB Atlas: https://www.mongodb.com/atlas');
    }
    
    process.exit(1);
  }
};

startServer();

export default app;
