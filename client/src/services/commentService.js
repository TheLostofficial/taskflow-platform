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
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  async addComment(taskId, commentData) {
    const formData = new FormData();
    formData.append('content', commentData.content);
    
    if (commentData.mentions && commentData.mentions.length > 0) {
      formData.append('mentions', JSON.stringify(commentData.mentions));
    }
    
    if (commentData.attachments && commentData.attachments.length > 0) {
      commentData.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
    }
    
    const response = await api.post(`/tasks/${taskId}/comments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateComment(taskId, commentId, commentData) {
    const response = await api.put(`/tasks/${taskId}/comments/${commentId}`, {
      content: commentData.content,
      mentions: JSON.stringify(commentData.mentions || [])
    });
    return response.data;
  },

  async deleteComment(taskId, commentId) {
    const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  },

  async downloadAttachment(taskId, commentId, filename) {
    const response = await api.get(`/tasks/${taskId}/comments/${commentId}/attachments/${filename}`, {
      responseType: 'blob'
    });
    return response;
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