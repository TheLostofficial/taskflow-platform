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
    const response = await api.get(`/project/${projectId}`);
    return response;
  },

  async createTask(taskData) {
    const response = await api.post('/', taskData);
    return response;
  },

  async updateTask(taskId, taskData) {
    const response = await api.put(`/${taskId}`, taskData);
    return response;
  },

  async deleteTask(taskId) {
    const response = await api.delete(`/${taskId}`);
    return response;
  }
};

export default taskService;