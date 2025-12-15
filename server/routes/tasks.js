import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as taskController from '../controllers/taskController.js';

const router = express.Router();

// ✅ Получить задачи проекта (альтернативный маршрут)
router.get('/project/:projectId', authenticateToken, taskController.getProjectTasks);

// ✅ Создать задачу
router.post('/', authenticateToken, taskController.createTask);

// ✅ Получить задачу по ID
router.get('/:taskId', authenticateToken, taskController.getTaskById);

// ✅ Обновить задачу
router.put('/:taskId', authenticateToken, taskController.updateTask);

// ✅ Удалить задачу
router.delete('/:taskId', authenticateToken, taskController.deleteTask);

// ✅ Обновить статус задачи (для drag & drop)
router.patch('/:taskId/status', authenticateToken, taskController.updateTaskStatus);

// ✅ Обновить чеклист
router.patch('/:taskId/checklist', authenticateToken, taskController.updateChecklist);

// ✅ Добавить комментарий к задаче (с поддержкой файлов)
router.post('/:taskId/comments', 
  authenticateToken, 
  taskController.uploadFiles,
  taskController.addComment
);

// ✅ Получить комментарии задачи
router.get('/:taskId/comments', authenticateToken, taskController.getTaskComments);

// ✅ Обновить комментарий
router.put('/:taskId/comments/:commentId', authenticateToken, taskController.updateComment);

// ✅ Удалить комментарий
router.delete('/:taskId/comments/:commentId', authenticateToken, taskController.deleteComment);

// ✅ Получить статистику пользователя
router.get('/stats/user', authenticateToken, taskController.getUserTaskStats);

// ✅ Получить статистику проекта
router.get('/stats/project/:projectId', authenticateToken, taskController.getProjectStats);

// ✅ Получить последнюю активность
router.get('/activity/recent', authenticateToken, taskController.getRecentActivity);

export default router;
