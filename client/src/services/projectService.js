import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: `${API_URL}/projects`,
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

export const projectService = {
  async getProjects() {
    const response = await api.get('/');
    return response;
  },

  async getProjectById(projectId) {
    const response = await api.get(`/${projectId}`);
    return response;
  },

  async createProject(projectData) {
    const response = await api.post('/', projectData);
    return response;
  },

  async updateProject(projectId, projectData) {
    const response = await api.put(`/${projectId}`, projectData);
    return response;
  },

  async deleteProject(projectId) {
    const response = await api.delete(`/${projectId}`);
    return response;
  },

  async getProjectTasks(projectId) {
    const response = await api.get(`/${projectId}/tasks`);
    return response;
  },

  async getProjectMembers(projectId) {
    const response = await api.get(`/${projectId}/members`);
    return response;
  }
};

export default projectService;