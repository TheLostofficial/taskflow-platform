// API configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
export const SOCKET_URL = WS_URL; // Алиас для совместимости

// Project constants
export const PROJECT_TEMPLATES = {
  KANBAN: 'kanban',
  SCRUM: 'scrum',
  CUSTOM: 'custom'
};

export const PROJECT_STATUSES = {
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

// Task constants
export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const TASK_STATUSES = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
  BACKLOG: 'Backlog'
};

// WebSocket events
export const WS_EVENTS = {
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  COMMENT_ADDED: 'comment_added',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left'
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme'
};

// Pagination
export const ITEMS_PER_PAGE = 10;
export const DEFAULT_PAGE = 1;