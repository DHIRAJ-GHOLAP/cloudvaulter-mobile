import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  walletBalance?: number;
  is_active?: boolean;
  email_verified?: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{requiresVerification?: boolean; message?: string}>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem('cv_auth_token'),
          AsyncStorage.getItem('cv_user'),
        ]);
        if (savedToken) setToken(savedToken);
        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedToken) {
          try {
            const fresh = await authApi.getCurrentUser(savedToken);
            setUser(fresh);
            AsyncStorage.setItem('cv_user', JSON.stringify(fresh));
          } catch {}
        }
      } catch {} finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, user: u } = await authApi.login(email, password);
    setToken(access_token);
    setUser(u);
    await AsyncStorage.setItem('cv_auth_token', access_token);
    await AsyncStorage.setItem('cv_user', JSON.stringify(u));
  }, []);

  const loginWithGoogle = useCallback(async (googleToken: string) => {
    const { access_token, user: u } = await authApi.loginWithGoogle(googleToken);
    setToken(access_token);
    setUser(u);
    await AsyncStorage.setItem('cv_auth_token', access_token);
    await AsyncStorage.setItem('cv_user', JSON.stringify(u));
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.register(name, email, password);
    if (result.access_token && result.user) {
      setToken(result.access_token);
      setUser(result.user);
      await AsyncStorage.setItem('cv_auth_token', result.access_token);
      await AsyncStorage.setItem('cv_user', JSON.stringify(result.user));
    }
    return { requiresVerification: result.requiresVerification, message: result.message };
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(token); } catch {}
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(['cv_auth_token', 'cv_user']);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const fresh = await authApi.getCurrentUser(token);
      setUser(fresh);
      AsyncStorage.setItem('cv_user', JSON.stringify(fresh));
    } catch {}
  }, [token]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!user && !!token, login, loginWithGoogle, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
