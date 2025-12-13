import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: `${API_URL}/tasks`,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 429) {
      console.log('⚠️ Too many requests, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return Promise.reject(error);
  }
);

const requestCache = new Map();
const CACHE_DURATION = 30000;

const getCacheKey = (url, params) => {
  return `${url}_${JSON.stringify(params || {})}`;
};

export const taskService = {
  async getProjectTasks(projectId) {
    const cacheKey = getCacheKey(`/project/${projectId}`);
    const cached = requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Используем кэшированные задачи для проекта ${projectId}`);
      return cached.response;
    }
    
    const response = await api.get(`/project/${projectId}`);
    
    requestCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    return response;
  },

  async createTask(taskData) {
    const response = await api.post('/', taskData);
    
    const projectId = taskData.project;
    const cacheKey = getCacheKey(`/project/${projectId}`);
    requestCache.delete(cacheKey);
    
    return response;
  },

  async updateTask(taskId, taskData) {
    const response = await api.put(`/${taskId}`, taskData);
    
    requestCache.clear();
    
    return response;
  },

  async deleteTask(taskId) {
    const response = await api.delete(`/${taskId}`);
    
    requestCache.clear();
    
    return response;
  },

  async getUserTaskStats() {
    const cacheKey = getCacheKey('/stats/user');
    const cached = requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Используем кэшированную статистику пользователя');
      return cached.response;
    }
    
    const response = await api.get('/stats/user');
    
    requestCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    return response;
  },

  async getProjectStats(projectId, timeRange = 'month') {
    const cacheKey = getCacheKey(`/stats/project/${projectId}`, { timeRange });
    const cached = requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Используем кэшированную статистику для проекта ${projectId}`);
      return cached.response;
    }
    
    const response = await api.get(`/stats/project/${projectId}?timeRange=${timeRange}`);
    
    requestCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    return response;
  },

  async getRecentActivity() {
    const cacheKey = getCacheKey('/activity/recent');
    const cached = requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Используем кэшированную активность');
      return cached.response;
    }
    
    const response = await api.get('/activity/recent');
    
    requestCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    return response;
  },

  async addComment(taskId, commentData) {
    const response = await api.post(`/${taskId}/comments`, commentData);
    
    requestCache.clear();
    
    return response;
  },

  async updateComment(taskId, commentId, commentData) {
    const response = await api.put(`/${taskId}/comments/${commentId}`, commentData);
    
    requestCache.clear();
    
    return response;
  },

  async deleteComment(taskId, commentId) {
    const response = await api.delete(`/${taskId}/comments/${commentId}`);
    
    requestCache.clear();
    
    return response;
  },

  async updateTaskStatus(taskId, statusData) {
    const response = await api.patch(`/${taskId}/status`, statusData);
    
    requestCache.clear();
    
    return response;
  },

  async updateChecklist(taskId, checklistData) {
    const response = await api.patch(`/${taskId}/checklist`, checklistData);
    
    requestCache.clear();
    
    return response;
  }
};

export default taskService;