import Project from '../models/Project.js';

export const createProject = async (req, res) => {
  try {
    const { name, description, tags, settings = {} } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = new Project({
      name,
      description: description || '',
      owner: req.user._id,
      tags: tags || [],
      settings: {
        template: settings.template || 'kanban',
        columns: settings.columns || ['To Do', 'In Progress', 'Done'],
        isPublic: settings.isPublic || false,
        ...settings
      },
      members: [{
        user: req.user._id,
        role: 'owner',
        permissions: { canEdit: true, canDelete: true, canInvite: true }
      }]
    });

    await project.save();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyProjectUpdated(project, req.user._id);
    }

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Error creating project', error: error.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id
    })
      .populate('members.user', 'name email avatar')
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 });

    res.json({
      message: 'Projects fetched successfully',
      projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate('members.user', 'name email avatar')
      .populate('owner', 'name email')
      .populate('invites.createdBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем доступ
    const isMember = project.members.some(member => 
      member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember && !project.settings.isPublic) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    res.json({
      message: 'Project fetched successfully',
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Error fetching project', error: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const updateData = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canEdit) {
      return res.status(403).json({ message: 'No permission to edit this project' });
    }

    // Обновляем поля
    Object.keys(updateData).forEach(key => {
      if (key === 'settings' && updateData[key]) {
        project.settings = { ...project.settings, ...updateData[key] };
      } else if (key !== '_id' && key !== 'owner') {
        project[key] = updateData[key];
      }
    });

    await project.save();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyProjectUpdated(project, req.user._id);
    }

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права (только владелец может удалить)
    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Only project owner can delete project' });
    }

    await project.deleteOne();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyProjectDeleted(projectId, req.user._id);
    }

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Error deleting project', error: error.message });
  }
};

export const addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role = 'member' } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const currentMember = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!currentMember || !currentMember.permissions.canInvite) {
      return res.status(403).json({ message: 'No permission to add members' });
    }

    // Проверяем, не является ли уже участником
    const isAlreadyMember = project.members.some(m => 
      m.user.toString() === userId.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    const permissions = project.getPermissionsByRole(role);

    project.members.push({
      user: userId,
      role,
      permissions,
      invitedBy: req.user._id
    });

    await project.save();

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
      project
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Error adding member', error: error.message });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const currentMember = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!currentMember || !currentMember.permissions.canInvite) {
      return res.status(403).json({ message: 'No permission to remove members' });
    }

    // Нельзя удалить владельца
    const memberToRemove = project.members.find(m => 
      m.user.toString() === userId.toString()
    );

    if (memberToRemove && memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Нельзя удалить себя если ты владелец и это последний владелец
    if (userId.toString() === req.user._id.toString() && 
        currentMember.role === 'owner') {
      const ownerCount = project.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Cannot remove the only project owner' });
      }
    }

    project.members = project.members.filter(m => 
      m.user.toString() !== userId.toString()
    );

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
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Error removing member', error: error.message });
  }
};

export const createInvite = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role = 'member', expiresInDays = 7, maxUses = null, note = '' } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canInvite) {
      return res.status(403).json({ message: 'No permission to create invites' });
    }

    const invite = await project.createInvite({
      createdBy: req.user._id,
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
    console.error('Create invite error:', error);
    res.status(500).json({ message: 'Error creating invite', error: error.message });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { code } = req.params;

    const project = await Project.findOne({ 'invites.code': code });

    if (!project) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    const result = await project.acceptInvite(code, req.user._id);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyMemberJoined(project._id, req.user._id);
    }

    res.json({
      message: result.message,
      project: result.project
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ message: 'Error accepting invite', error: error.message });
  }
};

export const getProjectInvites = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).select('invites');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canInvite) {
      return res.status(403).json({ message: 'No permission to view invites' });
    }

    res.json({
      message: 'Invites fetched successfully',
      invites: project.invites
    });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ message: 'Error fetching invites', error: error.message });
  }
};

export const deactivateInvite = async (req, res) => {
  try {
    const { projectId, code } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Проверяем права
    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canInvite) {
      return res.status(403).json({ message: 'No permission to deactivate invites' });
    }

    const success = await project.deactivateInvite(code);

    if (!success) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    res.json({
      message: 'Invite deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate invite error:', error);
    res.status(500).json({ message: 'Error deactivating invite', error: error.message });
  }
};