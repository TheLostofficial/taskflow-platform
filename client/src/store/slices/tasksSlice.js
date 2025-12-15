import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';

// Асинхронные действия
export const fetchProjectTasks = createAsyncThunk(
  'tasks/fetchProjectTasks',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await taskService.getProjectTasks(projectId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchTask = createAsyncThunk(
  'tasks/fetchTask',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await taskService.getTaskById(taskId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await taskService.createTask(taskData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, taskData }, { rejectWithValue }) => {
    try {
      console.log('🔄 [REDUX] Обновление задачи:', taskId, taskData);
      const response = await taskService.updateTask(taskId, taskData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(taskId);
      return { taskId };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ taskId, status, position }, { rejectWithValue }) => {
    try {
      const response = await taskService.updateTaskStatus(taskId, { status, position });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateChecklist = createAsyncThunk(
  'tasks/updateChecklist',
  async ({ taskId, checklist }, { rejectWithValue }) => {
    try {
      console.log('✅ [REDUX] Обновление чеклиста задачи:', taskId, checklist);
      const response = await taskService.updateChecklist(taskId, checklist);
      return { taskId, checklist: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addComment = createAsyncThunk(
  'tasks/addComment',
  async ({ taskId, commentData }, { rejectWithValue }) => {
    try {
      const response = await taskService.addComment(taskId, commentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateComment = createAsyncThunk(
  'tasks/updateComment',
  async ({ taskId, commentId, content }, { rejectWithValue }) => {
    try {
      const response = await taskService.updateComment(taskId, commentId, content);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteComment = createAsyncThunk(
  'tasks/deleteComment',
  async ({ taskId, commentId }, { rejectWithValue }) => {
    try {
      await taskService.deleteComment(taskId, commentId);
      return { taskId, commentId };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✅ ДОБАВЛЯЕМ: Получение статистики пользователя
export const getUserTaskStats = createAsyncThunk(
  'tasks/getUserTaskStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await taskService.getUserTaskStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✅ ДОБАВЛЯЕМ: Получение последней активности
export const getRecentActivity = createAsyncThunk(
  'tasks/getRecentActivity',
  async (_, { rejectWithValue }) => {
    try {
      const response = await taskService.getRecentActivity();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    // Основной список задач
    tasks: [],
    currentTask: null,
    
    // Статистика и активность (для Dashboard)
    userStats: null,
    recentActivity: [],
    
    // Флаги загрузки
    isLoading: false,
    operationLoading: false,
    statsLoading: false,
    activityLoading: false,
    
    // Ошибки
    error: null,
    statsError: null,
    activityError: null,
    
    // Фильтры и сортировка
    statusFilter: 'all',
    searchQuery: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    
    // Для отслеживания загрузки
    lastFetchTime: null
  },
  reducers: {
    // Синхронные редьюсеры
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload;
    },
    
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },
    
    setSortOrder: (state, action) => {
      state.sortOrder = action.payload;
    },
    
    // ✅ ДОБАВЛЯЕМ: Обновление времени последней загрузки
    updateLastFetchTime: (state) => {
      state.lastFetchTime = Date.now();
    },
    
    // Обработка WebSocket событий
    handleTaskCreated: (state, action) => {
      const newTask = action.payload.task;
      // Добавляем задачу в список, если она относится к текущему проекту
      if (state.tasks.some(task => task.project === newTask.project)) {
        state.tasks.push(newTask);
      }
    },
    
    handleTaskUpdated: (state, action) => {
      const updatedTask = action.payload.task;
      const index = state.tasks.findIndex(task => task._id === updatedTask._id);
      
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...updatedTask };
      }
      
      if (state.currentTask && state.currentTask._id === updatedTask._id) {
        state.currentTask = { ...state.currentTask, ...updatedTask };
      }
    },
    
    handleTaskDeleted: (state, action) => {
      const taskId = action.payload.taskId;
      state.tasks = state.tasks.filter(task => task._id !== taskId);
      
      if (state.currentTask && state.currentTask._id === taskId) {
        state.currentTask = null;
      }
    },
    
    handleChecklistUpdated: (state, action) => {
      const { taskId, checklist } = action.payload;
      
      const taskIndex = state.tasks.findIndex(task => task._id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].checklist = checklist;
      }
      
      if (state.currentTask && state.currentTask._id === taskId) {
        state.currentTask.checklist = checklist;
      }
    },
    
    handleCommentAdded: (state, action) => {
      const { taskId, comment } = action.payload;
      
      const taskIndex = state.tasks.findIndex(task => task._id === taskId);
      if (taskIndex !== -1) {
        if (!state.tasks[taskIndex].comments) {
          state.tasks[taskIndex].comments = [];
        }
        state.tasks[taskIndex].comments.push(comment);
      }
      
      if (state.currentTask && state.currentTask._id === taskId) {
        if (!state.currentTask.comments) {
          state.currentTask.comments = [];
        }
        state.currentTask.comments.push(comment);
      }
    },
    
    handleCommentUpdated: (state, action) => {
      const { taskId, comment } = action.payload;
      
      const taskIndex = state.tasks.findIndex(task => task._id === taskId);
      if (taskIndex !== -1 && state.tasks[taskIndex].comments) {
        const commentIndex = state.tasks[taskIndex].comments.findIndex(c => c._id === comment._id);
        if (commentIndex !== -1) {
          state.tasks[taskIndex].comments[commentIndex] = comment;
        }
      }
      
      if (state.currentTask && state.currentTask._id === taskId && state.currentTask.comments) {
        const commentIndex = state.currentTask.comments.findIndex(c => c._id === comment._id);
        if (commentIndex !== -1) {
          state.currentTask.comments[commentIndex] = comment;
        }
      }
    },
    
    handleCommentDeleted: (state, action) => {
      const { taskId, commentId } = action.payload;
      
      const taskIndex = state.tasks.findIndex(task => task._id === taskId);
      if (taskIndex !== -1 && state.tasks[taskIndex].comments) {
        state.tasks[taskIndex].comments = state.tasks[taskIndex].comments.filter(c => c._id !== commentId);
      }
      
      if (state.currentTask && state.currentTask._id === taskId && state.currentTask.comments) {
        state.currentTask.comments = state.currentTask.comments.filter(c => c._id !== commentId);
      }
    },
    
    clearTasks: (state) => {
      state.tasks = [];
      state.currentTask = null;
      state.error = null;
    },
    
    clearError: (state) => {
      state.error = null;
      state.statsError = null;
      state.activityError = null;
    },
    
    // ✅ ДОБАВЛЯЕМ: Очистка статистики
    clearStats: (state) => {
      state.userStats = null;
      state.recentActivity = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Получение задач проекта
      .addCase(fetchProjectTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload.tasks || [];
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Ошибка загрузки задач';
      })
      
      // Получение задачи по ID
      .addCase(fetchTask.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.currentTask = action.payload.task;
      })
      .addCase(fetchTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка загрузки задачи';
      })
      
      // Создание задачи
      .addCase(createTask.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        if (action.payload.task) {
          state.tasks.push(action.payload.task);
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка создания задачи';
      })
      
      // Обновление задачи
      .addCase(updateTask.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        const updatedTask = action.payload.task;
        
        const index = state.tasks.findIndex(task => task._id === updatedTask._id);
        if (index !== -1) {
          state.tasks[index] = updatedTask;
        }
        
        if (state.currentTask && state.currentTask._id === updatedTask._id) {
          state.currentTask = updatedTask;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка обновления задачи';
      })
      
      // Удаление задачи
      .addCase(deleteTask.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.tasks = state.tasks.filter(task => task._id !== action.payload.taskId);
        
        if (state.currentTask && state.currentTask._id === action.payload.taskId) {
          state.currentTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка удаления задачи';
      })
      
      // Обновление статуса задачи
      .addCase(updateTaskStatus.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.operationLoading = false;
        const updatedTask = action.payload.task;
        
        const index = state.tasks.findIndex(task => task._id === updatedTask._id);
        if (index !== -1) {
          state.tasks[index] = updatedTask;
        }
        
        if (state.currentTask && state.currentTask._id === updatedTask._id) {
          state.currentTask = updatedTask;
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка обновления статуса';
      })
      
      // Обновление чеклиста
      .addCase(updateChecklist.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(updateChecklist.fulfilled, (state, action) => {
        state.operationLoading = false;
        const { taskId, checklist } = action.payload;
        
        const taskIndex = state.tasks.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          state.tasks[taskIndex].checklist = checklist;
        }
        
        if (state.currentTask && state.currentTask._id === taskId) {
          state.currentTask.checklist = checklist;
        }
      })
      .addCase(updateChecklist.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка обновления чеклиста';
      })
      
      // Добавление комментария
      .addCase(addComment.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.operationLoading = false;
        const { comment } = action.payload;
        const taskId = comment?.taskId || action.meta.arg.taskId;
        
        const taskIndex = state.tasks.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          if (!state.tasks[taskIndex].comments) {
            state.tasks[taskIndex].comments = [];
          }
          state.tasks[taskIndex].comments.push(comment);
        }
        
        if (state.currentTask && state.currentTask._id === taskId) {
          if (!state.currentTask.comments) {
            state.currentTask.comments = [];
          }
          state.currentTask.comments.push(comment);
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка добавления комментария';
      })
      
      // Обновление комментария
      .addCase(updateComment.pending, (state) => {
        state.operationLoading = true;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        state.operationLoading = false;
        const { comment } = action.payload;
        const taskId = action.meta.arg.taskId;
        
        const taskIndex = state.tasks.findIndex(task => task._id === taskId);
        if (taskIndex !== -1 && state.tasks[taskIndex].comments) {
          const commentIndex = state.tasks[taskIndex].comments.findIndex(c => c._id === comment._id);
          if (commentIndex !== -1) {
            state.tasks[taskIndex].comments[commentIndex] = comment;
          }
        }
        
        if (state.currentTask && state.currentTask._id === taskId && state.currentTask.comments) {
          const commentIndex = state.currentTask.comments.findIndex(c => c._id === comment._id);
          if (commentIndex !== -1) {
            state.currentTask.comments[commentIndex] = comment;
          }
        }
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка обновления комментария';
      })
      
      // Удаление комментария
      .addCase(deleteComment.pending, (state) => {
        state.operationLoading = true;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.operationLoading = false;
        const { taskId, commentId } = action.payload;
        
        const taskIndex = state.tasks.findIndex(task => task._id === taskId);
        if (taskIndex !== -1 && state.tasks[taskIndex].comments) {
          state.tasks[taskIndex].comments = state.tasks[taskIndex].comments.filter(c => c._id !== commentId);
        }
        
        if (state.currentTask && state.currentTask._id === taskId && state.currentTask.comments) {
          state.currentTask.comments = state.currentTask.comments.filter(c => c._id !== commentId);
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.operationLoading = false;
        state.error = action.payload || 'Ошибка удаления комментария';
      })
      
      // ✅ ДОБАВЛЯЕМ: Получение статистики пользователя
      .addCase(getUserTaskStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(getUserTaskStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.userStats = action.payload.stats;
      })
      .addCase(getUserTaskStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload || 'Ошибка загрузки статистики';
      })
      
      // ✅ ДОБАВЛЯЕМ: Получение последней активности
      .addCase(getRecentActivity.pending, (state) => {
        state.activityLoading = true;
        state.activityError = null;
      })
      .addCase(getRecentActivity.fulfilled, (state, action) => {
        state.activityLoading = false;
        state.recentActivity = action.payload.activities || [];
      })
      .addCase(getRecentActivity.rejected, (state, action) => {
        state.activityLoading = false;
        state.activityError = action.payload || 'Ошибка загрузки активности';
      });
  }
});

export const {
  setCurrentTask,
  clearCurrentTask,
  setStatusFilter,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  updateLastFetchTime,
  handleTaskCreated,
  handleTaskUpdated,
  handleTaskDeleted,
  handleChecklistUpdated,
  handleCommentAdded,
  handleCommentUpdated,
  handleCommentDeleted,
  clearTasks,
  clearError,
  clearStats
} = tasksSlice.actions;

export default tasksSlice.reducer;