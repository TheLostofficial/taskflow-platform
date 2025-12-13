import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectService } from '../../services/projectService';

// Дебаг флаг
const DEBUG = true;

// Вспомогательная функция для логирования
const log = (type, message, data = null) => {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    const prefix = type === 'info' ? 'ℹ️' : type === 'error' ? '❌' : type === 'success' ? '✅' : '⚠️';
    console.log(`${prefix} [${timestamp}] ${message}`);
    if (data) console.log('   Данные:', data);
  }
};

// Глобальный кэш для предотвращения дублирования запросов
const requestCache = new Map();
const CACHE_DURATION = 30000; // 30 секунд

const getCacheKey = (action, id) => `${action}_${id || 'all'}`;

export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      const { lastFetchTime } = state.projects;
      
      // Проверяем кэш
      const cacheKey = getCacheKey('fetchProjects');
      const cached = requestCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        log('info', 'Используем кэшированные проекты');
        return cached.data;
      }
      
      // Проверяем частоту запросов
      if (lastFetchTime && Date.now() - lastFetchTime < 5000) {
        log('info', 'Пропускаем запрос проектов (слишком частые запросы)');
        const lastData = state.projects.projects;
        return { projects: lastData };
      }
      
      log('info', 'Загрузка проектов...');
      
      const response = await projectService.getProjects();
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        projects: Array.isArray(response.data.projects) 
          ? response.data.projects 
          : (Array.isArray(response.data) ? response.data : []),
        message: response.data.message || 'Проекты загружены'
      };
      
      // Кэшируем результат
      requestCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      log('success', 'Проекты успешно загружены', { count: data.projects.length });
      return data;
    } catch (error) {
      log('error', 'Ошибка загрузки проектов', error);
      
      // Если ошибка 429, ждем перед повторной попыткой
      if (error.response?.status === 429) {
        log('info', 'Слишком много запросов. Ждем...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Пробуем еще раз
        try {
          const response = await projectService.getProjects();
          const data = {
            projects: Array.isArray(response.data.projects) 
              ? response.data.projects 
              : (Array.isArray(response.data) ? response.data : []),
            message: response.data.message || 'Проекты загружены'
          };
          
          log('success', 'Проекты загружены после ожидания');
          return data;
        } catch (retryError) {
          log('error', 'Ошибка при повторной попытке', retryError);
          return rejectWithValue(retryError.response?.data?.message || 'Ошибка загрузки проектов');
        }
      }
      
      // Если сетевой ошибки нет, возвращаем данные из состояния
      if (error.response) {
        return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки проектов');
      } else {
        // Сетевая ошибка - используем данные из состояния
        log('info', 'Сетевая ошибка. Используем существующие данные');
        const state = getState();
        return { projects: state.projects.projects || [] };
      }
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId, { rejectWithValue, getState }) => {
    try {
      if (!projectId || projectId === 'undefined') {
        throw new Error('ID проекта не указан или указан некорректно');
      }
      
      // Проверяем кэш
      const cacheKey = getCacheKey('fetchProjectById', projectId);
      const cached = requestCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        log('info', `Используем кэшированный проект ${projectId}`);
        return cached.data;
      }
      
      log('info', `Загрузка проекта ${projectId}...`);
      
      const response = await projectService.getProjectById(projectId);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        project: response.data.project || response.data,
        message: response.data.message || 'Проект загружен'
      };
      
      // Кэшируем результат
      requestCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      log('success', `Проект ${projectId} успешно загружен`, { name: data.project.name });
      return data;
    } catch (error) {
      log('error', `Ошибка загрузки проекта ${projectId}`, error);
      
      if (error.response?.status === 429) {
        log('info', `Слишком много запросов для проекта ${projectId}. Ждем...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const response = await projectService.getProjectById(projectId);
          const data = {
            project: response.data.project || response.data,
            message: response.data.message || 'Проект загружен'
          };
          
          log('success', `Проект ${projectId} загружен после ожидания`);
          return data;
        } catch (retryError) {
          log('error', `Ошибка при повторной попытке загрузки проекта ${projectId}`, retryError);
          return rejectWithValue(retryError.response?.data?.message || 'Ошибка загрузки проекта');
        }
      }
      
      // Если ошибка 404, проверяем есть ли проект в списке
      if (error.response?.status === 404) {
        const state = getState();
        const existingProject = state.projects.projects.find(p => p._id === projectId);
        if (existingProject) {
          log('info', `Проект ${projectId} найден в локальном кэше`);
          return { project: existingProject };
        }
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки проекта');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      log('info', 'Создание нового проекта...', { name: projectData.name });
      
      const response = await projectService.createProject(projectData);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        project: response.data.project || response.data,
        message: response.data.message || 'Проект создан'
      };
      
      // Очищаем кэш проектов
      requestCache.delete(getCacheKey('fetchProjects'));
      
      log('success', 'Проект успешно создан', { id: data.project._id, name: data.project.name });
      return data;
    } catch (error) {
      log('error', 'Ошибка создания проекта', error);
      
      if (error.response?.status === 429) {
        log('info', 'Слишком много запросов при создании проекта. Ждем...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const response = await projectService.createProject(projectData);
          const data = {
            project: response.data.project || response.data,
            message: response.data.message || 'Проект создан'
          };
          
          log('success', 'Проект создан после ожидания');
          return data;
        } catch (retryError) {
          log('error', 'Ошибка при повторной попытке создания проекта', retryError);
          return rejectWithValue(retryError.response?.data?.message || 'Ошибка создания проекта');
        }
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка создания проекта');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { rejectWithValue }) => {
    try {
      log('info', `Обновление проекта ${projectId}...`);
      
      const response = await projectService.updateProject(projectId, projectData);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        project: response.data.project || response.data,
        message: response.data.message || 'Проект обновлен'
      };
      
      // Очищаем кэш этого проекта и всех проектов
      requestCache.delete(getCacheKey('fetchProjects'));
      requestCache.delete(getCacheKey('fetchProjectById', projectId));
      
      log('success', `Проект ${projectId} успешно обновлен`);
      return data;
    } catch (error) {
      log('error', `Ошибка обновления проекта ${projectId}`, error);
      
      if (error.response?.status === 429) {
        log('info', `Слишком много запросов при обновлении проекта ${projectId}. Ждем...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const response = await projectService.updateProject(projectId, projectData);
          const data = {
            project: response.data.project || response.data,
            message: response.data.message || 'Проект обновлен'
          };
          
          log('success', `Проект ${projectId} обновлен после ожидания`);
          return data;
        } catch (retryError) {
          log('error', `Ошибка при повторной попытке обновления проекта ${projectId}`, retryError);
          return rejectWithValue(retryError.response?.data?.message || 'Ошибка обновления проекта');
        }
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка обновления проекта');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { rejectWithValue }) => {
    try {
      log('info', `Удаление проекта ${projectId}...`);
      
      await projectService.deleteProject(projectId);
      
      // Очищаем кэш
      requestCache.delete(getCacheKey('fetchProjects'));
      requestCache.delete(getCacheKey('fetchProjectById', projectId));
      
      log('success', `Проект ${projectId} успешно удален`);
      return projectId;
    } catch (error) {
      log('error', `Ошибка удаления проекта ${projectId}`, error);
      
      if (error.response?.status === 429) {
        log('info', `Слишком много запросов при удалении проекта ${projectId}. Ждем...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          await projectService.deleteProject(projectId);
          
          requestCache.delete(getCacheKey('fetchProjects'));
          requestCache.delete(getCacheKey('fetchProjectById', projectId));
          
          log('success', `Проект ${projectId} удален после ожидания`);
          return projectId;
        } catch (retryError) {
          log('error', `Ошибка при повторной попытке удаления проекта ${projectId}`, retryError);
          return rejectWithValue(retryError.response?.data?.message || 'Ошибка удаления проекта');
        }
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка удаления проекта');
    }
  }
);

export const archiveProject = createAsyncThunk(
  'projects/archiveProject',
  async (projectId, { rejectWithValue }) => {
    try {
      log('info', `Архивация проекта ${projectId}...`);
      
      const response = await projectService.archiveProject(projectId);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        project: response.data.project || response.data,
        message: response.data.message || 'Проект архивирован'
      };
      
      // Очищаем кэш
      requestCache.delete(getCacheKey('fetchProjects'));
      requestCache.delete(getCacheKey('fetchProjectById', projectId));
      
      log('success', `Проект ${projectId} успешно архивирован`);
      return data;
    } catch (error) {
      log('error', `Ошибка архивации проекта ${projectId}`, error);
      
      if (error.response?.status === 429) {
        log('info', `Слишком много запросов при архивации проекта ${projectId}. Ждем...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const response = await projectService.archiveProject(projectId);
          const data = {
            project: response.data.project || response.data,
            message: response.data.message || 'Проект архивирован'
          };
          
          log('success', `Проект ${projectId} архивирован после ожидания`);
          return data;
        } catch (retryError) {
          log('error', `Ошибка при повторной попытке архивации проекта ${projectId}`, retryError);
          return rejectWithValue(retryError.response?.data?.message || 'Ошибка архивации проекта');
        }
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка архивации проекта');
    }
  }
);

export const updateMemberRole = createAsyncThunk(
  'projects/updateMemberRole',
  async ({ projectId, userId, role }, { rejectWithValue }) => {
    try {
      log('info', `Обновление роли пользователя ${userId} в проекте ${projectId} на ${role}...`);
      
      const response = await projectService.updateMemberRole(projectId, userId, role);
      
      if (!response || !response.data) {
        throw new Error('Некорректный ответ от сервера');
      }
      
      const data = {
        projectId,
        members: response.data.members || [],
        message: response.data.message || 'Роль участника обновлена'
      };
      
      // Очищаем кэш проекта
      requestCache.delete(getCacheKey('fetchProjectById', projectId));
      
      log('success', `Роль пользователя ${userId} в проекте ${projectId} обновлена на ${role}`);
      return data;
    } catch (error) {
      log('error', `Ошибка обновления роли пользователя ${userId} в проекте ${projectId}`, error);
      
      if (error.response?.status === 429) {
        log('info', `Слишком много запросов при обновлении роли. Ждем...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const response = await projectService.updateMemberRole(projectId, userId, role);
          const data = {
            projectId,
            members: response.data.members || [],
            message: response.data.message || 'Роль участника обновлена'
          };
          
          log('success', `Роль обновлена после ожидания`);
          return data;
        } catch (retryError) {
          log('error', `Ошибка при повторной попытке обновления роли`, retryError);
          return rejectWithValue(retryError.response?.data?.message || 'Ошибка обновления роли участника');
        }
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка обновления роли участника');
    }
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
    networkError: false,
    createSuccess: false,
    lastFetchTime: null,
    lastProjectFetchTime: null,
    requestCount: 0
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.networkError = false;
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
      log('info', 'Текущий проект установлен', { id: action.payload?._id });
    },
    clearCurrentProject: (state) => {
      log('info', 'Текущий проект очищен', { id: state.currentProject?._id });
      state.currentProject = null;
    },
    resetCreateSuccess: (state) => {
      state.createSuccess = false;
    },
    addMockProject: (state, action) => {
      const mockProject = {
        _id: Date.now().toString(),
        name: action.payload.name || 'Тестовый проект',
        description: action.payload.description || 'Создан в оффлайн режиме',
        owner: { _id: 'mock', name: 'Вы' },
        members: [],
        tasks: [],
        taskCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active'
      };
      state.projects.push(mockProject);
      log('info', 'Добавлен тестовый проект', { name: mockProject.name });
    },
    updateProjectTaskCount: (state, action) => {
      const { projectId, count } = action.payload;
      const projectIndex = state.projects.findIndex(p => p._id === projectId);
      if (projectIndex !== -1) {
        state.projects[projectIndex].taskCount = count;
      }
      if (state.currentProject && state.currentProject._id === projectId) {
        state.currentProject.taskCount = count;
      }
      log('info', `Обновлено количество задач в проекте ${projectId}: ${count}`);
    },
    clearProjectsCache: (state) => {
      state.projects = [];
      state.currentProject = null;
      state.lastFetchTime = null;
      state.lastProjectFetchTime = null;
      state.requestCount = 0;
      log('info', 'Кэш проектов очищен');
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
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.networkError = false;
        state.requestCount += 1;
        log('info', 'Загрузка проектов начата');
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        
        // Проверяем, что пришли корректные данные
        if (action.payload && action.payload.projects) {
          const projects = Array.isArray(action.payload.projects) 
            ? action.payload.projects 
            : [];
          
          // Удаляем дубликаты
          const projectMap = new Map();
          projects.forEach(project => {
            if (project && project._id) {
              // Добавляем taskCount если его нет
              if (project.taskCount === undefined) {
                project.taskCount = 0;
              }
              projectMap.set(project._id, project);
            }
          });
          
          state.projects = Array.from(projectMap.values());
        } else {
          state.projects = [];
        }
        
        state.error = null;
        state.lastFetchTime = Date.now();
        log('success', 'Проекты успешно загружены', { count: state.projects.length });
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Ошибка загрузки проектов';
        state.networkError = !action.error.response;
        state.lastFetchTime = Date.now();
        log('error', 'Ошибка загрузки проектов', action.payload);
      })
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.networkError = false;
        state.requestCount += 1;
        log('info', 'Загрузка проекта по ID начата');
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        
        if (action.payload && action.payload.project) {
          const project = action.payload.project;
          
          // Добавляем taskCount если его нет
          if (project.taskCount === undefined) {
            project.taskCount = 0;
          }
          
          state.currentProject = project;
          
          // Обновляем проект в списке
          const projectIndex = state.projects.findIndex(p => p._id === project._id);
          if (projectIndex !== -1) {
            state.projects[projectIndex] = { ...state.projects[projectIndex], ...project };
          } else {
            state.projects.push(project);
          }
        }
        
        state.error = null;
        state.lastProjectFetchTime = Date.now();
        log('success', 'Проект по ID успешно загружен', { id: action.payload?.project?._id });
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentProject = null;
        state.networkError = !action.error.response;
        state.lastProjectFetchTime = Date.now();
        log('error', 'Ошибка загрузки проекта по ID', action.payload);
      })
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.createSuccess = false;
        state.networkError = false;
        state.requestCount += 1;
        log('info', 'Создание проекта начато');
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        
        if (action.payload && action.payload.project) {
          const project = action.payload.project;
          
          // Добавляем taskCount если его нет
          if (project.taskCount === undefined) {
            project.taskCount = 0;
          }
          
          // Проверяем, нет ли уже такого проекта
          const exists = state.projects.find(p => p._id === project._id);
          if (!exists) {
            state.projects.unshift(project);
          }
        }
        
        state.createSuccess = true;
        state.error = null;
        log('success', 'Проект успешно создан', { id: action.payload?.project?._id });
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.createSuccess = false;
        state.networkError = !action.error.response;
        log('error', 'Ошибка создания проекта', action.payload);
      })
      .addCase(updateProject.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.requestCount += 1;
        log('info', 'Обновление проекта начато');
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading = false;
        
        if (action.payload && action.payload.project) {
          const updatedProject = action.payload.project;
          
          // Обновляем в списке проектов
          const index = state.projects.findIndex(p => p._id === updatedProject._id);
          if (index !== -1) {
            state.projects[index] = { ...state.projects[index], ...updatedProject };
          }
          
          // Обновляем текущий проект, если он открыт
          if (state.currentProject && state.currentProject._id === updatedProject._id) {
            state.currentProject = { ...state.currentProject, ...updatedProject };
          }
        }
        
        state.error = null;
        log('success', 'Проект успешно обновлен', { id: action.payload?.project?._id });
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        log('error', 'Ошибка обновления проекта', action.payload);
      })
      .addCase(deleteProject.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.requestCount += 1;
        log('info', 'Удаление проекта начато');
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = state.projects.filter(p => p._id !== action.payload);
        
        if (state.currentProject && state.currentProject._id === action.payload) {
          state.currentProject = null;
        }
        
        state.error = null;
        log('success', 'Проект успешно удален', { id: action.payload });
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        log('error', 'Ошибка удаления проекта', action.payload);
      })
      .addCase(archiveProject.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.requestCount += 1;
        log('info', 'Архивация проекта начата');
      })
      .addCase(archiveProject.fulfilled, (state, action) => {
        state.loading = false;
        
        if (action.payload && action.payload.project) {
          const archivedProject = action.payload.project;
          
          // Обновляем в списке проектов
          const index = state.projects.findIndex(p => p._id === archivedProject._id);
          if (index !== -1) {
            state.projects[index].status = archivedProject.status;
          }
          
          // Обновляем текущий проект, если он открыт
          if (state.currentProject && state.currentProject._id === archivedProject._id) {
            state.currentProject.status = archivedProject.status;
          }
        }
        
        state.error = null;
        log('success', 'Проект успешно архивирован');
      })
      .addCase(archiveProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        log('error', 'Ошибка архивации проекта', action.payload);
      })
      .addCase(updateMemberRole.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.requestCount += 1;
        log('info', 'Обновление роли участника начато');
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        state.loading = false;
        
        const { projectId, members } = action.payload;
        
        // Обновляем участников в текущем проекте
        if (state.currentProject && state.currentProject._id === projectId) {
          state.currentProject.members = members;
        }
        
        // Обновляем участников в списке проектов
        const projectIndex = state.projects.findIndex(p => p._id === projectId);
        if (projectIndex !== -1) {
          state.projects[projectIndex].members = members;
        }
        
        state.error = null;
        log('success', 'Роль участника успешно обновлена');
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        log('error', 'Ошибка обновления роли участника', action.payload);
      });
  },
});

export const { 
  clearError, 
  setCurrentProject, 
  clearCurrentProject, 
  addMockProject,
  resetCreateSuccess,
  updateProjectTaskCount,
  clearProjectsCache,
  incrementRequestCount,
  resetRequestCount
} = projectsSlice.actions;
export default projectsSlice.reducer;