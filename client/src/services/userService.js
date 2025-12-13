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

export const userService = {
  // Получить текущего пользователя
  async getCurrentUser() {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка загрузки профиля');
    }
  },

  // Обновить профиль - ИСПРАВЛЕН URL
  async updateProfile(profileData) {
    try {
      const response = await api.put('/users/me', profileData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка обновления профиля');
    }
  },

  // Сменить пароль
  async changePassword(passwordData) {
    try {
      const response = await api.put('/users/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка смены пароля');
    }
  },

  // Получить настройки уведомлений
  async getNotificationSettings() {
    try {
      const response = await api.get('/users/notifications');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка загрузки настроек уведомлений');
    }
  },

  // Обновить настройки уведомлений
  async updateNotificationSettings(settings) {
    try {
      const response = await api.put('/users/notifications', { settings });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка обновления настроек уведомлений');
    }
  },

  // Загрузить аватар
  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка загрузки аватара');
    }
  },

  // Получить активность пользователя
  async getUserActivity() {
    try {
      const response = await api.get('/users/activity');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка загрузки активности');
    }
  },

  // Получить список пользователей (для назначения задач)
  async getUsers() {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка загрузки пользователей');
    }
  }
};

export default userService;