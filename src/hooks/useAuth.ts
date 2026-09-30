import { useState, useEffect, useCallback } from 'react';
import { AppUser, LoginCredentials, GoogleLoginCredentials, CreateUserData, UpdateUserData, RegisterFarmData } from '../types';
import { api } from '../services/api';

const STORAGE_KEY_SESSION_USER = 'dairypulse_auth_user';
const STORAGE_KEY_SESSION_TOKEN = 'dairypulse_auth_token';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEY_SESSION_TOKEN);
      const savedUser = localStorage.getItem(STORAGE_KEY_SESSION_USER);
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id && parsed.role) {
          return parsed as AppUser;
        }
      }
    } catch {
      // ignore parse error
    }
    return null;
  });

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(false);

  // Authoritative session verification against Google Apps Script on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_SESSION_TOKEN);
    if (!token) {
      setCurrentUser(null);
      return;
    }

    let isMounted = true;
    const verifySession = async () => {
      try {
        const res = await api.validateSession();
        if (!isMounted) return;

        if (res.success && res.data?.user) {
          const freshUser = res.data.user;
          setCurrentUser(freshUser);
          try {
            localStorage.setItem(STORAGE_KEY_SESSION_USER, JSON.stringify(freshUser));
          } catch {
            // ignore
          }
        } else if (res.code === 'UNAUTHORIZED' || (res.error && res.error.toLowerCase().includes('expired'))) {
          // Authoritative rejection: clear invalid session
          setCurrentUser(null);
          try {
            localStorage.removeItem(STORAGE_KEY_SESSION_USER);
            localStorage.removeItem(STORAGE_KEY_SESSION_TOKEN);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Session verification could not reach backend:', err);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch farm team members from backend
  const refreshUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.getUsers();
      if (res.success && res.data && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.warn('Failed to load users from backend', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // On mount or user change, load users
  useEffect(() => {
    if (currentUser && currentUser.role === 'owner') {
      refreshUsers();
    }
  }, [currentUser, refreshUsers]);

  // Username + Password authentication
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setIsAuthChecking(true);
    try {
      const res = await api.login(credentials);
      const user = res.data?.user || (res as any).user || (res as any).data;
      if (res.success && user && (user.id || user.username || user.name)) {
        const authenticatedUser = user as AppUser;
        setCurrentUser(authenticatedUser);
        try {
          localStorage.setItem(STORAGE_KEY_SESSION_USER, JSON.stringify(authenticatedUser));
          const token = res.data?.token || (res as any).token;
          if (token) {
            localStorage.setItem(STORAGE_KEY_SESSION_TOKEN, token);
          }
        } catch {
          // ignore
        }
        if (authenticatedUser.role === 'owner') {
          await refreshUsers();
        }
        return { success: true };
      }
      return {
        success: false,
        error: res.error || 'Username or password is incorrect.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'We couldn’t sign you in right now. Please check your connection and try again.',
      };
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Google Sign-In authentication with ID token verification
  const googleLogin = async (
    credentials: GoogleLoginCredentials
  ): Promise<{ success: boolean; error?: string; code?: string; email?: string; name?: string }> => {
    setIsAuthChecking(true);
    try {
      const res = await api.googleLogin(credentials);
      const user = res.data?.user || (res as any).user || (res as any).data;
      if (res.success && user && (user.id || user.username || user.name)) {
        const authenticatedUser = user as AppUser;
        setCurrentUser(authenticatedUser);
        try {
          localStorage.setItem(STORAGE_KEY_SESSION_USER, JSON.stringify(authenticatedUser));
          const token = res.data?.token || (res as any).token;
          if (token) {
            localStorage.setItem(STORAGE_KEY_SESSION_TOKEN, token);
          }
        } catch {
          // ignore
        }
        if (authenticatedUser.role === 'owner') {
          await refreshUsers();
        }
        return { success: true };
      }
      return {
        success: false,
        error: res.error || 'Google sign-in could not be completed. Please try again.',
        code: res.code || (res as any).data?.code,
        email: (res as any).email || (res as any).data?.email,
        name: (res as any).name || (res as any).data?.name,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'We couldn’t sign you in right now. Please check your connection and try again.',
      };
    } finally {
      setIsAuthChecking(false);
    }
  };

  // New Farm & Owner Registration flow
  const registerFarm = async (data: RegisterFarmData): Promise<{ success: boolean; error?: string }> => {
    setIsAuthChecking(true);
    try {
      const res = await api.registerFarm(data);
      const user = res.data?.user || (res as any).user || (res as any).data;
      if (res.success && user && (user.id || user.username || user.name)) {
        const authenticatedUser = user as AppUser;
        setCurrentUser(authenticatedUser);
        try {
          localStorage.setItem(STORAGE_KEY_SESSION_USER, JSON.stringify(authenticatedUser));
          const token = res.data?.token || (res as any).token;
          if (token) {
            localStorage.setItem(STORAGE_KEY_SESSION_TOKEN, token);
          }
        } catch {
          // ignore storage error
        }
        try {
          await refreshUsers();
        } catch {
          // ignore user refresh error on initial register
        }
        return { success: true };
      }
      return {
        success: false,
        error: res.error || 'Failed to create your farm account. Please try again.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'We could not register your farm right now. Please try again.',
      };
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Real backend logout
  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION_USER);
      localStorage.removeItem(STORAGE_KEY_SESSION_TOKEN);
    } catch {
      // ignore
    }
  };

  // Owner action: Create a new farm user
  const createUser = async (
    data: CreateUserData
  ): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    try {
      const res = await api.createUser(data);
      if (res.success && res.data) {
        await refreshUsers();
        return { success: true, user: res.data };
      }
      return { success: false, error: res.error || 'Failed to create user' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create user' };
    }
  };

  // Owner action: Update user details
  const updateUser = async (
    data: UpdateUserData
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.updateUser(data);
      if (res.success) {
        await refreshUsers();
        if (currentUser && currentUser.id === data.id) {
          const updated: AppUser = {
            ...currentUser,
            ...(data.name ? { name: data.name } : {}),
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            ...(data.role ? { role: data.role } : {}),
            ...(data.authMethod ? { authMethod: data.authMethod } : {}),
            ...(data.active !== undefined ? { active: data.active, status: data.active ? 'Active' : 'Inactive' } : {}),
          };
          setCurrentUser(updated);
          localStorage.setItem(STORAGE_KEY_SESSION_USER, JSON.stringify(updated));
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to update user' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update user' };
    }
  };

  // Owner action: Disable a user
  const disableUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.disableUser(id);
      if (res.success) {
        await refreshUsers();
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to disable user' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to disable user' };
    }
  };

  // Owner action: Reactivate a user
  const reactivateUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.reactivateUser(id);
      if (res.success) {
        await refreshUsers();
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to reactivate user' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reactivate user' };
    }
  };

  const isOwner = currentUser?.role === 'owner';
  const isHerdsman = currentUser?.role === 'herdsman';
  const isAuthenticated = currentUser !== null;

  return {
    currentUser,
    isAuthenticated,
    isOwner,
    isHerdsman,
    users,
    isLoadingUsers,
    isAuthChecking,
    login,
    googleLogin,
    registerFarm,
    logout,
    createUser,
    updateUser,
    disableUser,
    reactivateUser,
    refreshUsers,
  };
}
