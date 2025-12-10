import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: {
    type: Date,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
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
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    required: true,
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  labels: [{
    type: String,
    trim: true
  }],
  dueDate: {
    type: Date,
    default: null
  },
  estimatedHours: {
    type: Number,
    min: 0,
    default: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  checklist: [{
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Checklist item cannot exceed 200 characters']
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  subtasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  position: {
    type: Number,
    default: 0
  },
  comments: [commentSchema],
  activityLog: [{
    type: {
      type: String,
      enum: ['created', 'updated', 'status_changed', 'assigned', 'commented', 'attachment_added', 'time_logged'],
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    details: {
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ labels: 1 });
taskSchema.index({ 'comments.author': 1 });

taskSchema.pre('save', function(next) {
  // Сохраняем оригинальные значения для сравнения
  if (this.isNew) {
    this.activityLog.push({
      type: 'created',
      user: this.creator,
      details: { title: this.title }
    });
  } else {
    // Проверяем изменения статуса
    if (this.isModified('status')) {
      const oldStatus = this._originalStatus || 'To Do';
      this.activityLog.push({
        type: 'status_changed',
        user: this.creator,
        details: {
          oldValue: oldStatus,
          newValue: this.status
        }
      });
    }
    
    // Проверяем изменения ответственного
    if (this.isModified('assignee')) {
      this.activityLog.push({
        type: 'assigned',
        user: this.creator,
        details: {
          oldValue: this._originalAssignee,
          newValue: this.assignee
        }
      });
    }
  }
  
  next();
});

taskSchema.methods.addComment = async function(commentData) {
  const { author, content, mentions = [], attachments = [] } = commentData;
  
  if (!this._id) {
    throw new Error('Task not found');
  }
  
  const comment = {
    author,
    content,
    mentions,
    attachments
  };
  
  this.comments.push(comment);
  
  this.activityLog.push({
    type: 'commented',
    user: author,
    details: {
      commentId: this.comments[this.comments.length - 1]._id,
      preview: content.substring(0, 100)
    }
  });
  
  await this.save();
  return this.comments[this.comments.length - 1];
};

taskSchema.methods.updateComment = async function(commentId, updateData, userId) {
  const comment = this.comments.id(commentId);
  
  if (!comment) {
    throw new Error('Comment not found');
  }
  
  if (comment.author.toString() !== userId.toString()) {
    throw new Error('Not authorized to edit this comment');
  }
  
  if (updateData.content !== undefined) {
    comment.content = updateData.content;
  }
  
  if (updateData.mentions !== undefined) {
    comment.mentions = updateData.mentions;
  }
  
  comment.editedAt = new Date();
  comment.isEdited = true;
  
  this.activityLog.push({
    type: 'updated',
    user: userId,
    details: {
      commentId,
      action: 'comment_updated'
    }
  });
  
  await this.save();
  return comment;
};

taskSchema.methods.deleteComment = async function(commentId, userId) {
  const comment = this.comments.id(commentId);
  
  if (!comment) {
    throw new Error('Comment not found');
  }
  
  const project = await mongoose.model('Project').findById(this.project);
  const isProjectOwner = project.owner.toString() === userId.toString();
  const isCommentAuthor = comment.author.toString() === userId.toString();
  
  if (!isCommentAuthor && !isProjectOwner) {
    throw new Error('Not authorized to delete this comment');
  }
  
  this.comments.pull(commentId);
  
  this.activityLog.push({
    type: 'updated',
    user: userId,
    details: {
      commentId,
      action: 'comment_deleted'
    }
  });
  
  await this.save();
  return true;
};

taskSchema.methods.addCommentAttachment = async function(commentId, attachmentData, userId) {
  const comment = this.comments.id(commentId);
  
  if (!comment) {
    throw new Error('Comment not found');
  }
  
  if (comment.author.toString() !== userId.toString()) {
    throw new Error('Not authorized to add attachment to this comment');
  }
  
  comment.attachments.push(attachmentData);
  
  this.activityLog.push({
    type: 'attachment_added',
    user: userId,
    details: {
      commentId,
      filename: attachmentData.originalName
    }
  });
  
  await this.save();
  return comment.attachments[comment.attachments.length - 1];
};

// Метод для добавления записи времени
taskSchema.methods.addTimeLog = async function(timeLogData, userId) {
  const { hours, description, date } = timeLogData;
  
  if (!hours || hours <= 0) {
    throw new Error('Hours must be greater than 0');
  }
  
  // Обновляем actualHours
  this.actualHours = (this.actualHours || 0) + hours;
  
  // Добавляем запись в activityLog
  this.activityLog.push({
    type: 'time_logged',
    user: userId,
    details: {
      hours,
      description: description || '',
      date: date || new Date()
    },
    timestamp: new Date()
  });
  
  await this.save();
  return this.activityLog[this.activityLog.length - 1];
};

export default mongoose.model('Task', taskSchema);
