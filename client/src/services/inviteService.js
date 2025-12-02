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
  async createInvite(projectId, inviteData) {
    const response = await api.post(`/projects/${projectId}/invites`, inviteData);
    return response.data;
  },

  async getProjectInvites(projectId) {
    const response = await api.get(`/projects/${projectId}/invites`);
    return response.data;
  },

  async getInviteInfo(code, isAuthenticated = true) {
    const endpoint = isAuthenticated ? `/invites/${code}` : `/public-invites/${code}`;
    const response = await api.get(endpoint);
    return response.data;
  },

  async acceptInvite(code) {
    const response = await api.post(`/invites/${code}/accept`);
    return response.data;
  },

  async deleteInvite(projectId, code) {
    const response = await api.delete(`/projects/${projectId}/invites/${code}`);
    return response.data;
  }
};

export default inviteService;