// API configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
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
  TASK_CREATED: 'taskCreated',
  TASK_UPDATED: 'taskUpdated',
  TASK_DELETED: 'taskDeleted',
  COMMENT_ADDED: 'commentAdded',
  COMMENT_UPDATED: 'commentUpdated',
  COMMENT_DELETED: 'commentDeleted',
  PROJECT_UPDATED: 'projectUpdated',
  PROJECT_DELETED: 'projectDeleted',
  MEMBER_JOINED: 'memberJoined',
  MEMBER_LEFT: 'memberLeft',
  CHECKLIST_UPDATED: 'checklistUpdated',
  TASK_STATUS_CHANGED: 'taskStatusChanged',
  TASK_ASSIGNED: 'taskAssigned',
  USER_MENTIONED: 'userMentioned'
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  NOTIFICATIONS: 'notifications'
};

// Pagination
export const ITEMS_PER_PAGE = 10;
export const DEFAULT_PAGE = 1;

// Настройки приложения
export const APP_NAME = 'TaskFlow';
export const APP_DESCRIPTION = 'Платформа управления проектами и задачами';

// Цвета для приоритетов
export const PRIORITY_COLORS = {
  LOW: 'success',
  MEDIUM: 'primary',
  HIGH: 'warning',
  CRITICAL: 'danger'
};

// Цвета для статусов
export const STATUS_COLORS = {
  [TASK_STATUSES.TODO]: 'secondary',
  [TASK_STATUSES.IN_PROGRESS]: 'primary',
  [TASK_STATUSES.REVIEW]: 'info',
  [TASK_STATUSES.DONE]: 'success',
  [TASK_STATUSES.BACKLOG]: 'light'
};

// Лимиты
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_UPLOAD = 5;
export const MAX_PROJECT_MEMBERS = 50;
export const MAX_TASKS_PER_PROJECT = 1000;

// Форматы дат
export const DATE_FORMAT = 'dd.MM.yyyy';
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';

// Пути для загрузок
export const UPLOAD_PATHS = {
  AVATARS: '/uploads/avatars',
  TASK_ATTACHMENTS: '/uploads/tasks',
  PROJECT_FILES: '/uploads/projects',
  COMMENTS: '/uploads/comments'
};

export default {
  API_URL,
  WS_URL,
  SOCKET_URL,
  PROJECT_TEMPLATES,
  PROJECT_STATUSES,
  MEMBER_ROLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  WS_EVENTS,
  STORAGE_KEYS,
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  APP_NAME,
  APP_DESCRIPTION,
  PRIORITY_COLORS,
  STATUS_COLORS,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  MAX_PROJECT_MEMBERS,
  MAX_TASKS_PER_PROJECT,
  DATE_FORMAT,
  DATETIME_FORMAT,
  TIME_FORMAT,
  UPLOAD_PATHS
};