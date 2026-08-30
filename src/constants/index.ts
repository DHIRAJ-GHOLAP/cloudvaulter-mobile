export const API_BASE_URL = 'https://api.cloudvaulter.space';
export const API_URL = `${API_BASE_URL}/api/v1`;

export const APP_NAME = 'CloudVaulter';
export const APP_VERSION = '1.0.0';

export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'cv_auth_token',
  USER: 'cv_user',
  THEME: 'cv_theme',
} as const;
