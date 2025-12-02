import User from '../models/User.js';
import Project from '../models/Project.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile fetched successfully',
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, bio, skills, preferences } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    await user.save();

    const userResponse = await User.findById(req.user._id).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('_id name email avatar bio skills')
      .sort({ name: 1 });

    res.json({
      message: 'Users fetched successfully',
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('_id name email avatar bio skills createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User fetched successfully',
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        message: 'Search query too short',
        users: []
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('_id name email avatar')
      .limit(10);

    res.json({
      message: 'Users search completed',
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Error searching users', error: error.message });
  }
};

export const getUserProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id,
      status: 'active'
    })
      .populate('members.user', 'name email avatar')
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 });

    res.json({
      message: 'User projects fetched successfully',
      projects
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ message: 'Error fetching user projects', error: error.message });
  }
};

export const getUserActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Получаем проекты пользователя
    const projects = await Project.find({
      'members.user': req.user._id
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    // Получаем задачи, где пользователь создатель или назначен
    const userTasks = await require('../models/Task.js').find({
      $or: [
        { creator: req.user._id },
        { assignee: req.user._id },
        { project: { $in: projectIds } }
      ]
    })
      .populate('project', 'name')
      .populate('creator', 'name')
      .populate('assignee', 'name')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      message: 'User activity fetched successfully',
      activities: userTasks
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Error fetching user activity', error: error.message });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Обновляем аватар (предполагается, что файл загружен через multer)
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    const userResponse = await User.findById(req.user._id).select('-password');

    res.json({
      message: 'Avatar updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Error updating avatar', error: error.message });
  }
};

export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.avatar = null;
    await user.save();

    const userResponse = await User.findById(req.user._id).select('-password');

    res.json({
      message: 'Avatar deleted successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ message: 'Error deleting avatar', error: error.message });
  }
};