import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Done', 'Backlog', 'Review'],
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  estimatedTime: {
    type: Number, // в часах
    default: 0
  },
  actualTime: {
    type: Number, // в часах
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String, // ✅ ИСПРАВЛЕНО: было text, стало content
    createdAt: {
      type: Date,
      default: Date.now
    },
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    attachments: [{
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  // ✅ ДОБАВЛЯЕМ историю активности
  history: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['created', 'updated', 'status_changed', 'assigned', 'commented', 'checklist_updated', 'attachment_added']
    },
    details: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  checklist: [{
    text: String,
    completed: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  columnIndex: {
    type: Number,
    default: 0
  },
  position: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Метод для обновления статуса
taskSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  return this.save();
};

// Метод для добавления комментария
taskSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content,
    createdAt: new Date()
  });
  return this.save();
};

// Метод для добавления записи в историю
taskSchema.methods.addHistory = function(userId, action, details, oldValue, newValue) {
  this.history.push({
    user: userId,
    action: action,
    details: details || '',
    oldValue: oldValue,
    newValue: newValue,
    timestamp: new Date()
  });
  return this;
};

// Статический метод для поиска задач по проекту
taskSchema.statics.findByProject = function(projectId) {
  return this.find({ project: projectId })
    .populate('creator', 'name email avatar')
    .populate('assignee', 'name email avatar')
    .populate('comments.user', 'name email avatar')
    .populate('history.user', 'name email avatar')
    .sort({ columnIndex: 1, position: 1, createdAt: -1 });
};

// ✅ ДОБАВЛЯЕМ метод countDocuments если его нет
taskSchema.statics.countDocuments = function(conditions) {
  return this.countDocuments(conditions);
};

const Task = mongoose.model('Task', taskSchema);

export default Task;
