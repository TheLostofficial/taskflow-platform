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

export const inviteService = {
  // Создать инвайт - ИСПРАВЛЕН URL
  async createInvite(projectId, inviteData) {
    try {
      const response = await api.post(`/invites/${projectId}/invites`, inviteData);
      return response.data;
    } catch (error) {
      console.error('Create invite error:', error);
      throw new Error(error.response?.data?.message || 'Ошибка создания инвайта');
    }
  },

  // Получить инвайты проекта - ИСПРАВЛЕН URL
  async getProjectInvites(projectId) {
    try {
      const response = await api.get(`/invites/${projectId}/invites`);
      return response.data;
    } catch (error) {
      console.error('Get invites error:', error);
      throw new Error(error.response?.data?.message || 'Ошибка загрузки инвайтов');
    }
  },

  // Получить информацию об инвайте (для авторизованных)
  async getInviteInfo(code) {
    try {
      const response = await api.get(`/invites/invites/${code}`);
      return response.data;
    } catch (error) {
      console.error('Get invite info error:', error);
      throw new Error(error.response?.data?.message || 'Ошибка получения информации об инвайте');
    }
  },

  // Получить публичную информацию об инвайте (без авторизации)
  async getPublicInviteInfo(code) {
    try {
      const response = await api.get(`/invites/public-invites/${code}`);
      return response.data;
    } catch (error) {
      console.error('Get public invite error:', error);
      throw new Error(error.response?.data?.message || 'Ошибка получения информации об инвайте');
    }
  },

  // Принять инвайт
  async acceptInvite(code) {
    try {
      const response = await api.post(`/invites/invites/${code}/accept`);
      return response.data;
    } catch (error) {
      console.error('Accept invite error:', error);
      throw new Error(error.response?.data?.message || 'Ошибка принятия инвайта');
    }
  },

  // Удалить/деактивировать инвайт - ИСПРАВЛЕН URL
  async deleteInvite(projectId, code) {
    try {
      const response = await api.delete(`/invites/${projectId}/invites/${code}`);
      return response.data;
    } catch (error) {
      console.error('Delete invite error:', error);
      throw new Error(error.response?.data?.message || 'Ошибка удаления инвайта');
    }
  }
};

export default inviteService;