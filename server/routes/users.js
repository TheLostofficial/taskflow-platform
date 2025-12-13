import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Настройка multer для загрузки аватаров
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/avatars';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.user._id + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Допустимы только изображения (jpeg, jpg, png, gif)'));
    }
  }
});

// Получить текущего пользователя
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      message: 'Профиль успешно получен',
      user
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении профиля' });
  }
});

// Обновить профиль
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, bio, skills, preferences } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (name && name.trim()) user.name = name.trim();
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    const updatedUser = await User.findById(req.user._id).select('-password');
    
    res.json({
      message: 'Профиль успешно обновлен',
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении профиля' });
  }
});

// Сменить пароль
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Текущий и новый пароль обязательны' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверяем текущий пароль
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Текущий пароль неверен' });
    }

    // Хешируем новый пароль
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({ message: 'Ошибка сервера при смене пароля' });
  }
});

// Получить настройки уведомлений
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      message: 'Настройки уведомлений получены',
      settings: user.preferences?.notifications || {
        emailNotifications: true,
        taskAssignments: true,
        mentions: true,
        deadlineReminders: true,
        projectUpdates: false
      }
    });
  } catch (error) {
    console.error('Ошибка получения настроек уведомлений:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении настроек уведомлений' });
  }
});

// Обновить настройки уведомлений
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (!user.preferences) {
      user.preferences = {};
    }
    
    user.preferences.notifications = settings;
    await user.save();

    res.json({
      message: 'Настройки уведомлений обновлены',
      settings: user.preferences.notifications
    });
  } catch (error) {
    console.error('Ошибка обновления настроек уведомлений:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении настроек уведомлений' });
  }
});

// Загрузить аватар
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Если у пользователя уже есть аватар, удаляем старый
    if (user.avatar && user.avatar !== 'default-avatar.png') {
      const oldAvatarPath = path.join('uploads/avatars', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    user.avatar = req.file.filename;
    await user.save();

    res.json({
      message: 'Аватар успешно загружен',
      avatarUrl: `/uploads/avatars/${req.file.filename}`
    });
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    res.status(500).json({ message: 'Ошибка сервера при загрузке аватара' });
  }
});

// Получить активность пользователя
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Активность пользователя',
      activity: []
    });
  } catch (error) {
    console.error('Ошибка получения активности:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении активности' });
  }
});

// Получить список пользователей (для назначения задач)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ status: 'active' })
      .select('_id name email avatar skills')
      .limit(50);
    
    res.json({
      message: 'Пользователи получены',
      users
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении пользователей' });
  }
});

export default router;
