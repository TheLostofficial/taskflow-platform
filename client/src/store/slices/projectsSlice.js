import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectService } from '../../services/projectService';

export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await projectService.getProjects();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await projectService.getProjectById(projectId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await projectService.createProject(projectData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { rejectWithValue }) => {
    try {
      const response = await projectService.updateProject(projectId, projectData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { rejectWithValue }) => {
    try {
      await projectService.deleteProject(projectId);
      return projectId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    items: [],
    currentProject: null,
    loading: false,
    error: null,
    operationLoading: false,
    operationError: null
  },
  reducers: {
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    clearError: (state) => {
      state.error = null;
      state.operationError = null;
    },
    clearOperationError: (state) => {
      state.operationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.projects;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch projects';
      })
      .addCase(fetchProjectById.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.currentProject = action.payload.project;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload?.message || 'Failed to fetch project';
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload.project);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const updatedProject = action.payload.project;
        const index = state.items.findIndex(p => p._id === updatedProject._id);
        if (index !== -1) {
          state.items[index] = updatedProject;
        }
        if (state.currentProject && state.currentProject._id === updatedProject._id) {
          state.currentProject = updatedProject;
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p._id !== action.payload);
        if (state.currentProject && state.currentProject._id === action.payload) {
          state.currentProject = null;
        }
      });
  }
});

export const { clearCurrentProject, clearError, clearOperationError } = projectsSlice.actions;
export default projectsSlice.reducer;