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
    loadedProjects: {}
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
    },
    setCurrentProjectId: (state, action) => {
      state.currentProjectId = action.payload;
    },
    addTaskFromSocket: (state, action) => {
      const newTask = action.payload;
      if (!newTask || !newTask._id) return;
      
      const taskProjectId = newTask.project?._id || newTask.project;
      if (state.currentProjectId && taskProjectId !== state.currentProjectId) {
        return;
      }
      
      const existingTaskIndex = state.items.findIndex(task => task._id === newTask._id);
      if (existingTaskIndex === -1) {
        state.items.push(newTask);
      }
    },
    updateTaskFromSocket: (state, action) => {
      const updatedTask = action.payload;
      if (!updatedTask || !updatedTask._id) return;
      
      const index = state.items.findIndex(task => task._id === updatedTask._id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updatedTask };
      }
    },
    deleteTaskFromSocket: (state, action) => {
      const taskId = action.payload;
      if (!taskId) return;
      
      state.items = state.items.filter(task => task._id !== taskId);
    },
    clearProjectTasks: (state, action) => {
      const projectId = action.payload;
      if (projectId === state.currentProjectId) {
        state.items = state.items.filter(task => {
          const taskProjectId = task.project?._id || task.project;
          return taskProjectId !== projectId;
        });
      }
    },
    // Новый reducer для предотвращения частых загрузок
    updateLastFetchTime: (state) => {
      state.lastFetchTime = Date.now();
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
        
        // Устанавливаем ID текущего проекта
        state.currentProjectId = projectId;
        
        // Фильтруем только валидные задачи
        const validTasks = tasks.filter(task => task && task._id);
        
        // Создаем Map для удаления дубликатов
        const tasksMap = new Map();
        
        validTasks.forEach(task => {
          const taskProjectId = task.project?._id || task.project;
          if (taskProjectId === projectId) {
            tasksMap.set(task._id, task);
          }
        });
        
        // Сохраняем в loadedProjects для кэширования
        state.loadedProjects[projectId] = {
          tasks: Array.from(tasksMap.values()),
          timestamp: Date.now()
        };
        
        state.items = Array.from(tasksMap.values());
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Ошибка загрузки задач';
        state.currentProjectId = null;
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
            
            // Обновляем кэш
            const projectId = newTask.project?._id || newTask.project;
            if (state.loadedProjects[projectId]) {
              state.loadedProjects[projectId].tasks = [...state.items];
              state.loadedProjects[projectId].timestamp = Date.now();
            }
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
            
            // Обновляем кэш
            const projectId = updatedTask.project?._id || updatedTask.project;
            if (state.loadedProjects[projectId]) {
              const cacheIndex = state.loadedProjects[projectId].tasks.findIndex(t => t._id === updatedTask._id);
              if (cacheIndex !== -1) {
                state.loadedProjects[projectId].tasks[cacheIndex] = { ...state.loadedProjects[projectId].tasks[cacheIndex], ...updatedTask };
                state.loadedProjects[projectId].timestamp = Date.now();
              }
            }
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
          
          // Обновляем кэш для всех проектов
          Object.keys(state.loadedProjects).forEach(projectId => {
            state.loadedProjects[projectId].tasks = state.loadedProjects[projectId].tasks.filter(t => t._id !== taskId);
            state.loadedProjects[projectId].timestamp = Date.now();
          });
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.operationError = action.payload || 'Ошибка удаления задачи';
      });
  }
});

export const { 
  clearTasks, 
  clearError,
  setCurrentProjectId,
  addTaskFromSocket,
  updateTaskFromSocket,
  deleteTaskFromSocket,
  clearProjectTasks,
  updateLastFetchTime
} = tasksSlice.actions;
export default tasksSlice.reducer;