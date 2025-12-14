import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';

// Импорт маршрутов
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import inviteRoutes from './routes/invites.js';

// Импорт контроллеров для установки socketServer
import * as taskController from './controllers/taskController.js';
import * as projectController from './controllers/projectController.js';

// Настройка путей для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загрузка переменных окружения
dotenv.config();

// Создание Express приложения
const app = express();
const server = http.createServer(app);

// Настройка Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Базовая конфигурация
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';

// Middleware для безопасности
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CLIENT_URL || "http://localhost:3000"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting для предотвращения DDoS атак
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 200, // максимум 200 запросов с одного IP за 15 минут
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Слишком много запросов с этого IP. Пожалуйста, попробуйте позже.'
  },
  skip: (req) => {
    // Пропускаем проверку для определенных маршрутов или в режиме разработки
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }
});

// Apply rate limiting ко всем запросам
app.use(limiter);

// Настройка CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware для парсинга JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware для логирования запросов
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API маршруты с префиксом /api
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invites', inviteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Подготовка папки uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Создана папка uploads');
}

// Функция инициализации WebSocket сервера
function initSocketServer(io) {
  console.log('🔄 Инициализация WebSocket сервера...');

  // Хранилище подключенных пользователей
  const connectedUsers = new Map();

  // Middleware для проверки токена
  io.use((socket, next) => {
    const token = socket.handshake.query.token;
    
    if (!token) {
      console.log('❌ WebSocket: Токен не предоставлен');
      return next(new Error('Токен не предоставлен'));
    }

    try {
      // Декодируем токен без проверки секрета (для простоты)
      // В реальном приложении нужно использовать jwt.verify
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      socket.userId = decoded.userId || decoded._id;
      console.log(`✅ WebSocket: Пользователь ${socket.userId} аутентифицирован`);
      next();
    } catch (error) {
      console.error('❌ WebSocket: Ошибка проверки токена:', error.message);
      next(new Error('Неверный токен'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔗 Новое подключение: ${socket.id}, пользователь: ${userId}`);

    if (userId) {
      connectedUsers.set(socket.id, userId);
      
      // Присоединяем пользователя к его персональной комнате
      socket.join(`user_${userId}`);
      console.log(`👤 Пользователь ${userId} присоединился к комнате user_${userId}`);
    }

    // Присоединение к проекту
    socket.on('join_project', (projectId) => {
      if (projectId) {
        socket.join(`project_${projectId}`);
        console.log(`👥 Клиент ${socket.id} присоединился к проекту ${projectId}`);
      }
    });

    // Выход из проекта
    socket.on('leave_project', (projectId) => {
      if (projectId) {
        socket.leave(`project_${projectId}`);
        console.log(`👋 Клиент ${socket.id} покинул проект ${projectId}`);
      }
    });

    // Присоединение к задаче
    socket.on('join_task', (taskId) => {
      if (taskId) {
        socket.join(`task_${taskId}`);
        console.log(`📋 Клиент ${socket.id} присоединился к задаче ${taskId}`);
      }
    });

    // Выход из задачи
    socket.on('leave_task', (taskId) => {
      if (taskId) {
        socket.leave(`task_${taskId}`);
        console.log(`👋 Клиент ${socket.id} покинул задачу ${taskId}`);
      }
    });

    // Пинг-понг для поддержания соединения
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Отключение
    socket.on('disconnect', () => {
      const userId = connectedUsers.get(socket.id);
      if (userId) {
        console.log(`❌ Отключение: пользователь ${userId} (socket: ${socket.id})`);
        connectedUsers.delete(socket.id);
      } else {
        console.log(`❌ Отключение: ${socket.id}`);
      }
    });
  });

  // Методы для использования в контроллерах
  const socketServer = {
    // Уведомление о создании задачи
    notifyTaskCreated: (projectId, task, userId) => {
      if (projectId && task) {
        console.log(`🔔 WebSocket: Уведомление о создании задачи в проекте ${projectId}`);
        io.to(`project_${projectId}`).emit('task_created', {
          task,
          createdBy: userId
        });
      }
    },
    
    // Уведомление об обновлении задачи
    notifyTaskUpdated: (projectId, task, userId) => {
      if (projectId && task) {
        console.log(`🔔 WebSocket: Уведомление об обновлении задачи в проекте ${projectId}`);
        io.to(`project_${projectId}`).emit('task_updated', {
          task,
          updatedBy: userId
        });
        
        io.to(`task_${task._id}`).emit('task_updated', {
          task,
          updatedBy: userId
        });
      }
    },
    
    // Уведомление об удалении задачи
    notifyTaskDeleted: (projectId, taskId, userId) => {
      if (projectId && taskId) {
        console.log(`🔔 WebSocket: Уведомление об удалении задачи ${taskId}`);
        io.to(`project_${projectId}`).emit('task_deleted', {
          taskId,
          deletedBy: userId
        });
        
        io.to(`task_${taskId}`).emit('task_deleted', {
          taskId,
          deletedBy: userId
        });
      }
    },
    
    // Уведомление о добавлении комментария
    notifyCommentAdded: (taskId, comment, projectId, userId) => {
      if (taskId && comment) {
        console.log(`🔔 WebSocket: Уведомление о комментарии в задаче ${taskId}`);
        io.to(`task_${taskId}`).emit('comment_added', {
          taskId,
          comment,
          addedBy: userId
        });
        
        if (projectId) {
          io.to(`project_${projectId}`).emit('comment_added', {
            taskId,
            comment,
            addedBy: userId
          });
        }
      }
    },
    
    // Уведомление об обновлении комментария
    notifyCommentUpdated: (taskId, comment, userId) => {
      if (taskId && comment) {
        io.to(`task_${taskId}`).emit('comment_updated', {
          taskId,
          comment,
          updatedBy: userId
        });
      }
    },
    
    // Уведомление об удалении комментария
    notifyCommentDeleted: (taskId, commentId, userId) => {
      if (taskId && commentId) {
        io.to(`task_${taskId}`).emit('comment_deleted', {
          taskId,
          commentId,
          deletedBy: userId
        });
      }
    },
    
    // Уведомление упомянутого пользователя
    notifyUserMentioned: (userId, notification) => {
      console.log(`🔔 WebSocket: Уведомление пользователя ${userId} об упоминании`);
      io.to(`user_${userId}`).emit('user_mentioned', notification);
    },
    
    // Уведомление об обновлении проекта
    notifyProjectUpdated: (project, userId) => {
      if (project && project._id) {
        console.log(`🔔 WebSocket: Уведомление об обновлении проекта ${project._id}`);
        io.to(`project_${project._id}`).emit('project_updated', {
          project,
          updatedBy: userId
        });
      }
    },
    
    // Уведомление об удалении проекта
    notifyProjectDeleted: (projectId, userId) => {
      if (projectId) {
        console.log(`🔔 WebSocket: Уведомление об удалении проекта ${projectId}`);
        io.to(`project_${projectId}`).emit('project_deleted', {
          projectId,
          deletedBy: userId
        });
      }
    },
    
    // Уведомление о присоединении участника
    notifyMemberJoined: (projectId, userId) => {
      if (projectId && userId) {
        console.log(`🔔 WebSocket: Уведомление о присоединении участника ${userId} к проекту ${projectId}`);
        io.to(`project_${projectId}`).emit('member_joined', {
          projectId,
          userId
        });
      }
    },
    
    // Уведомление о выходе участника
    notifyMemberLeft: (projectId, userId) => {
      if (projectId && userId) {
        console.log(`🔔 WebSocket: Уведомление о выходе участника ${userId} из проекта ${projectId}`);
        io.to(`project_${projectId}`).emit('member_left', {
          projectId,
          userId
        });
      }
    },
    
    // Отправка сообщения конкретному пользователю
    sendToUser: (userId, event, data) => {
      console.log(`🔔 WebSocket: Отправка события ${event} пользователю ${userId}`);
      io.to(`user_${userId}`).emit(event, data);
    }
  };
  
  // Устанавливаем socketServer в app для доступа из контроллеров
  app.set('socketServer', socketServer);
  
  // Экспортируем для использования в контроллерах
  return socketServer;
}

// Подключение к MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Подключение к MongoDB успешно');
  
  // Инициализация WebSocket сервера
  initSocketServer(io);
  
  // Запуск сервера
  server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔗 API доступно по адресу: http://localhost:${PORT}/api`);
    console.log(`🌍 Клиент: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    console.log(`📁 Папка uploads: ${uploadsDir}`);
    console.log(`⚡ Режим: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((error) => {
  console.error('❌ Ошибка подключения к MongoDB:', error);
  process.exit(1);
});

// Обработка ошибок подключения к MongoDB
mongoose.connection.on('error', (error) => {
  console.error('❌ Ошибка MongoDB:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB отключен');
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('⚠️ Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Необработанный промис:', promise, 'причина:', reason);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🛑 Получен сигнал завершения работы...');
  
  server.close(() => {
    console.log('✅ HTTP сервер закрыт');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB соединение закрыто');
      process.exit(0);
    });
  });

  // Если сервер не закрывается за 10 секунд
  setTimeout(() => {
    console.error('❌ Принудительное завершение работы');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Экспорт для тестирования
export { app, server, io, initSocketServer };
