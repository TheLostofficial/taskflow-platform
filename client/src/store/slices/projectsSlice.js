import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectService } from '../../services/projectService';

export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 fetchProjects: Starting...');
      const response = await projectService.getProjects();
      console.log('✅ fetchProjects: Success', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ fetchProjects: Error', error.response?.data || error.message);
      
      if (!error.response) {
        console.log('⚠️ fetchProjects: Network error, using mock data');
        return rejectWithValue('Network error. Using mock data for testing.');
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки проектов');
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId, { rejectWithValue }) => {
    try {
      if (!projectId || projectId === 'undefined') {
        throw new Error('Invalid project ID');
      }
      
      console.log(`🔄 fetchProjectById: Starting for project ${projectId}...`);
      const response = await projectService.getProjectById(projectId);
      console.log('✅ fetchProjectById: Success', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ fetchProjectById: Error', error.response?.data || error.message);
      
      if (!error.response) {
        console.log('⚠️ fetchProjectById: Network error, using mock data');
        return rejectWithValue('Network error while fetching project');
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки проекта');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      console.log('🔄 createProject: Starting...', projectData);
      const response = await projectService.createProject(projectData);
      console.log('✅ createProject: Success', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ createProject: Error', error.response?.data || error.message);
      
      if (!error.response) {
        console.log('⚠️ createProject: Network error, simulating success for testing');
        return rejectWithValue('Network error while creating project');
      }
      
      return rejectWithValue(error.response?.data?.message || 'Ошибка создания проекта');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { rejectWithValue }) => {
    try {
      console.log(`🔄 updateProject: Starting for project ${projectId}...`);
      const response = await projectService.updateProject(projectId, projectData);
      console.log('✅ updateProject: Success', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ updateProject: Error', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Ошибка обновления проекта');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { rejectWithValue }) => {
    try {
      console.log(`🔄 deleteProject: Starting for project ${projectId}...`);
      await projectService.deleteProject(projectId);
      console.log('✅ deleteProject: Success');
      return projectId;
    } catch (error) {
      console.error('❌ deleteProject: Error', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Ошибка удаления проекта');
    }
  }
);

export const archiveProject = createAsyncThunk(
  'projects/archiveProject',
  async (projectId, { rejectWithValue }) => {
    try {
      console.log(`🔄 archiveProject: Starting for project ${projectId}...`);
      const response = await projectService.archiveProject(projectId);
      console.log('✅ archiveProject: Success', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ archiveProject: Error', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Ошибка архивации проекта');
    }
  }
);

export const updateMemberRole = createAsyncThunk(
  'projects/updateMemberRole',
  async ({ projectId, userId, role }, { rejectWithValue }) => {
    try {
      console.log(`🔄 updateMemberRole: Updating role for user ${userId} to ${role}...`);
      const response = await projectService.updateMemberRole(projectId, userId, role);
      console.log('✅ updateMemberRole: Success', response.data);
      return { projectId, members: response.data.members };
    } catch (error) {
      console.error('❌ updateMemberRole: Error', error.response?.data || error.message);
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
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.networkError = false;
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    },
    clearCurrentProject: (state) => {
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
    },
    // Обновить количество задач в проекте
    updateProjectTaskCount: (state, action) => {
      const { projectId, count } = action.payload;
      const projectIndex = state.projects.findIndex(p => p._id === projectId);
      if (projectIndex !== -1) {
        state.projects[projectIndex].taskCount = count;
      }
      if (state.currentProject && state.currentProject._id === projectId) {
        state.currentProject.taskCount = count;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.networkError = false;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = Array.isArray(action.payload.projects) 
          ? action.payload.projects 
          : [];
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.networkError = !action.error.response;
      })
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.networkError = false;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload.project || action.payload;
        state.error = null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentProject = null;
        state.networkError = !action.error.response;
      })
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.createSuccess = false;
        state.networkError = false;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        const project = action.payload.project || action.payload;
        if (project && project._id) {
          // Добавляем taskCount если его нет
          if (project.taskCount === undefined) {
            project.taskCount = 0;
          }
          // Проверяем, нет ли уже такого проекта
          const exists = state.projects.find(p => p._id === project._id);
          if (!exists) {
            state.projects.unshift(project); // Добавляем в начало
          }
        }
        state.createSuccess = true;
        state.error = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.createSuccess = false;
        state.networkError = !action.error.response;
      })
      .addCase(updateProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProject = action.payload.project || action.payload;
        if (updatedProject && updatedProject._id) {
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
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = state.projects.filter(p => p._id !== action.payload);
        if (state.currentProject && state.currentProject._id === action.payload) {
          state.currentProject = null;
        }
        state.error = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(archiveProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveProject.fulfilled, (state, action) => {
        state.loading = false;
        const archivedProject = action.payload.project || action.payload;
        if (archivedProject && archivedProject._id) {
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
      })
      .addCase(archiveProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateMemberRole.pending, (state) => {
        state.loading = true;
        state.error = null;
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
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  clearError, 
  setCurrentProject, 
  clearCurrentProject, 
  addMockProject,
  resetCreateSuccess,
  updateProjectTaskCount
} = projectsSlice.actions;
export default projectsSlice.reducer;