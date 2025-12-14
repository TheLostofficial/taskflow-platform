import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: `${API_URL}/projects`,
});

// Подробное логирование запросов
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 [REQUEST] Добавлен токен в заголовок запроса');
    } else {
      console.warn('⚠️ [REQUEST] Токен не найден в localStorage');
    }
    console.log(`📡 [REQUEST] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ [REQUEST] Project service request error:', error);
    return Promise.reject(error);
  }
);

// Подробное логирование ответов
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [RESPONSE] ${response.config.method.toUpperCase()} ${response.config.url}:`, response.status);
    return response;
  },
  async (error) => {
    const url = error.config?.url || 'unknown';
    const method = error.config?.method || 'unknown';
    const fullUrl = error.config?.baseURL + url;
    
    console.error(`❌ [RESPONSE ERROR] ${method.toUpperCase()} ${fullUrl}:`);
    console.error('❌ [RESPONSE ERROR] Статус:', error.response?.status);
    console.error('❌ [RESPONSE ERROR] Данные:', error.response?.data);
    console.error('❌ [RESPONSE ERROR] Сообщение:', error.message);
    
    if (error.response?.status === 401) {
      console.log('🔒 [AUTH] Unauthorized access, redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      console.log('🚫 [AUTH] Access forbidden');
      // Можно отправить событие для показа уведомления в UI
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: {
          title: 'Доступ запрещен',
          message: 'У вас нет доступа к этому ресурсу',
          type: 'error'
        }
      }));
    } else if (error.response?.status === 404) {
      console.log('🔍 [RESPONSE] Resource not found');
    } else if (error.response?.status === 429) {
      console.log('⚠️ [RESPONSE] Too many project requests, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else if (error.code === 'ERR_NETWORK') {
      console.error('🌐 [NETWORK] Network error - server may be down');
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: {
          title: 'Ошибка соединения',
          message: 'Сервер недоступен. Проверьте подключение к интернету.',
          type: 'error'
        }
      }));
    }
    
    return Promise.reject(error);
  }
);

// Временно отключаем кэш
const projectCache = new Map();
const PROJECT_CACHE_DURATION = 0; // 0 секунд для отладки

// Вспомогательная функция для показа уведомлений
const showNotification = (title, message, type = 'info') => {
  // Отправляем событие для UI компонента уведомлений
  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: { title, message, type }
  }));
  
  // Также показываем стандартное браузерное уведомление, если доступно
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
};

export const projectService = {
  async getProjects() {
    const cacheKey = 'all_projects';
    const cached = projectCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < PROJECT_CACHE_DURATION) {
      console.log('📦 [CACHE] Using cached projects');
      return cached.response;
    }
    
    console.log('📡 [API] Fetching projects from server...');
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 [AUTH] Token exists:', !!token);
      
      const response = await api.get('/');
      console.log('✅ [API] Response status:', response.status);
      console.log('✅ [API] Retrieved projects:', response.data.projects?.length || 0);
      
      if (response.data.projects) {
        console.log('📊 [API] Projects summary:');
        response.data.projects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name} (ID: ${project._id}) - ${project.taskCount || 0} задач`);
        });
      }
      
      projectCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });
      
      return response;
    } catch (error) {
      console.error('❌ [API] Error fetching projects:', error);
      
      if (error.response) {
        console.error('❌ [API] Server response:', {
          status: error.response.status,
          data: error.response.data
        });
        
        // Показываем пользователю понятное сообщение об ошибке
        if (error.response.status === 401) {
          showNotification('Требуется авторизация', 'Пожалуйста, войдите в систему', 'error');
        } else if (error.response.status === 500) {
          showNotification('Ошибка сервера', 'Произошла ошибка при загрузке проектов', 'error');
        } else if (error.response.data?.message) {
          showNotification('Ошибка', error.response.data.message, 'error');
        }
      } else if (error.request) {
        console.error('❌ [API] No response received:', error.request);
        showNotification('Сервер не отвечает', 'Проверьте, запущен ли сервер на порту 5000', 'error');
      } else {
        console.error('❌ [API] Request setup error:', error.message);
        showNotification('Ошибка запроса', error.message, 'error');
      }
      
      throw error;
    }
  },

  async getProjectById(projectId) {
    if (!projectId) {
      console.error('❌ [API] Project ID is required');
      throw new Error('Project ID is required');
    }
    
    const cacheKey = `project_${projectId}`;
    const cached = projectCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < PROJECT_CACHE_DURATION) {
      console.log(`📦 [CACHE] Using cached project ${projectId}`);
      return cached.response;
    }
    
    console.log(`📡 [API] Fetching project ${projectId} from server...`);
    try {
      const response = await api.get(`/${projectId}`);
      
      console.log(`✅ [API] Retrieved project: ${response.data.project?.name || 'Unknown'}`);
      console.log(`✅ [API] Task count: ${response.data.project?.taskCount || 0}`);
      console.log(`✅ [API] Members: ${response.data.project?.members?.length || 0}`);
      
      projectCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error fetching project ${projectId}:`, error);
      showNotification('Ошибка загрузки проекта', 'Не удалось загрузить проект', 'error');
      throw error;
    }
  },

  async createProject(projectData) {
    console.log('📝 [API] Creating new project:', projectData.name);
    
    if (!projectData.name || projectData.name.trim().length === 0) {
      console.error('❌ [API] Project name is required');
      showNotification('Ошибка', 'Название проекта обязательно', 'error');
      throw new Error('Название проекта обязательно');
    }
    
    try {
      const response = await api.post('/', projectData);
      
      // Очищаем кэш всех проектов
      projectCache.clear();
      
      console.log(`✅ [API] Project created: ${response.data.project?.name}`);
      console.log(`✅ [API] Project ID: ${response.data.project?._id}`);
      
      showNotification('Проект создан', `Проект "${response.data.project?.name}" успешно создан`, 'success');
      
      return response;
    } catch (error) {
      console.error('❌ [API] Error creating project:', error);
      
      if (error.response?.data?.message) {
        showNotification('Ошибка создания проекта', error.response.data.message, 'error');
      } else {
        showNotification('Ошибка создания проекта', 'Не удалось создать проект', 'error');
      }
      
      throw error;
    }
  },

  async updateProject(projectId, projectData) {
    console.log(`✏️ [API] Updating project ${projectId}:`, projectData);
    
    try {
      const response = await api.put(`/${projectId}`, projectData);
      
      // Очищаем кэш этого проекта и всех проектов
      projectCache.delete(`project_${projectId}`);
      projectCache.delete('all_projects');
      
      console.log(`✅ [API] Project updated: ${response.data.project?.name}`);
      
      showNotification('Проект обновлен', `Проект "${response.data.project?.name}" успешно обновлен`, 'success');
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error updating project ${projectId}:`, error);
      showNotification('Ошибка обновления', 'Не удалось обновить проект', 'error');
      throw error;
    }
  },

  async deleteProject(projectId, projectName = '') {
    console.log(`🗑️ [API] Deleting project ${projectId}`);
    
    // Создаем промис для подтверждения удаления
    const confirmDeletion = () => {
      return new Promise((resolve) => {
        // Отправляем событие для UI компонента подтверждения
        window.dispatchEvent(new CustomEvent('confirm-dialog', {
          detail: {
            title: 'Подтверждение удаления',
            message: `Вы уверены, что хотите удалить проект "${projectName}"? Все задачи и комментарии будут также удалены.`,
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
          }
        }));
      });
    };
    
    const confirmed = await confirmDeletion();
    
    if (!confirmed) {
      console.log('❌ [API] Deletion cancelled by user');
      throw new Error('Удаление отменено пользователем');
    }
    
    try {
      const response = await api.delete(`/${projectId}`);
      
      // Очищаем кэш
      projectCache.clear();
      
      console.log(`✅ [API] Project deleted`);
      showNotification('Проект удален', `Проект "${projectName}" успешно удален`, 'success');
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error deleting project ${projectId}:`, error);
      showNotification('Ошибка удаления', 'Не удалось удалить проект', 'error');
      throw error;
    }
  },

  async archiveProject(projectId) {
    console.log(`📦 [API] Archiving project ${projectId}`);
    
    try {
      const response = await api.patch(`/${projectId}/archive`);
      
      projectCache.delete(`project_${projectId}`);
      projectCache.delete('all_projects');
      
      console.log(`✅ [API] Project archived/restored`);
      
      const action = response.data.project?.status === 'archived' ? 'архивирован' : 'восстановлен';
      showNotification('Проект обновлен', `Проект успешно ${action}`, 'info');
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error archiving project ${projectId}:`, error);
      showNotification('Ошибка', 'Не удалось изменить статус проекта', 'error');
      throw error;
    }
  },

  async updateMemberRole(projectId, userId, role) {
    console.log(`👤 [API] Updating member role in project ${projectId} for user ${userId} to ${role}`);
    
    try {
      const response = await api.patch(`/${projectId}/members/${userId}`, { role });
      
      projectCache.delete(`project_${projectId}`);
      
      console.log(`✅ [API] Member role updated`);
      showNotification('Роль обновлена', 'Роль участника успешно изменена', 'success');
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error updating member role:`, error);
      showNotification('Ошибка', 'Не удалось изменить роль участника', 'error');
      throw error;
    }
  },

  async addMember(projectId, userId, role = 'member') {
    console.log(`➕ [API] Adding member ${userId} to project ${projectId} as ${role}`);
    
    try {
      const response = await api.post(`/${projectId}/members`, { userId, role });
      
      projectCache.delete(`project_${projectId}`);
      
      console.log(`✅ [API] Member added`);
      showNotification('Участник добавлен', 'Новый участник успешно добавлен в проект', 'success');
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error adding member:`, error);
      showNotification('Ошибка', 'Не удалось добавить участника', 'error');
      throw error;
    }
  },

  async removeMember(projectId, userId, userName = '') {
    console.log(`➖ [API] Removing member ${userId} from project ${projectId}`);
    
    // Создаем промис для подтверждения удаления
    const confirmRemoval = () => {
      return new Promise((resolve) => {
        // Отправляем событие для UI компонента подтверждения
        window.dispatchEvent(new CustomEvent('confirm-dialog', {
          detail: {
            title: 'Подтверждение удаления',
            message: `Вы уверены, что хотите удалить участника "${userName}" из проекта?`,
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
          }
        }));
      });
    };
    
    const confirmed = await confirmRemoval();
    
    if (!confirmed) {
      console.log('❌ [API] Member removal cancelled by user');
      throw new Error('Удаление участника отменено пользователем');
    }
    
    try {
      const response = await api.delete(`/${projectId}/members`, { data: { userId } });
      
      projectCache.delete(`project_${projectId}`);
      
      console.log(`✅ [API] Member removed`);
      showNotification('Участник удален', 'Участник успешно удален из проекта', 'success');
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error removing member:`, error);
      showNotification('Ошибка', 'Не удалось удалить участника', 'error');
      throw error;
    }
  },

  async createInvite(projectId, inviteData) {
    console.log(`📧 [API] Creating invite for project ${projectId}`);
    
    try {
      const response = await api.post(`/${projectId}/invites`, inviteData);
      
      console.log(`✅ [API] Invite created: ${response.data.invite?.code}`);
      showNotification('Приглашение создано', 'Ссылка для приглашения успешно создана', 'success');
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error creating invite:`, error);
      showNotification('Ошибка', 'Не удалось создать приглашение', 'error');
      throw error;
    }
  },

  async getProjectInvites(projectId) {
    console.log(`📧 [API] Fetching invites for project ${projectId}`);
    
    try {
      const response = await api.get(`/${projectId}/invites`);
      
      console.log(`✅ [API] Retrieved ${response.data.invites?.length || 0} invites`);
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error fetching invites:`, error);
      throw error;
    }
  },

  async getProjectStats(projectId) {
    console.log(`📊 [API] Fetching stats for project ${projectId}`);
    
    try {
      const response = await api.get(`/${projectId}/stats`);
      
      console.log(`✅ [API] Retrieved stats for project ${projectId}`);
      
      return response;
    } catch (error) {
      console.error(`❌ [API] Error fetching project stats:`, error);
      throw error;
    }
  },

  async testConnection() {
    console.log('🔧 [API] Testing project service connection...');
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 [API] Testing with token:', token ? 'present' : 'missing');
      
      const response = await api.get('/test/connection');
      console.log('✅ [API] Project service connection test successful:', response.data);
      return response;
    } catch (error) {
      console.error('❌ [API] Project service connection test failed:', error);
      throw error;
    }
  },

  clearCache() {
    console.log('🧹 [CACHE] Clearing project cache');
    projectCache.clear();
  },

  // Метод для проверки и логирования текущего состояния
  logCurrentState() {
    console.log('🔍 [DEBUG] Current project service state:');
    console.log('  - API URL:', API_URL);
    console.log('  - Token exists:', !!localStorage.getItem('token'));
    console.log('  - Cache size:', projectCache.size);
    console.log('  - Cache entries:');
    
    for (const [key, value] of projectCache.entries()) {
      console.log(`    - ${key}: cached at ${new Date(value.timestamp).toLocaleTimeString()}`);
    }
  }
};

export default projectService;