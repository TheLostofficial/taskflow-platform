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
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 429) {
      console.log('⚠️ Too many project requests, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return Promise.reject(error);
  }
);

// Кэширование запросов проектов
const projectCache = new Map();
const PROJECT_CACHE_DURATION = 60000; // 60 секунд

export const projectService = {
  async getProjects() {
    const cacheKey = 'all_projects';
    const cached = projectCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < PROJECT_CACHE_DURATION) {
      console.log('📦 Используем кэшированные проекты');
      return cached.response;
    }
    
    const response = await api.get('/');
    
    projectCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    return response;
  },

  async getProjectById(projectId) {
    const cacheKey = `project_${projectId}`;
    const cached = projectCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < PROJECT_CACHE_DURATION) {
      console.log(`📦 Используем кэшированный проект ${projectId}`);
      return cached.response;
    }
    
    const response = await api.get(`/${projectId}`);
    
    projectCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    return response;
  },

  async createProject(projectData) {
    const response = await api.post('/', projectData);
    
    // Очищаем кэш всех проектов
    projectCache.clear();
    
    return response;
  },

  async updateProject(projectId, projectData) {
    const response = await api.put(`/${projectId}`, projectData);
    
    // Очищаем кэш этого проекта и всех проектов
    projectCache.delete(`project_${projectId}`);
    projectCache.delete('all_projects');
    
    return response;
  },

  async deleteProject(projectId) {
    const response = await api.delete(`/${projectId}`);
    
    // Очищаем кэш
    projectCache.clear();
    
    return response;
  },

  async archiveProject(projectId) {
    const response = await api.patch(`/${projectId}/archive`);
    
    projectCache.delete(`project_${projectId}`);
    projectCache.delete('all_projects');
    
    return response;
  },

  async updateMemberRole(projectId, userId, role) {
    const response = await api.patch(`/${projectId}/members/${userId}`, { role });
    
    projectCache.delete(`project_${projectId}`);
    
    return response;
  },

  clearCache() {
    projectCache.clear();
  }
};

export default projectService;