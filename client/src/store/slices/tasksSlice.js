import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';

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
      return taskId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
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
    operationError: null
  },
  reducers: {
    clearTasks: (state) => {
      state.items = [];
    },
    clearError: (state) => {
      state.error = null;
      state.operationError = null;
    },
    // Синхронные экшены для WebSocket обновлений
    addTaskFromSocket: (state, action) => {
      const newTask = action.payload;
      // Проверяем, нет ли уже такой задачи
      const exists = state.items.find(task => task._id === newTask._id);
      if (!exists) {
        state.items.push(newTask);
      }
    },
    updateTaskFromSocket: (state, action) => {
      const updatedTask = action.payload;
      const index = state.items.findIndex(task => task._id === updatedTask._id);
      if (index !== -1) {
        state.items[index] = updatedTask;
      }
    },
    deleteTaskFromSocket: (state, action) => {
      const taskId = action.payload;
      state.items = state.items.filter(task => task._id !== taskId);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.tasks;
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch tasks';
      })
      .addCase(createTask.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.items.push(action.payload.task);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload?.message || 'Failed to create task';
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const updatedTask = action.payload.task;
        const index = state.items.findIndex(t => t._id === updatedTask._id);
        if (index !== -1) {
          state.items[index] = updatedTask;
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t._id !== action.payload);
      });
  }
});

export const { 
  clearTasks, 
  clearError,
  addTaskFromSocket,
  updateTaskFromSocket,
  deleteTaskFromSocket
} = tasksSlice.actions;
export default tasksSlice.reducer;