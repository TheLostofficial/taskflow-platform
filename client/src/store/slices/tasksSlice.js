import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';

// Вспомогательная функция для логирования
const log = (type, message, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'info' ? 'ℹ️' : type === 'error' ? '❌' : type === 'success' ? '✅' : '⚠️';
  console.log(`${prefix} [${timestamp}] ${message}`);
  if (data) console.log('   Данные:', data);
};

// Глобальный кэш для задач
const taskCache = new Map();
const TASK_CACHE_DURATION = 30000; // 30 секунд

export const fetchProjectTasks = createAsyncThunk(
  'tasks/fetchProjectTasks',
  async (projectId, { rejectWithValue, getState }) => {
    try {
      if (!projectId || projectId === 'undefined') {
        throw new Error('Project ID is required');
      }
      
      log('info', `Загрузка задач для проекта ${projectId}...`);
      
      const state = getState();
      const { lastFetchTime } = state.tasks;
      
      // Проверяем кэш
      const cacheKey = `tasks_${projectId}`;
      const cached = taskCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < TASK_CACHE_DURATION) {
        log('info', `Используем кэшированные задачи проекта ${projectId}`);
        return { projectId, tasks: cached.data };
      }
      
      // Проверяем частоту запросов
      if (lastFetchTime && Date.now() - lastFetchTime < 5000) {
        log('info', 'Пропускаем запрос задач (слишком частые запросы)');
        return { projectId, tasks: state.tasks.items || [] };
      }
      
      const response = await taskService.getProjectTasks(projectId);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = response.data.tasks || [];
      
      // Кэшируем результат
      taskCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      log('success', `Задачи проекта ${projectId} успешно загружены`, { 
        count: data.length,
        tasks: data.map(t => ({ id: t._id, title: t.title }))
      });
      
      return { projectId, tasks: data };
    } catch (error) {
      log('error', `Ошибка загрузки задач проекта ${projectId}`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Если сетевой ошибки нет, возвращаем данные из состояния
      if (error.response) {
        return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка загрузки задач');
      } else {
        // Сетевая ошибка - используем данные из состояния
        log('info', 'Сетевая ошибка. Используем существующие данные');
        const state = getState();
        return { projectId, tasks: state.tasks.items || [] };
      }
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue, getState }) => {
    try {
      if (!taskData.project || !taskData.title) {
        throw new Error('Project ID and title are required');
      }
      
      log('info', 'Создание новой задачи...', { 
        title: taskData.title,
        project: taskData.project 
      });
      
      const response = await taskService.createTask(taskData);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        task: response.data.task || response.data,
        message: response.data.message || 'Задача создана'
      };
      
      // Очищаем кэш задач этого проекта
      taskCache.delete(`tasks_${taskData.project}`);
      
      log('success', 'Задача успешно создана', { 
        id: data.task._id, 
        title: data.task.title 
      });
      
      return data;
    } catch (error) {
      log('error', 'Ошибка создания задачи', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка создания задачи');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, taskData }, { rejectWithValue, getState }) => {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }
      
      log('info', `Обновление задачи ${taskId}...`, taskData);
      
      const response = await taskService.updateTask(taskId, taskData);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        task: response.data.task || response.data,
        message: response.data.message || 'Задача обновлена'
      };
      
      // Получаем проект задачи из текущего состояния
      const state = getState();
      const task = state.tasks.items.find(t => t._id === taskId);
      if (task && task.project) {
        // Очищаем кэш задач этого проекта
        taskCache.delete(`tasks_${task.project}`);
      }
      
      log('success', `Задача ${taskId} успешно обновлена`);
      return data;
    } catch (error) {
      log('error', `Ошибка обновления задачи ${taskId}`, error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка обновления задачи');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId, { rejectWithValue, getState }) => {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }
      
      log('info', `Удаление задачи ${taskId}...`);
      
      await taskService.deleteTask(taskId);
      
      // Получаем проект задачи из текущего состояния
      const state = getState();
      const task = state.tasks.items.find(t => t._id === taskId);
      if (task && task.project) {
        // Очищаем кэш задач этого проекта
        taskCache.delete(`tasks_${task.project}`);
      }
      
      log('success', `Задача ${taskId} успешно удалена`);
      return { taskId };
    } catch (error) {
      log('error', `Ошибка удаления задачи ${taskId}`, error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка удаления задачи');
    }
  }
);

export const getUserTaskStats = createAsyncThunk(
  'tasks/getUserTaskStats',
  async (_, { rejectWithValue }) => {
    try {
      log('info', 'Загрузка статистики пользователя...');
      
      const response = await taskService.getUserTaskStats();
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      log('success', 'Статистика пользователя загружена');
      return response.data;
    } catch (error) {
      log('error', 'Ошибка загрузки статистики пользователя', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка загрузки статистики');
    }
  }
);

export const getProjectStats = createAsyncThunk(
  'tasks/getProjectStats',
  async ({ projectId, timeRange = 'month' }, { rejectWithValue }) => {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      log('info', `Загрузка статистики проекта ${projectId}...`);
      
      const response = await taskService.getProjectStats(projectId, timeRange);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      log('success', `Статистика проекта ${projectId} загружена`);
      return response.data;
    } catch (error) {
      log('error', `Ошибка загрузки статистики проекта ${projectId}`, error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка загрузки статистики проекта');
    }
  }
);

export const getRecentActivity = createAsyncThunk(
  'tasks/getRecentActivity',
  async (_, { rejectWithValue }) => {
    try {
      log('info', 'Загрузка последней активности...');
      
      const response = await taskService.getRecentActivity();
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      log('success', 'Последняя активность загружена');
      return response.data;
    } catch (error) {
      log('error', 'Ошибка загрузки последней активности', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка загрузки активности');
    }
  }
);

export const addComment = createAsyncThunk(
  'tasks/addComment',
  async ({ taskId, content, mentions = [] }, { rejectWithValue, getState }) => {
    try {
      if (!taskId || !content) {
        throw new Error('Task ID and content are required');
      }
      
      log('info', `Добавление комментария к задаче ${taskId}...`);
      
      const response = await taskService.addComment(taskId, { content, mentions });
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = response.data;
      
      // Получаем проект задачи из текущего состояния
      const state = getState();
      const task = state.tasks.items.find(t => t._id === taskId);
      if (task && task.project) {
        // Очищаем кэш задач этого проекта
        taskCache.delete(`tasks_${task.project}`);
      }
      
      log('success', `Комментарий к задаче ${taskId} успешно добавлен`);
      return data;
    } catch (error) {
      log('error', `Ошибка добавления комментария к задаче ${taskId}`, error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка добавления комментария');
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ taskId, status, position }, { rejectWithValue, getState }) => {
    try {
      if (!taskId || !status) {
        throw new Error('Task ID and status are required');
      }
      
      log('info', `Обновление статуса задачи ${taskId} на ${status}...`);
      
      const response = await taskService.updateTaskStatus(taskId, { status, position });
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = response.data;
      
      // Получаем проект задачи из текущего состояния
      const state = getState();
      const task = state.tasks.items.find(t => t._id === taskId);
      if (task && task.project) {
        // Очищаем кэш задач этого проекта
        taskCache.delete(`tasks_${task.project}`);
      }
      
      log('success', `Статус задачи ${taskId} успешно обновлен на ${status}`);
      return data;
    } catch (error) {
      log('error', `Ошибка обновления статуса задачи ${taskId}`, error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка обновления статуса');
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    loading: false,
    error: null,
    operationLoading: false,
    operationError: null,
    currentProjectId: null,
    lastFetchTime: null,
    
    taskStats: null,
    projectStats: null,
    recentActivity: null,
    statsLoading: false,
    statsError: null,
    requestCount: 0
  },
  reducers: {
    clearTasks: (state) => {
      state.items = [];
      state.currentProjectId = null;
      state.error = null;
      state.operationError = null;
      state.lastFetchTime = null;
      log('info', 'Задачи очищены из состояния');
    },
    clearError: (state) => {
      state.error = null;
      state.operationError = null;
      state.statsError = null;
      log('info', 'Ошибки очищены из состояния');
    },
    setCurrentProjectId: (state, action) => {
      state.currentProjectId = action.payload;
      log('info', `Текущий проект установлен: ${action.payload}`);
    },
    updateLastFetchTime: (state) => {
      state.lastFetchTime = Date.now();
    },
    
    clearStats: (state) => {
      state.taskStats = null;
      state.projectStats = null;
      state.recentActivity = null;
      state.statsError = null;
      log('info', 'Статистика очищена из состояния');
    },
    
    addMockTask: (state, action) => {
      const mockTask = {
        _id: Date.now().toString(),
        title: action.payload.title || 'Тестовая задача',
        description: action.payload.description || 'Создана в оффлайн режиме',
        project: action.payload.projectId || state.currentProjectId,
        creator: { _id: 'mock', name: 'Вы' },
        status: 'To Do',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: []
      };
      state.items.push(mockTask);
      log('info', 'Добавлена тестовая задача', { title: mockTask.title });
    },
    
    clearTasksCache: (state) => {
      state.items = [];
      state.currentProjectId = null;
      state.lastFetchTime = null;
      state.requestCount = 0;
      taskCache.clear();
      log('info', 'Кэш задач очищен');
    },
    
    incrementRequestCount: (state) => {
      state.requestCount += 1;
    },
    
    resetRequestCount: (state) => {
      state.requestCount = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      // Загрузка задач проекта
      .addCase(fetchProjectTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operationError = null;
        state.requestCount += 1;
        log('info', 'Начало загрузки задач проекта...');
      })
      .addCase(fetchProjectTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastFetchTime = Date.now();
        
        const { projectId, tasks } = action.payload;
        
        state.currentProjectId = projectId;
        
        const validTasks = tasks.filter(task => task && task._id);
        const tasksMap = new Map();
        validTasks.forEach(task => {
          tasksMap.set(task._id, task);
        });
        
        state.items = Array.from(tasksMap.values());
        log('success', 'Задачи проекта успешно загружены в состояние', { 
          count: state.items.length,
          projectId 
        });
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Ошибка загрузки задач';
        state.lastFetchTime = Date.now();
        log('error', 'Ошибка загрузки задач в состояние', action.payload);
      })
      
      // Создание задачи
      .addCase(createTask.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.requestCount += 1;
        log('info', 'Начало создания задачи...');
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        const newTask = action.payload.task;
        if (newTask && newTask._id) {
          const exists = state.items.find(task => task._id === newTask._id);
          if (!exists) {
            state.items.push(newTask);
            log('success', 'Задача добавлена в состояние', { id: newTask._id });
          }
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка создания задачи';
        log('error', 'Ошибка создания задачи в состояние', action.payload);
      })
      
      // Обновление задачи
      .addCase(updateTask.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.requestCount += 1;
        log('info', 'Начало обновления задачи...');
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        const updatedTask = action.payload.task;
        if (updatedTask && updatedTask._id) {
          const index = state.items.findIndex(t => t._id === updatedTask._id);
          if (index !== -1) {
            state.items[index] = { ...state.items[index], ...updatedTask };
            log('success', 'Задача обновлена в состоянии', { id: updatedTask._id });
          } else {
            // Если задачи не было в списке, добавляем её
            state.items.push(updatedTask);
            log('info', 'Задача добавлена в состояние (не найдена при обновлении)', { id: updatedTask._id });
          }
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка обновления задачи';
        log('error', 'Ошибка обновления задачи в состоянии', action.payload);
      })
      
      // Удаление задачи
      .addCase(deleteTask.fulfilled, (state, action) => {
        const { taskId } = action.payload;
        if (taskId) {
          state.items = state.items.filter(t => t._id !== taskId);
          log('success', 'Задача удалена из состояния', { id: taskId });
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.operationError = action.payload || 'Ошибка удаления задачи';
        log('error', 'Ошибка удаления задачи в состоянии', action.payload);
      })
      
      // Статистика пользователя
      .addCase(getUserTaskStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
        state.requestCount += 1;
        log('info', 'Начало загрузки статистики пользователя...');
      })
      .addCase(getUserTaskStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.taskStats = action.payload.stats;
        log('success', 'Статистика пользователя загружена в состояние');
      })
      .addCase(getUserTaskStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload || 'Ошибка загрузки статистики';
        log('error', 'Ошибка загрузки статистики пользователя в состоянии', action.payload);
      })
      
      // Статистика проекта
      .addCase(getProjectStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
        state.requestCount += 1;
        log('info', 'Начало загрузки статистики проекта...');
      })
      .addCase(getProjectStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.projectStats = action.payload.stats;
        log('success', 'Статистика проекта загружена в состояние');
      })
      .addCase(getProjectStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload || 'Ошибка загрузки статистики проекта';
        log('error', 'Ошибка загрузки статистики проекта в состоянии', action.payload);
      })
      
      // Последняя активность
      .addCase(getRecentActivity.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
        state.requestCount += 1;
        log('info', 'Начало загрузки последней активности...');
      })
      .addCase(getRecentActivity.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.recentActivity = action.payload.activities;
        log('success', 'Последняя активность загружена в состояние');
      })
      .addCase(getRecentActivity.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload || 'Ошибка загрузки активности';
        log('error', 'Ошибка загрузки последней активности в состоянии', action.payload);
      })
      
      // Добавление комментария
      .addCase(addComment.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.requestCount += 1;
        log('info', 'Начало добавления комментария...');
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.operationLoading = false;
        const { comment } = action.payload;
        
        if (comment && comment.taskId) {
          const taskIndex = state.items.findIndex(t => t._id === comment.taskId);
          if (taskIndex !== -1) {
            if (!state.items[taskIndex].comments) {
              state.items[taskIndex].comments = [];
            }
            
            // Проверяем, нет ли уже такого комментария
            const commentExists = state.items[taskIndex].comments.some(c => 
              c._id === comment._id
            );
            
            if (!commentExists) {
              state.items[taskIndex].comments.push(comment);
              log('success', 'Комментарий добавлен к задаче в состоянии', { 
                taskId: comment.taskId 
              });
            }
          }
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка добавления комментария';
        log('error', 'Ошибка добавления комментария в состоянии', action.payload);
      })
      
      // Обновление статуса задачи
      .addCase(updateTaskStatus.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.requestCount += 1;
        log('info', 'Начало обновления статуса задачи...');
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.operationLoading = false;
        const updatedTask = action.payload.task;
        if (updatedTask && updatedTask._id) {
          const index = state.items.findIndex(t => t._id === updatedTask._id);
          if (index !== -1) {
            state.items[index].status = updatedTask.status;
            if (updatedTask.position !== undefined) {
              state.items[index].position = updatedTask.position;
            }
            log('success', 'Статус задачи обновлен в состоянии', { 
              id: updatedTask._id, 
              status: updatedTask.status 
            });
          }
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка обновления статуса';
        log('error', 'Ошибка обновления статуса задачи в состоянии', action.payload);
      });
  }
});

export const { 
  clearTasks, 
  clearError,
  setCurrentProjectId,
  updateLastFetchTime,
  clearStats,
  addMockTask,
  clearTasksCache,
  incrementRequestCount,
  resetRequestCount
} = tasksSlice.actions;

export default tasksSlice.reducer;