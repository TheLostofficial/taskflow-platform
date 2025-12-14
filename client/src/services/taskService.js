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
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const taskService = {
  async getProjectTasks(projectId) {
    const response = await api.get(`/projects/${projectId}/tasks`);
    return response;
  },

  async createTask(taskData) {
    const response = await api.post('/tasks', taskData);
    return response;
  },

  async getTaskById(taskId) {
    const response = await api.get(`/tasks/${taskId}`);
    return response;
  },

  async updateTask(taskId, taskData) {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response;
  },

  async deleteTask(taskId) {
    const response = await api.delete(`/tasks/${taskId}`);
    return response;
  },

  async updateTaskStatus(taskId, { status, position }) {
    const response = await api.put(`/tasks/${taskId}/status`, {
      status,
      position
    });
    return response;
  },

  async getUserTaskStats() {
    const response = await api.get('/tasks/stats/user');
    return response;
  },

  async getProjectStats(projectId, timeRange = 'month') {
    const response = await api.get(`/projects/${projectId}/stats`, {
      params: { timeRange }
    });
    return response;
  },

  async getRecentActivity() {
    const response = await api.get('/tasks/activity/recent');
    return response;
  },

  async addComment(taskId, commentData) {
    const response = await api.post(`/tasks/${taskId}/comments`, commentData);
    return response;
  }
};

export default taskService;