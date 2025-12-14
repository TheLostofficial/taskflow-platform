import Project from '../models/Project.js';
import Task from '../models/Task.js';

export const createProject = async (req, res) => {
  try {
    const { name, description, tags, settings = {} } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    // Проверяем, существует ли уже проект с таким именем у этого пользователя
    const existingProject = await Project.findOne({
      name: name.trim(),
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });

    if (existingProject) {
      return res.status(400).json({ 
        message: 'You already have a project with this name' 
      });
    }

    // Определяем колонки по шаблону
    let columns = ['To Do', 'In Progress', 'Done'];
    if (settings.template === 'scrum') {
      columns = ['Backlog', 'Sprint Planning', 'In Progress', 'Review', 'Done'];
    } else if (settings.template === 'custom') {
      columns = settings.columns || ['To Do', 'In Progress', 'Done'];
    }

    const project = new Project({
      name: name.trim(),
      description: description?.trim() || '',
      owner: req.user._id,
      tags: tags || [],
      settings: {
        template: settings.template || 'kanban',
        columns: columns,
        isPublic: settings.isPublic || false,
        ...settings
      },
      members: [{
        user: req.user._id,
        role: 'owner',
        permissions: { 
          canEdit: true, 
          canDelete: true, 
          canInvite: true 
        },
        joinedAt: new Date()
      }]
    });

    await project.save();

    // Правильное populate после сохранения
    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyProjectUpdated(populatedProject, req.user._id);
    }

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Project with this name already exists' 
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating project', 
      error: error.message 
    });
  }
};

export const getProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('📡 [GET] Запрос проектов для пользователя:', userId);

    // Ищем проекты, где пользователь является владельцем или членом
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    console.log('✅ [GET] Найдено проектов:', projects.length);

    // Получаем количество задач для каждого проекта
    const projectsWithTaskCount = await Promise.all(
      projects.map(async (project) => {
        try {
          // Используем Task.find() вместо Task.countDocuments()
          const tasks = await Task.find({ project: project._id });
          const taskCount = tasks.length;
          const projectObj = project.toObject();
          return {
            ...projectObj,
            taskCount
          };
        } catch (taskError) {
          console.error(`❌ [GET] Ошибка подсчета задач для проекта ${project._id}:`, taskError);
          const projectObj = project.toObject();
          return {
            ...projectObj,
            taskCount: 0
          };
        }
      })
    );

    res.json({
      message: 'Projects fetched successfully',
      projects: projectsWithTaskCount
    });
  } catch (error) {
    console.error('❌ [GET] Ошибка загрузки проектов:', error);
    console.error('❌ [GET] Детали ошибки:', error.stack);
    
    res.status(500).json({ 
      message: 'Error fetching projects', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Ключевое исправление: используем req.params.id вместо req.params.projectId
export const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено с req.params.projectId
    const userId = req.user._id;

    console.log('📡 [GET] Запрос проекта ID:', projectId);
    console.log('👤 [GET] Пользователь ID:', userId);

    if (!projectId || projectId === 'undefined') {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const project = await Project.findById(projectId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) {
      console.log('❌ [GET] Проект не найден в базе данных');
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('✅ [GET] Проект найден:', project.name);

    // Проверяем доступ - упрощенная логика
    const isMember = project.members.some(member => {
      // Обрабатываем разные форматы member.user
      const memberId = member.user?._id?.toString() || member.user?.toString();
      return memberId === userId.toString();
    });

    const isOwner = project.owner._id.toString() === userId.toString();

    console.log('👑 [GET] Пользователь владелец?', isOwner);
    console.log('👥 [GET] Пользователь участник?', isMember);
    console.log('🌐 [GET] Проект публичный?', project.settings?.isPublic);

    if (!isOwner && !isMember && !project.settings?.isPublic) {
      console.log('🚫 [GET] Доступ запрещен');
      return res.status(403).json({ 
        message: 'Access denied to this project' 
      });
    }

    // Получаем количество задач
    const tasks = await Task.find({ project: project._id });
    const taskCount = tasks.length;
    const projectObj = project.toObject();
    projectObj.taskCount = taskCount;

    console.log('📊 [GET] Количество задач:', taskCount);

    res.json({
      message: 'Project fetched successfully',
      project: projectObj
    });
  } catch (error) {
    console.error('❌ [GET] Ошибка загрузки проекта:', error);
    console.error('❌ [GET] Детали ошибки:', error.stack);
    
    res.status(500).json({ 
      message: 'Error fetching project', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Также исправляем в updateProject
export const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено
    const updateData = req.body;
    const userId = req.user._id;

    console.log('✏️ [PUT] Обновление проекта:', projectId);
    console.log('✏️ [PUT] Данные обновления:', updateData);

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === userId.toString();
    });

    if (!member || !member.permissions?.canEdit) {
      return res.status(403).json({ 
        message: 'No permission to edit this project' 
      });
    }

    // Обновляем поля
    if (updateData.name !== undefined) project.name = updateData.name.trim();
    if (updateData.description !== undefined) project.description = updateData.description.trim();
    if (updateData.tags !== undefined) project.tags = updateData.tags;
    if (updateData.status !== undefined) project.status = updateData.status;
    
    if (updateData.settings) {
      project.settings = { ...project.settings, ...updateData.settings };
      
      // Если меняем шаблон, обновляем колонки
      if (updateData.settings.template) {
        if (updateData.settings.template === 'scrum') {
          project.settings.columns = ['Backlog', 'Sprint Planning', 'In Progress', 'Review', 'Done'];
        } else if (updateData.settings.template === 'kanban') {
          project.settings.columns = ['To Do', 'In Progress', 'Done'];
        }
      }
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyProjectUpdated(populatedProject, userId);
    }

    res.json({
      message: 'Project updated successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('❌ [PUT] Ошибка обновления проекта:', error);
    res.status(500).json({ 
      message: 'Error updating project', 
      error: error.message 
    });
  }
};

// Также исправляем в deleteProject
export const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено
    const userId = req.user._id;

    console.log('🗑️ [DELETE] Удаление проекта:', projectId);

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права (только владелец может удалить)
    const isOwner = project.owner._id.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ 
        message: 'Only project owner can delete project' 
      });
    }

    // Удаляем все задачи проекта
    await Task.deleteMany({ project: project._id });
    
    // Удаляем проект
    await project.deleteOne();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyProjectDeleted(projectId, userId);
    }

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('❌ [DELETE] Ошибка удаления проекта:', error);
    res.status(500).json({ 
      message: 'Error deleting project', 
      error: error.message 
    });
  }
};

// Остальные функции с исправленными параметрами
export const addProjectMember = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено
    const { userId, role = 'member' } = req.body;
    const currentUserId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const currentMember = project.members.find(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === currentUserId.toString();
    });

    if (!currentMember || !currentMember.permissions?.canInvite) {
      return res.status(403).json({ 
        message: 'No permission to add members' 
      });
    }

    // Проверяем, не является ли уже участником
    const isAlreadyMember = project.members.some(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === userId.toString();
    });

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    const permissions = project.getPermissionsByRole(role);

    project.members.push({
      user: userId,
      role,
      permissions,
      invitedBy: currentUserId,
      joinedAt: new Date()
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyMemberJoined(projectId, userId);
      socketServer.sendToUser(userId, 'notification', {
        title: 'Приглашение принято',
        message: `Вы добавлены в проект "${project.name}"`,
        type: 'info'
      });
    }

    res.json({
      message: 'Member added successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('❌ [POST] Ошибка добавления участника:', error);
    res.status(500).json({ 
      message: 'Error adding member', 
      error: error.message 
    });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const currentMember = project.members.find(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === currentUserId.toString();
    });

    if (!currentMember || !currentMember.permissions?.canInvite) {
      return res.status(403).json({ 
        message: 'No permission to remove members' 
      });
    }

    // Нельзя удалить владельца
    const memberToRemove = project.members.find(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === userId.toString();
    });

    if (memberToRemove && memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Нельзя удалить себя если ты владелец и это последний владелец
    if (userId.toString() === currentUserId.toString() && 
        currentMember.role === 'owner') {
      const ownerCount = project.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot remove the only project owner' 
        });
      }
    }

    project.members = project.members.filter(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId !== userId.toString();
    });

    await project.save();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyMemberLeft(projectId, userId);
    }

    res.json({
      message: 'Member removed successfully',
      project
    });
  } catch (error) {
    console.error('❌ [DELETE] Ошибка удаления участника:', error);
    res.status(500).json({ 
      message: 'Error removing member', 
      error: error.message 
    });
  }
};

export const createInvite = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено
    const { role = 'member', expiresInDays = 7, maxUses = null, note = '' } = req.body;
    const userId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === userId.toString();
    });

    if (!member || !member.permissions?.canInvite) {
      return res.status(403).json({ 
        message: 'No permission to create invites' 
      });
    }

    const invite = await project.createInvite({
      createdBy: userId,
      role,
      expiresInDays,
      maxUses,
      note
    });

    res.json({
      message: 'Invite created successfully',
      invite
    });
  } catch (error) {
    console.error('❌ [POST] Ошибка создания инвайта:', error);
    res.status(500).json({ 
      message: 'Error creating invite', 
      error: error.message 
    });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    const project = await Project.findOne({ 'invites.code': code });

    if (!project) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    const result = await project.acceptInvite(code, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyMemberJoined(project._id, userId);
    }

    res.json({
      message: result.message,
      project: populatedProject
    });
  } catch (error) {
    console.error('❌ [GET] Ошибка принятия инвайта:', error);
    res.status(500).json({ 
      message: 'Error accepting invite', 
      error: error.message 
    });
  }
};

export const getProjectInvites = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено
    const userId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === userId.toString();
    });

    if (!member || !member.permissions?.canInvite) {
      return res.status(403).json({ 
        message: 'No permission to view invites' 
      });
    }

    res.json({
      message: 'Invites fetched successfully',
      invites: project.invites
    });
  } catch (error) {
    console.error('❌ [GET] Ошибка получения инвайтов:', error);
    res.status(500).json({ 
      message: 'Error fetching invites', 
      error: error.message 
    });
  }
};

export const deactivateInvite = async (req, res) => {
  try {
    const projectId = req.params.id; // Исправлено
    const { code } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => {
      const memberId = m.user?._id?.toString() || m.user?.toString();
      return memberId === userId.toString();
    });

    if (!member || !member.permissions?.canInvite) {
      return res.status(403).json({ 
        message: 'No permission to deactivate invites' 
      });
    }

    const success = await project.deactivateInvite(code);

    if (!success) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    res.json({
      message: 'Invite deactivated successfully'
    });
  } catch (error) {
    console.error('❌ [DELETE] Ошибка деактивации инвайта:', error);
    res.status(500).json({ 
      message: 'Error deactivating invite', 
      error: error.message 
    });
  }
};

// Экспортируем все функции
export default {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  createInvite,
  acceptInvite,
  getProjectInvites,
  deactivateInvite
};