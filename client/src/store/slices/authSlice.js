import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      return rejectWithValue({ message: 'Ошибка сети' });
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      return rejectWithValue({ message: 'Ошибка сети' });
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getCurrentUser();
      return response.user;
    } catch (error) {
      if (error.message.includes('401')) {
        localStorage.removeItem('token');
      }
      return rejectWithValue(error.message || 'Не удалось загрузить профиль');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await userService.updateProfile(profileData);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message || 'Не удалось обновить профиль');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await userService.changePassword(passwordData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка при смене пароля');
    }
  }
);

export const getNotificationSettings = createAsyncThunk(
  'auth/getNotificationSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getNotificationSettings();
      return response.settings;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка загрузки настроек уведомлений');
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'auth/updateNotificationSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await userService.updateNotificationSettings(settings);
      return response.settings;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка обновления настроек уведомлений');
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (file, { rejectWithValue }) => {
    try {
      const response = await userService.uploadAvatar(file);
      return response.avatarUrl;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка загрузки аватара');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    profileLoading: false,
    notificationsLoading: false,
    error: null,
    success: null,
    notificationSettings: {
      emailNotifications: true,
      taskAssignments: true,
      mentions: true,
      deadlineReminders: true,
      projectUpdates: false
    }
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.success = null;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = !!action.payload;
      localStorage.setItem('token', action.payload);
    },
    updateUserField: (state, action) => {
      const { field, value } = action.payload;
      if (state.user) {
        state.user[field] = value;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Регистрация
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.success = 'Регистрация успешна!';
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Ошибка регистрации';
      })
      
      // Вход
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.success = 'Вход выполнен успешно!';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Ошибка входа';
      })
      
      // Получение текущего пользователя
      .addCase(getCurrentUser.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.user = action.payload;
        // Обновляем настройки уведомлений из профиля пользователя
        if (action.payload.preferences?.notifications) {
          state.notificationSettings = action.payload.preferences.notifications;
        }
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload;
      })
      
      // Обновление профиля
      .addCase(updateUserProfile.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.user = action.payload;
        state.success = 'Профиль успешно обновлен!';
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload;
      })
      
      // Смена пароля
      .addCase(changePassword.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.profileLoading = false;
        state.success = 'Пароль успешно изменен!';
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload;
      })
      
      // Получение настроек уведомлений
      .addCase(getNotificationSettings.pending, (state) => {
        state.notificationsLoading = true;
        state.error = null;
      })
      .addCase(getNotificationSettings.fulfilled, (state, action) => {
        state.notificationsLoading = false;
        state.notificationSettings = action.payload;
      })
      .addCase(getNotificationSettings.rejected, (state, action) => {
        state.notificationsLoading = false;
        state.error = action.payload;
      })
      
      // Обновление настроек уведомлений
      .addCase(updateNotificationSettings.pending, (state) => {
        state.notificationsLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.notificationsLoading = false;
        state.notificationSettings = action.payload;
        state.success = 'Настройки уведомлений обновлены!';
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.notificationsLoading = false;
        state.error = action.payload;
      })
      
      // Загрузка аватара
      .addCase(uploadAvatar.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.profileLoading = false;
        if (state.user) {
          state.user.avatar = action.payload;
        }
        state.success = 'Аватар успешно обновлен!';
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  logout, 
  clearError, 
  clearSuccess, 
  setUser, 
  setToken,
  updateUserField 
} = authSlice.actions;

export default authSlice.reducer;
