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

export const commentService = {
  async getTaskComments(taskId) {
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Get comments error:', error);
      throw error;
    }
  },

  async addComment(taskId, commentData) {
    try {
      let response;
      
      if (commentData instanceof FormData) {
        // Если это FormData (с вложениями)
        response = await api.post(`/tasks/${taskId}/comments`, commentData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Если это обычный объект (без вложений)
        response = await api.post(`/tasks/${taskId}/comments`, commentData);
      }
      
      return response.data;
    } catch (error) {
      console.error('Add comment error:', error);
      throw error;
    }
  },

  async updateComment(taskId, commentId, commentData) {
    try {
      const response = await api.put(`/tasks/${taskId}/comments/${commentId}`, commentData);
      return response.data;
    } catch (error) {
      console.error('Update comment error:', error);
      throw error;
    }
  },

  async deleteComment(taskId, commentId) {
    try {
      const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Delete comment error:', error);
      throw error;
    }
  },

  async downloadAttachment(taskId, commentId, filename, originalName) {
    try {
      const response = await api.get(`/tasks/${taskId}/comments/${commentId}/attachments/${filename}`, {
        responseType: 'blob'
      });
      
      // Создаём ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Download attachment error:', error);
      throw error;
    }
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  },

  getFileIcon(filename) {
    const ext = this.getFileExtension(filename);
    const iconMap = {
      // Изображения
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️',
      // Документы
      pdf: '📄',
      doc: '📝', docx: '📝',
      txt: '📄',
      // Таблицы
      xls: '📊', xlsx: '📊', csv: '📊',
      // Презентации
      ppt: '📽️', pptx: '📽️',
      // Архивы
      zip: '📦', rar: '📦', '7z': '📦',
      // Код
      js: '💻', jsx: '💻', ts: '💻', tsx: '💻',
      html: '🌐', css: '🎨', json: '📋',
      // Прочее
      default: '📎'
    };
    return iconMap[ext] || iconMap.default;
  }
};

export default commentService;