import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectsReducer from './slices/projectsSlice';
import tasksReducer from './slices/tasksSlice';

// Сброс состояния (для разработки)
const preloadedState = {
  projects: {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
  }
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
  },
  preloadedState,
});
