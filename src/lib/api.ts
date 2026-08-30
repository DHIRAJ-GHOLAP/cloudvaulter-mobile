import axios, { AxiosProgressEvent } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.cloudvaulter.space/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Attach stored auth token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('cv_auth_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const mapUser = (u: any) => ({
  id: String(u.id ?? u._id ?? ''),
  name: u.name ?? u.full_name ?? u.email?.split('@')[0] ?? 'User',
  email: u.email ?? '',
  role: (u.is_admin ? 'admin' : 'user') as 'user' | 'admin',
  walletBalance: u.wallet_balance,
  is_active: u.is_active,
  email_verified: u.email_verified,
});

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    const user = mapUser(data.user ?? (await apiClient.get('/users/me')).data);
    return { access_token: data.access_token, user };
  },

  loginWithGoogle: async (token: string) => {
    const { data } = await apiClient.post('/auth/google', { token });
    const user = mapUser(data.user ?? (await apiClient.get('/users/me')).data);
    return { access_token: data.access_token, user };
  },

  register: async (name: string, email: string, password: string) => {
    const { data } = await apiClient.post('/auth/register', { name, email, password });
    if (data.access_token) {
      const user = mapUser(data.user ?? (await apiClient.get('/users/me')).data);
      return { access_token: data.access_token, user };
    }
    return {
      access_token: null,
      user: null,
      requiresVerification: data.email_verification_required ?? true,
      message: data.message,
    };
  },

  logout: async (_token?: string | null) => {
    try {
      await apiClient.post('/auth/logout');
    } catch {}
  },

  getCurrentUser: async (_token?: string | null) => {
    const { data } = await apiClient.get('/users/me');
    return mapUser(data);
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data as { message: string };
  },

  resendVerification: async (email: string) => {
    const { data } = await apiClient.post('/auth/resend-verification', { email });
    return data as { message: string };
  },
};

// ─── Files API ───────────────────────────────────────────────────────────────

export const filesApi = {
  list: async (parentId?: string) => {
    const params: Record<string, string> = {};
    if (parentId) params['parent_id'] = parentId;
    const { data } = await apiClient.get('/files/', { params });
    return data as { folders: any[]; files: any[]; path?: any[] };
  },

  createFolder: async (name: string, parentId?: string) => {
    const { data } = await apiClient.post('/files/folders', {
      name,
      parent_id: parentId,
    });
    return data;
  },

  upload: async (
    uri: string,
    name: string,
    type: string,
    parentId?: string,
    onProgress?: (progress: number) => void,
  ) => {
    const formData = new FormData();
    formData.append('file', { uri, name, type } as any);
    if (parentId) formData.append('parent_id', parentId);
    const { data } = await apiClient.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  delete: async (fileId: string) => {
    await apiClient.delete(`/files/${fileId}`);
  },

  deleteFolder: async (folderId: string) => {
    await apiClient.delete(`/files/folders/${folderId}`);
  },

  getSignedUrl: async (fileId: string, purpose = 'download') => {
    const { data } = await apiClient.post('/signed-urls/generate', {
      file_id: fileId,
      purpose,
    });
    return data as { url: string };
  },

  toggleFolderSharing: async (folderId: string, isShared: boolean) => {
    const { data } = await apiClient.post(`/files/folders/${folderId}/share`, {
      is_shared: isShared,
    });
    return data as { share_url: string; share_token: string };
  },

  moveItems: async (fileIds: string[], folderIds: string[], targetParentId?: string) => {
    const { data } = await apiClient.post('/files/move', {
      file_ids: fileIds,
      folder_ids: folderIds,
      target_parent_id: targetParentId,
    });
    return data;
  },
};

// ─── Wallet API ──────────────────────────────────────────────────────────────

export const walletApi = {
  getBalance: async () => {
    const { data } = await apiClient.get('/wallet/balance');
    return data as { balance: number; currency: string };
  },

  getTransactions: async (skip = 0, limit = 50) => {
    const { data } = await apiClient.get('/wallet/transactions', {
      params: { skip, limit },
    });
    return data as { transactions: any[]; total: number };
  },

  createOrder: async (amount: number) => {
    const { data } = await apiClient.post('/payments/create-order', { amount });
    return data;
  },

  verifyPayment: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    amount: number;
  }) => {
    const { data } = await apiClient.post('/payments/verify', payload);
    return data;
  },
};

// ─── Dashboard API ───────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: async () => {
    const { data } = await apiClient.get('/dashboard/stats');
    return data;
  },
};

// ─── Usage API ───────────────────────────────────────────────────────────────

export const usageApi = {
  getCurrent: async () => {
    const { data } = await apiClient.get('/usage/current');
    return data;
  },
};

// ─── Pricing API ─────────────────────────────────────────────────────────────

export const pricingApi = {
  getConfig: async () => {
    const { data } = await apiClient.get('/pricing/config');
    return data;
  },
};

// ─── Developer API ───────────────────────────────────────────────────────────

export const developerApi = {
  getApiKeys: async () => {
    const { data } = await apiClient.get('/developer/api-keys');
    return data as { keys: any[] };
  },

  createApiKey: async (name: string) => {
    const { data } = await apiClient.post('/developer/api-keys', { name });
    return data;
  },

  deleteApiKey: async (id: string) => {
    await apiClient.delete(`/developer/api-keys/${id}`);
  },

  getUsage: async () => {
    const { data } = await apiClient.get('/developer/usage');
    return data;
  },
};

// ─── User API ────────────────────────────────────────────────────────────────

export const userApi = {
  getProfile: async () => {
    const { data } = await apiClient.get('/users/me');
    return mapUser(data);
  },

  updateProfile: async (updates: Partial<{ name: string }>) => {
    const { data } = await apiClient.patch('/users/me', updates);
    return mapUser(data);
  },
};
