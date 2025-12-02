import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class SocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.users = new Map(); // userId -> socketId
    this.projectRooms = new Map(); // projectId -> Set of socketIds

    this.setupMiddleware();
    this.setupConnection();
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        
        next();
      } catch (error) {
        console.error('Socket auth error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupConnection() {
    this.io.on('connection', (socket) => {
      console.log(`⚡ User connected: ${socket.userId}`);

      this.users.set(socket.userId, socket.id);

      this.joinUserProjects(socket);

      this.setupEventHandlers(socket);

      socket.emit('connected', {
        message: 'Connected to TaskFlow WebSocket',
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });

      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.userId}`);
        this.users.delete(socket.userId);
        this.leaveAllProjects(socket);
      });
    });
  }

  async joinUserProjects(socket) {
    try {
      socket.join(`user_${socket.userId}`);
      
      console.log(`📡 User ${socket.userId} joined personal room`);
    } catch (error) {
      console.error('Error joining user projects:', error);
    }
  }

  setupEventHandlers(socket) {
    socket.on('join_project', (projectId) => {
      socket.join(`project_${projectId}`);
      
      if (!this.projectRooms.has(projectId)) {
        this.projectRooms.set(projectId, new Set());
      }
      this.projectRooms.get(projectId).add(socket.id);
      
      console.log(`🚀 User ${socket.userId} joined project ${projectId}`);
      socket.emit('project_joined', { projectId });
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project_${projectId}`);
      
      if (this.projectRooms.has(projectId)) {
        this.projectRooms.get(projectId).delete(socket.id);
      }
      
      console.log(`👋 User ${socket.userId} left project ${projectId}`);
    });

    socket.on('join_task', (taskId) => {
      socket.join(`task_${taskId}`);
      console.log(`🎯 User ${socket.userId} joined task ${taskId}`);
    });

    socket.on('leave_task', (taskId) => {
      socket.leave(`task_${taskId}`);
      console.log(`👋 User ${socket.userId} left task ${taskId}`);
    });

    socket.on('ping', (data) => {
      socket.emit('pong', {
        ...data,
        timestamp: new Date().toISOString()
      });
    });
  }

  leaveAllProjects(socket) {
    for (const [projectId, socketSet] of this.projectRooms) {
      socketSet.delete(socket.id);
      if (socketSet.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }
  }

  sendToUser(userId, event, data) {
    const socketId = this.users.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  sendToProject(projectId, event, data, excludeUserId = null) {
    const room = `project_${projectId}`;
    
    if (excludeUserId) {
      const excludeSocketId = this.users.get(excludeUserId);
      if (excludeSocketId) {
        socket.to(excludeSocketId).to(room).emit(event, data);
      } else {
        this.io.to(room).emit(event, data);
      }
    } else {
      this.io.to(room).emit(event, data);
    }
    
    console.log(`📤 Sent ${event} to project ${projectId}`);
    return true;
  }

  sendToTask(taskId, event, data, excludeUserId = null) {
    const room = `task_${taskId}`;
    
    if (excludeUserId) {
      const excludeSocketId = this.users.get(excludeUserId);
      if (excludeSocketId) {
        socket.to(excludeSocketId).to(room).emit(event, data);
      } else {
        this.io.to(room).emit(event, data);
      }
    } else {
      this.io.to(room).emit(event, data);
    }
    
    return true;
  }

  notifyTaskCreated(projectId, task, createdByUserId) {
    this.sendToProject(projectId, 'task_created', {
      task,
      createdBy: createdByUserId,
      timestamp: new Date().toISOString()
    }, createdByUserId);
  }

  notifyTaskUpdated(projectId, task, updatedByUserId) {
    this.sendToProject(projectId, 'task_updated', {
      task,
      updatedBy: updatedByUserId,
      timestamp: new Date().toISOString()
    }, updatedByUserId);
  }

  notifyTaskDeleted(projectId, taskId, deletedByUserId) {
    this.sendToProject(projectId, 'task_deleted', {
      taskId,
      deletedBy: deletedByUserId,
      timestamp: new Date().toISOString()
    }, deletedByUserId);
  }

  notifyCommentAdded(taskId, comment, projectId, addedByUserId) {
    this.sendToTask(taskId, 'comment_added', {
      comment,
      taskId,
      addedBy: addedByUserId,
      timestamp: new Date().toISOString()
    }, addedByUserId);

    this.sendToProject(projectId, 'task_commented', {
      taskId,
      commentId: comment._id,
      addedBy: addedByUserId,
      timestamp: new Date().toISOString()
    }, addedByUserId);
  }

  notifyUserMentioned(userId, data) {
    this.sendToUser(userId, 'mentioned', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  notifyProjectInvite(userId, project, invitedBy) {
    this.sendToUser(userId, 'project_invite', {
      project,
      invitedBy,
      timestamp: new Date().toISOString()
    });
  }

  getStats() {
    return {
      totalUsers: this.users.size,
      totalProjectRooms: this.projectRooms.size,
      activeConnections: this.io.engine.clientsCount
    };
  }
}

export default SocketServer;