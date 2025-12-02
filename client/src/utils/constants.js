export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const PROJECT_TEMPLATES = {
  KANBAN: 'kanban',
  SCRUM: 'scrum',
  CUSTOM: 'custom'
};

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  COMPLETED: 'completed'
};

export const MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};