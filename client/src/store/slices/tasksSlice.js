import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';

export const fetchProjectTasks = createAsyncThunk(
  'tasks/fetchProjectTasks',
  async (projectId, { rejectWithValue }) => {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      const response = await taskService.getProjectTasks(projectId);
      return { projectId, tasks: response.data.tasks || [] };
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка загрузки задач');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      if (!taskData.project || !taskData.title) {
        throw new Error('Project ID and title are required');
      }
      
      const response = await taskService.createTask(taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка создания задачи');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, taskData }, { rejectWithValue }) => {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }
      
      const response = await taskService.updateTask(taskId, taskData);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка обновления задачи');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId, { rejectWithValue }) => {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }
      
      await taskService.deleteTask(taskId);
      return { taskId };
    } catch (error) {
      console.error('Error deleting task:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка удаления задачи');
    }
  }
);

export const getUserTaskStats = createAsyncThunk(
  'tasks/getUserTaskStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await taskService.getUserTaskStats();
      return response.data;
    } catch (error) {
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
      
      const response = await taskService.getProjectStats(projectId, timeRange);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка загрузки статистики проекта');
    }
  }
);

export const getRecentActivity = createAsyncThunk(
  'tasks/getRecentActivity',
  async (_, { rejectWithValue }) => {
    try {
      const response = await taskService.getRecentActivity();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка загрузки активности');
    }
  }
);

export const addComment = createAsyncThunk(
  'tasks/addComment',
  async ({ taskId, content, mentions = [] }, { rejectWithValue }) => {
    try {
      if (!taskId || !content) {
        throw new Error('Task ID and content are required');
      }
      
      const response = await taskService.addComment(taskId, { content, mentions });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка добавления комментария');
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ taskId, status, position }, { rejectWithValue }) => {
    try {
      if (!taskId || !status) {
        throw new Error('Task ID and status are required');
      }
      
      const response = await taskService.updateTaskStatus(taskId, { status, position });
      return response.data;
    } catch (error) {
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
    statsError: null
  },
  reducers: {
    clearTasks: (state) => {
      state.items = [];
      state.currentProjectId = null;
      state.error = null;
      state.operationError = null;
      state.lastFetchTime = null;
    },
    clearError: (state) => {
      state.error = null;
      state.operationError = null;
      state.statsError = null;
    },
    setCurrentProjectId: (state, action) => {
      state.currentProjectId = action.payload;
    },
    updateLastFetchTime: (state) => {
      state.lastFetchTime = Date.now();
    },
    
    clearStats: (state) => {
      state.taskStats = null;
      state.projectStats = null;
      state.recentActivity = null;
      state.statsError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operationError = null;
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
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Ошибка загрузки задач';
      })
      .addCase(createTask.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        const newTask = action.payload.task;
        if (newTask && newTask._id) {
          const exists = state.items.find(task => task._id === newTask._id);
          if (!exists) {
            state.items.push(newTask);
          }
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка создания задачи';
      })
      .addCase(updateTask.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        const updatedTask = action.payload.task;
        if (updatedTask && updatedTask._id) {
          const index = state.items.findIndex(t => t._id === updatedTask._id);
          if (index !== -1) {
            state.items[index] = { ...state.items[index], ...updatedTask };
          }
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка обновления задачи';
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        const { taskId } = action.payload;
        if (taskId) {
          state.items = state.items.filter(t => t._id !== taskId);
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.operationError = action.payload || 'Ошибка удаления задачи';
      })
      
      .addCase(getUserTaskStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(getUserTaskStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.taskStats = action.payload.stats;
      })
      .addCase(getUserTaskStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload || 'Ошибка загрузки статистики';
      })
      
      .addCase(getProjectStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(getProjectStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.projectStats = action.payload.stats;
      })
      .addCase(getProjectStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload || 'Ошибка загрузки статистики проекта';
      })
      
      .addCase(getRecentActivity.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(getRecentActivity.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.recentActivity = action.payload.activities;
      })
      .addCase(getRecentActivity.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload || 'Ошибка загрузки активности';
      })
      
      .addCase(addComment.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.operationLoading = false;
        const { comment } = action.payload;
        const taskIndex = state.items.findIndex(t => t._id === comment.taskId);
        if (taskIndex !== -1) {
          if (!state.items[taskIndex].comments) {
            state.items[taskIndex].comments = [];
          }
          state.items[taskIndex].comments.push(comment);
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка добавления комментария';
      })
      
      .addCase(updateTaskStatus.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
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
          }
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload || 'Ошибка обновления статуса';
      });
  }
});

export const { 
  clearTasks, 
  clearError,
  setCurrentProjectId,
  updateLastFetchTime,
  clearStats
} = tasksSlice.actions;
export default tasksSlice.reducer;