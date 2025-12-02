import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/comments';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // максимум 5 файлов за раз
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла'), false);
    }
  }
});

router.get('/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await Task.findById(taskId)
      .populate('comments.author', 'name email avatar')
      .populate('comments.mentions', 'name email')
      .populate('comments.attachments.uploadedBy', 'name email');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const project = await Project.findOne({
      _id: task.project,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });
    
    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      message: 'Comments retrieved successfully',
      comments: task.comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error while fetching comments' });
  }
});

router.post('/tasks/:taskId/comments', authenticateToken, upload.array('attachments', 5), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content, mentions } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const project = await Project.findOne({
      _id: task.project,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });
    
    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/comments/${file.filename}`,
      uploadedBy: req.user._id,
      size: file.size
    })) : [];
    
    let mentionsArray = [];
    try {
      mentionsArray = mentions ? JSON.parse(mentions) : [];
    } catch (e) {
      mentionsArray = [];
    }
    
    const comment = await task.addComment({
      author: req.user._id,
      content: content.trim(),
      mentions: mentionsArray,
      attachments
    });
    
    await task.populate('comments.author', 'name email avatar');
    await task.populate('comments.mentions', 'name email');
    
    const addedComment = task.comments.id(comment._id);
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: addedComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ message: 'Server error while adding comment' });
  }
});

router.put('/tasks/:taskId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { content, mentions } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    let mentionsArray = [];
    try {
      mentionsArray = mentions ? JSON.parse(mentions) : [];
    } catch (e) {
      mentionsArray = [];
    }
    
    const updatedComment = await task.updateComment(commentId, {
      content: content.trim(),
      mentions: mentionsArray
    }, req.user._id);
    
    await task.populate('comments.author', 'name email avatar');
    await task.populate('comments.mentions', 'name email');
    
    const comment = task.comments.id(commentId);
    
    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    
    if (error.message === 'Comment not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Not authorized to edit this comment') {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error while updating comment' });
  }
});

router.delete('/tasks/:taskId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    await task.deleteComment(commentId, req.user._id);
    
    res.json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    
    if (error.message === 'Comment not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Not authorized to delete this comment') {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
});

router.get('/tasks/:taskId/comments/:commentId/attachments/:filename', authenticateToken, async (req, res) => {
  try {
    const { taskId, commentId, filename } = req.params;
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const project = await Project.findOne({
      _id: task.project,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });
    
    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const comment = task.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    const attachment = comment.attachments.find(att => att.filename === filename);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    const filePath = path.join('uploads/comments', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    res.download(filePath, attachment.originalName);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ message: 'Server error while downloading attachment' });
  }
});

export default router;