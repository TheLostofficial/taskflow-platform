import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

const router = express.Router();

// Создать инвайт - УБРАЛИ /projects из пути
router.post('/:projectId/invites', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role, expiresInDays, maxUses, note } = req.body;
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id, 'members.permissions.canInvite': true }
      ]
    });
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Проект не найден или у вас нет прав для создания инвайтов' 
      });
    }
    
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Недопустимая роль. Допустимые значения: admin, member, viewer' 
      });
    }
    
    const invite = await project.createInvite({
      createdBy: req.user._id,
      role,
      expiresInDays: expiresInDays || 7,
      maxUses: maxUses || null,
      note: note || ''
    });
    
    res.status(201).json({
      message: 'Инвайт успешно создан',
      invite: {
        code: invite.code,
        role: invite.role,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
        isActive: invite.isActive,
        note: invite.note,
        createdAt: invite.createdAt
      },
      inviteUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/invite/${invite.code}`
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании инвайта' });
  }
});

// Получить инвайты проекта - УБРАЛИ /projects из пути
router.get('/:projectId/invites', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Проект не найден или у вас нет доступа' 
      });
    }
    
    const formattedInvites = project.invites.map(invite => ({
      id: invite._id,
      code: invite.code,
      role: invite.role,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
      isActive: invite.isActive,
      note: invite.note,
      createdAt: invite.createdAt,
      createdBy: invite.createdBy
    }));
    
    res.json({
      message: 'Инвайты успешно получены',
      invites: formattedInvites
    });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении инвайтов' });
  }
});

// Удалить инвайт - УБРАЛИ /projects из пути
router.delete('/:projectId/invites/:code', authenticateToken, async (req, res) => {
  try {
    const { projectId, code } = req.params;
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id, 'members.permissions.canInvite': true }
      ]
    });
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Проект не найден или у вас нет прав для управления инвайтами' 
      });
    }
    
    const success = await project.deactivateInvite(code);
    
    if (!success) {
      return res.status(404).json({ 
        message: 'Инвайт не найден' 
      });
    }
    
    res.json({
      message: 'Инвайт успешно деактивирован'
    });
  } catch (error) {
    console.error('Deactivate invite error:', error);
    res.status(500).json({ message: 'Ошибка сервера при деактивации инвайта' });
  }
});

// Остальные маршруты остаются без изменений
router.get('/invites/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    
    const project = await Project.findOne({
      'invites.code': code,
      'invites.isActive': true
    })
    .populate('owner', 'name email')
    .populate('invites.createdBy', 'name email');
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Инвайт не найден или недействителен' 
      });
    }
    
    const invite = project.invites.find(inv => inv.code === code);
    
    if (new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ 
        message: 'Срок действия инвайта истёк' 
      });
    }
    
    if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
      return res.status(400).json({ 
        message: 'Лимит использований инвайта исчерпан' 
      });
    }
    
    const isAlreadyMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(400).json({ 
        message: 'Вы уже являетесь участником этого проекта' 
      });
    }
    
    res.json({
      message: 'Информация об инвайте получена',
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        owner: project.owner
      },
      invite: {
        code: invite.code,
        role: invite.role,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
        note: invite.note,
        createdBy: invite.createdBy
      },
      isAlreadyMember
    });
  } catch (error) {
    console.error('Get invite info error:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении информации об инвайте' });
  }
});

router.post('/invites/:code/accept', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    
    const project = await Project.findOne({
      'invites.code': code,
      'invites.isActive': true
    });
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Инвайт не найден или недействителен' 
      });
    }
    
    const result = await project.acceptInvite(code, req.user._id);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.message 
      });
    }
    
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');
    
    res.json({
      message: result.message,
      project: result.project,
      role: result.role
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ message: 'Ошибка сервера при принятии инвайта' });
  }
});

router.get('/public-invites/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const project = await Project.findOne({
      $or: [
        { 'invites.code': code, 'invites.isActive': true },
        { 'settings.publicInviteCode': code }
      ]
    })
    .populate('owner', 'name email');
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Инвайт не найден или недействителен' 
      });
    }
    
    let inviteInfo = null;
    
    const privateInvite = project.invites.find(inv => inv.code === code);
    if (privateInvite) {
      if (new Date(privateInvite.expiresAt) < new Date()) {
        return res.status(400).json({ 
          message: 'Срок действия инвайта истёк' 
        });
      }
      
      if (privateInvite.maxUses !== null && privateInvite.usedCount >= privateInvite.maxUses) {
        return res.status(400).json({ 
          message: 'Лимит использований инвайта исчерпан' 
        });
      }
      
      inviteInfo = {
        type: 'private',
        role: privateInvite.role,
        expiresAt: privateInvite.expiresAt,
        maxUses: privateInvite.maxUses,
        usedCount: privateInvite.usedCount
      };
    }
    
    if (project.settings.publicInviteCode === code && project.settings.isPublic) {
      inviteInfo = {
        type: 'public',
        role: 'member',
        expiresAt: null,
        maxUses: null,
        usedCount: project.members.length - 1
      };
    }
    
    if (!inviteInfo) {
      return res.status(404).json({ 
        message: 'Инвайт не найден или недействителен' 
      });
    }
    
    res.json({
      message: 'Информация об инвайте получена',
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        owner: project.owner,
        settings: {
          isPublic: project.settings.isPublic
        }
      },
      invite: inviteInfo
    });
  } catch (error) {
    console.error('Get public invite error:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении информации об инвайте' });
  }
});

export default router;