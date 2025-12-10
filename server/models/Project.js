import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    permissions: {
      canEdit: { type: Boolean, default: true },
      canDelete: { type: Boolean, default: false },
      canInvite: { type: Boolean, default: false }
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }],
  settings: {
    template: {
      type: String,
      enum: ['kanban', 'scrum', 'custom'],
      default: 'kanban'
    },
    columns: {
      type: [String],
      default: ['To Do', 'In Progress', 'Done']
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    publicInviteCode: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  invites: [{
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
      required: true
    },
    expiresAt: {
      type: Date,
      default: function() {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      }
    },
    maxUses: {
      type: Number,
      default: null
    },
    usedCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, 'Note cannot exceed 200 characters'],
      default: ''
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true
});

projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ 'invites.code': 1 });
projectSchema.index({ 'invites.expiresAt': 1 });

projectSchema.pre('save', function(next) {
  if (this.settings.isPublic && !this.settings.publicInviteCode) {
    this.settings.publicInviteCode = this.generateInviteCode(8);
  }
  next();
});

projectSchema.methods.generateInviteCode = function(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

projectSchema.methods.createInvite = async function(options) {
  const { createdBy, role = 'member', expiresInDays = 7, maxUses = null, note = '' } = options;
  
  let code;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    code = this.generateInviteCode(10);
    const existingInvite = this.invites.find(inv => inv.code === code);
    if (!existingInvite) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Не удалось сгенерировать уникальный код инвайта');
  }
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  const invite = {
    code,
    createdBy,
    role,
    expiresAt,
    maxUses,
    isActive: true,
    note: note.trim()
  };
  
  this.invites.push(invite);
  await this.save();
  
  return invite;
};

projectSchema.methods.acceptInvite = async function(code, userId) {
  const invite = this.invites.find(inv => 
    inv.code === code && 
    inv.isActive === true &&
    (inv.maxUses === null || inv.usedCount < inv.maxUses) &&
    new Date(inv.expiresAt) > new Date()
  );
  
  if (!invite) {
    return { success: false, message: 'Инвайт не найден или недействителен' };
  }
  
  const isAlreadyMember = this.members.some(member => 
    member.user.toString() === userId.toString()
  );
  
  if (isAlreadyMember) {
    return { success: false, message: 'Вы уже являетесь участником этого проекта' };
  }
  
  const permissions = this.getPermissionsByRole(invite.role);
  
  this.members.push({
    user: userId,
    role: invite.role,
    permissions: permissions,
    invitedBy: invite.createdBy
  });
  
  invite.usedCount++;
  
  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
    invite.isActive = false;
  }
  
  await this.save();
  
  return { 
    success: true, 
    message: 'Приглашение успешно принято',
    role: invite.role,
    project: this 
  };
};

projectSchema.methods.getPermissionsByRole = function(role) {
  const permissions = {
    owner: { canEdit: true, canDelete: true, canInvite: true },
    admin: { canEdit: true, canDelete: true, canInvite: true },
    member: { canEdit: true, canDelete: false, canInvite: false },
    viewer: { canEdit: false, canDelete: false, canInvite: false }
  };
  
  return permissions[role] || permissions.member;
};

projectSchema.methods.deactivateInvite = async function(code) {
  const invite = this.invites.find(inv => inv.code === code);
  if (invite) {
    invite.isActive = false;
    await this.save();
    return true;
  }
  return false;
};

// Метод для проверки прав пользователя
projectSchema.methods.checkUserPermission = function(userId, permission) {
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    return false;
  }
  
  return member.permissions[permission] || false;
};

export default mongoose.model('Project', projectSchema);
