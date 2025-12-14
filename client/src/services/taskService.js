import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 [TASK] Добавлен токен в заголовок запроса ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('❌ [TASK] Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ [TASK] Response ${response.config.method.toUpperCase()} ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error(`❌ [TASK] Response error ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const taskService = {
  async getProjectTasks(projectId) {
    console.log(`📡 [TASK] Получение задач проекта ${projectId}...`);
    try {
      // ✅ Исправлено: теперь используем правильный endpoint
      const response = await api.get(`/projects/${projectId}/tasks`);
      console.log(`✅ [TASK] Задачи проекта ${projectId} загружены: ${response.data.tasks?.length || 0} задач`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка загрузки задач проекта ${projectId}:`, error);
      throw error;
    }
  },

  async createTask(taskData) {
    console.log(`📝 [TASK] Создание задачи: ${taskData.title}`);
    try {
      const response = await api.post('/tasks', taskData);
      console.log(`✅ [TASK] Задача создана: ${response.data.task?.title}`);
      return response;
    } catch (error) {
      console.error('❌ [TASK] Ошибка создания задачи:', error);
      throw error;
    }
  },

  async getTaskById(taskId) {
    console.log(`📡 [TASK] Получение задачи ${taskId}...`);
    try {
      const response = await api.get(`/tasks/${taskId}`);
      console.log(`✅ [TASK] Задача ${taskId} загружена: ${response.data.task?.title}`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка загрузки задачи ${taskId}:`, error);
      throw error;
    }
  },

  async updateTask(taskId, taskData) {
    console.log(`✏️ [TASK] Обновление задачи ${taskId}:`, taskData);
    try {
      // ✅ Исправлено: используем PUT для полного обновления
      const response = await api.put(`/tasks/${taskId}`, taskData);
      console.log(`✅ [TASK] Задача ${taskId} обновлена`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка обновления задачи ${taskId}:`, error);
      throw error;
    }
  },

  async deleteTask(taskId) {
    console.log(`🗑️ [TASK] Удаление задачи ${taskId}...`);
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      console.log(`✅ [TASK] Задача ${taskId} удалена`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка удаления задачи ${taskId}:`, error);
      throw error;
    }
  },

  async updateTaskStatus(taskId, { status, position }) {
    console.log(`🔄 [TASK] Обновление статуса задачи ${taskId} на ${status}`);
    try {
      // ✅ Исправлено: используем PATCH для обновления статуса
      const response = await api.patch(`/tasks/${taskId}/status`, {
        status,
        position
      });
      console.log(`✅ [TASK] Статус задачи ${taskId} обновлен на ${status}`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка обновления статуса задачи ${taskId}:`, error);
      throw error;
    }
  },

  async getUserTaskStats() {
    console.log(`📊 [TASK] Получение статистики пользователя...`);
    try {
      const response = await api.get('/tasks/stats/user');
      console.log(`✅ [TASK] Статистика пользователя загружена`);
      return response;
    } catch (error) {
      console.error('❌ [TASK] Ошибка загрузки статистики пользователя:', error);
      throw error;
    }
  },

  async getProjectStats(projectId, timeRange = 'month') {
    console.log(`📊 [TASK] Получение статистики проекта ${projectId}...`);
    try {
      const response = await api.get(`/projects/${projectId}/stats`, {
        params: { timeRange }
      });
      console.log(`✅ [TASK] Статистика проекта ${projectId} загружена`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка загрузки статистики проекта ${projectId}:`, error);
      throw error;
    }
  },

  async getRecentActivity() {
    console.log(`📈 [TASK] Получение последней активности...`);
    try {
      const response = await api.get('/tasks/activity/recent');
      console.log(`✅ [TASK] Последняя активность загружена: ${response.data.activities?.length || 0} записей`);
      return response;
    } catch (error) {
      console.error('❌ [TASK] Ошибка загрузки последней активности:', error);
      throw error;
    }
  },

  async addComment(taskId, commentData) {
    console.log(`💬 [TASK] Добавление комментария к задаче ${taskId}:`, commentData);
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, commentData);
      console.log(`✅ [TASK] Комментарий к задаче ${taskId} добавлен`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка добавления комментария к задаче ${taskId}:`, error);
      throw error;
    }
  },

  async updateComment(taskId, commentId, commentData) {
    console.log(`✏️ [TASK] Обновление комментария ${commentId} задачи ${taskId}`);
    try {
      const response = await api.put(`/tasks/${taskId}/comments/${commentId}`, commentData);
      console.log(`✅ [TASK] Комментарий ${commentId} задачи ${taskId} обновлен`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка обновления комментария ${commentId} задачи ${taskId}:`, error);
      throw error;
    }
  },

  async deleteComment(taskId, commentId) {
    console.log(`🗑️ [TASK] Удаление комментария ${commentId} задачи ${taskId}`);
    try {
      const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      console.log(`✅ [TASK] Комментарий ${commentId} задачи ${taskId} удален`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка удаления комментария ${commentId} задачи ${taskId}:`, error);
      throw error;
    }
  },

  async getTaskComments(taskId) {
    console.log(`📋 [TASK] Получение комментариев задачи ${taskId}...`);
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      console.log(`✅ [TASK] Комментарии задачи ${taskId} загружены: ${response.data.comments?.length || 0} комментариев`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка загрузки комментариев задачи ${taskId}:`, error);
      throw error;
    }
  },

  // Дополнительные методы для работы с задачами
  async getTasksByStatus(projectId, status) {
    console.log(`🎯 [TASK] Получение задач проекта ${projectId} со статусом ${status}...`);
    try {
      const response = await api.get(`/projects/${projectId}/tasks`, {
        params: { status }
      });
      console.log(`✅ [TASK] Задачи со статусом ${status} загружены: ${response.data.tasks?.length || 0} задач`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка загрузки задач со статусом ${status}:`, error);
      throw error;
    }
  },

  async updateTaskPosition(taskId, position, status) {
    console.log(`📌 [TASK] Обновление позиции задачи ${taskId} на ${position} (статус: ${status})`);
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, {
        position,
        status
      });
      console.log(`✅ [TASK] Позиция задачи ${taskId} обновлена`);
      return response;
    } catch (error) {
      console.error(`❌ [TASK] Ошибка обновления позиции задачи ${taskId}:`, error);
      throw error;
    }
  },

  // Метод для тестирования соединения
  async testConnection() {
    console.log('🔧 [TASK] Тестирование соединения...');
    try {
      const response = await api.get('/health');
      console.log('✅ [TASK] Соединение установлено:', response.data);
      return response;
    } catch (error) {
      console.error('❌ [TASK] Ошибка соединения:', error);
      throw error;
    }
  }
};

export default taskService;