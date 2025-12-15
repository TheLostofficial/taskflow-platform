import api from './api';

const commentService = {
  // Получение комментариев задачи
  async getTaskComments(taskId) {
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Get comments error:', error);
      throw error;
    }
  },

  // Добавление комментария (с поддержкой файлов)
  async addComment(taskId, commentData) {
    try {
      console.log('📤 [SERVICE] Добавление комментария к задаче:', taskId);
      console.log('📤 [SERVICE] Данные комментария:', commentData);
      
      let response;
      
      if (commentData instanceof FormData) {
        // Проверяем, есть ли контент в FormData
        const content = commentData.get('content');
        console.log('📤 [SERVICE] FormData content:', content);
        
        // Проверяем, есть ли файлы
        const hasFiles = commentData.getAll('attachments').length > 0;
        console.log('📤 [SERVICE] Has files:', hasFiles);
        
        if (!content && !hasFiles) {
          throw new Error('Comment content is required or attach a file');
        }
        
        // Логируем содержимое FormData
        console.log('📤 [SERVICE] FormData содержимое:');
        for (let [key, value] of commentData.entries()) {
          console.log(`  ${key}:`, value instanceof File ? `${value.name} (${value.size} bytes)` : value);
        }
        
        response = await api.post(`/tasks/${taskId}/comments`, commentData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Если это обычный объект (без вложений)
        console.log('📤 [SERVICE] Обычный объект:', commentData);
        if (!commentData.content || commentData.content.trim() === '') {
          throw new Error('Comment content is required');
        }
        
        response = await api.post(`/tasks/${taskId}/comments`, commentData);
      }
      
      console.log('✅ [SERVICE] Комментарий успешно добавлен:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Ошибка добавления комментария:', error);
      console.error('❌ [SERVICE] Ответ сервера:', error.response?.data);
      throw error;
    }
  },

  // Обновление комментария
  async updateComment(taskId, commentId, updateData) {
    try {
      const response = await api.put(`/tasks/${taskId}/comments/${commentId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Update comment error:', error);
      throw error;
    }
  },

  // Удаление комментария
  async deleteComment(taskId, commentId) {
    try {
      const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Delete comment error:', error);
      throw error;
    }
  },

  // Скачивание вложения
  async downloadAttachment(taskId, commentId, filename, originalName) {
    try {
      const response = await api.get(`/tasks/${taskId}/comments/${commentId}/attachments/${filename}`, {
        responseType: 'blob'
      });
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download attachment error:', error);
      throw error;
    }
  },

  // Упоминания в комментариях
  async getMentions(taskId, query) {
    try {
      const response = await api.get(`/tasks/${taskId}/mentions?q=${query}`);
      return response.data;
    } catch (error) {
      console.error('Get mentions error:', error);
      throw error;
    }
  },

  // Вспомогательные функции
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