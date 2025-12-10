import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🔧 projectService: API_URL =', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 projectService: Token added to request');
  } else {
    console.warn('⚠️ projectService: No token found');
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('✅ projectService: Response received', response.status);
    return response;
  },
  (error) => {
    console.error('❌ projectService: Request failed', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    if (!error.response) {
      console.error('❌ projectService: No response from server (Network error)');
      console.error('💡 Tips:');
      console.error('   1. Check if server is running on port 5000');
      console.error('   2. Check if CORS is configured correctly');
      console.error('   3. Check if API URL is correct:', API_URL);
    }
    
    return Promise.reject(error);
  }
);

export const projectService = {
  // Получить все проекты пользователя
  getProjects: () => {
    console.log('📡 projectService: Fetching projects...');
    return api.get('/projects');
  },
  
  // Получить проект по ID
  getProjectById: (projectId) => {
    // Добавляем проверку ID
    if (!projectId || projectId === 'undefined') {
      console.error('❌ getProjectById: Invalid project ID');
      return Promise.reject(new Error('Invalid project ID'));
    }
    
    console.log(`📡 projectService: Fetching project ${projectId}...`);
    return api.get(`/projects/${projectId}`);
  },
  
  // Создать новый проект
  createProject: (projectData) => {
    console.log('📡 projectService: Creating project...', projectData);
    return api.post('/projects', projectData);
  },
  
  // Обновить проект
  updateProject: (projectId, projectData) => {
    console.log(`📡 projectService: Updating project ${projectId}...`);
    return api.put(`/projects/${projectId}`, projectData);
  },
  
  // Удалить проект
  deleteProject: (projectId) => {
    console.log(`📡 projectService: Deleting project ${projectId}...`);
    return api.delete(`/projects/${projectId}`);
  },
  
  // Архивировать проект
  archiveProject: (projectId) => {
    console.log(`📡 projectService: Archiving project ${projectId}...`);
    return api.patch(`/projects/${projectId}/archive`);
  },
  
  // Выйти из проекта
  leaveProject: (projectId) => {
    console.log(`📡 projectService: Leaving project ${projectId}...`);
    return api.post(`/projects/${projectId}/leave`);
  },
  
  // Пригласить участника
  inviteMember: (projectId, email) => {
    console.log(`📡 projectService: Inviting ${email} to project ${projectId}...`);
    return api.post(`/projects/${projectId}/invite`, { email });
  },
  
  // Удалить участника
  removeMember: (projectId, userId) => {
    console.log(`📡 projectService: Removing member ${userId} from project ${projectId}...`);
    return api.delete(`/projects/${projectId}/members/${userId}`);
  },
  
  // Обновить роль участника
  updateMemberRole: (projectId, userId, role) => {
    console.log(`📡 projectService: Updating role of ${userId} to ${role}...`);
    return api.patch(`/projects/${projectId}/members/${userId}`, { role });
  },
  
  // Получить задачи проекта
  getProjectTasks: (projectId, filters = {}) => {
    console.log(`📡 projectService: Fetching tasks for project ${projectId}...`);
    return api.get(`/projects/${projectId}/tasks`, { params: filters });
  },
  
  // Создать задачу в проекте
  createTask: (projectId, taskData) => {
    console.log(`📡 projectService: Creating task in project ${projectId}...`);
    return api.post(`/projects/${projectId}/tasks`, taskData);
  },
};

export default projectService;