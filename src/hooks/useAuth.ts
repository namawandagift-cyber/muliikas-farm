import { useState, useEffect, useCallback } from 'react';

import {
  AppUser,
  LoginCredentials,
  GoogleLoginCredentials,
  CreateUserData,
  UpdateUserData,
  RegisterFarmData,
} from '../types';

import { api } from '../services/api';

const STORAGE_KEY_SESSION_USER = 'dairypulse_auth_user';
const STORAGE_KEY_SESSION_TOKEN = 'dairypulse_auth_token';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEY_SESSION_TOKEN);
      const savedUser = localStorage.getItem(STORAGE_KEY_SESSION_USER);

      if (token && savedUser) {
        const parsed = JSON.parse(savedUser);

        if (parsed && parsed.id && parsed.role) {
          return parsed as AppUser;
        }
      }
    } catch (error) {
      console.warn('Could not restore saved session:', error);
    }

    return null;
  });

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  /**
   * Save authenticated session locally.
   */
  const saveSession = useCallback((user: AppUser, token: string) => {
    setCurrentUser(user);

    try {
      localStorage.setItem(
        STORAGE_KEY_SESSION_USER,
        JSON.stringify(user)
      );

      localStorage.setItem(
        STORAGE_KEY_SESSION_TOKEN,
        token
      );
    } catch (error) {
      console.warn('Could not save authentication session:', error);
    }
  }, []);

  /**
   * Clear authenticated session locally.
   */
  const clearSession = useCallback(() => {
    setCurrentUser(null);

    try {
      localStorage.removeItem(STORAGE_KEY_SESSION_USER);
      localStorage.removeItem(STORAGE_KEY_SESSION_TOKEN);
    } catch (error) {
      console.warn('Could not clear authentication session:', error);
    }
  }, []);

  /**
   * Verify the session against Google Apps Script when the app starts.
   *
   * IMPORTANT:
   * A locally stored user is not considered authoritative.
   * The Apps Script backend is the source of truth.
   */
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem(STORAGE_KEY_SESSION_TOKEN);

      if (!token) {
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthChecking(false);
        }
        return;
      }

      try {
        const res = await api.validateSession();

        if (!isMounted) return;

        if (res.success && res.data?.user) {
          const freshUser = res.data.user;

          setCurrentUser(freshUser);

          try {
            localStorage.setItem(
              STORAGE_KEY_SESSION_USER,
              JSON.stringify(freshUser)
            );
          } catch {
            // Ignore storage failure.
          }
        } else {
          /*
           * If the backend explicitly rejects the session,
           * remove it locally.
           */
          if (
            res.code === 'UNAUTHORIZED' ||
            res.code === 'SESSION_EXPIRED' ||
            res.error?.toLowerCase().includes('expired') ||
            res.error?.toLowerCase().includes('invalid session') ||
            res.error?.toLowerCase().includes('unauthorized')
          ) {
            clearSession();
          }
        }
      } catch (error) {
        /*
         * Do NOT automatically log the user out simply because
         * the network is temporarily unavailable.
         */
        console.warn(
          'Session verification could not reach backend:',
          error
        );
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  /**
   * Load users belonging to the authenticated farm.
   */
  const refreshUsers = useCallback(async () => {
    if (!currentUser) {
      setUsers([]);
      return;
    }

    setIsLoadingUsers(true);

    try {
      const res = await api.getUsers();

      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      } else if (res.code === 'UNAUTHORIZED') {
        clearSession();
        setUsers([]);
      }
    } catch (error) {
      console.warn(
        'Failed to load farm users from backend:',
        error
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser, clearSession]);

  /**
   * Load users whenever an owner is authenticated.
   */
  useEffect(() => {
    if (
      currentUser &&
      currentUser.role === 'owner'
    ) {
      refreshUsers();
    } else {
      setUsers([]);
    }
  }, [currentUser, refreshUsers]);

  /**
   * Username / email + password login.
   */
  const login = async (
    credentials: LoginCredentials
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    setIsAuthChecking(true);

    try {
      const res = await api.login(credentials);

      const user =
        res.data?.user ||
        (res as any).user ||
        ((res as any).data?.id ? (res as any).data : null);

      const token =
        res.data?.token ||
        (res as any).token ||
        '';

      if (
        res.success &&
        user &&
        token &&
        (user.id || user.username || user.name)
      ) {
        saveSession(user as AppUser, token);

        return {
          success: true,
        };
      }

      return {
        success: false,
        error:
          res.error ||
          'Username/email or password is incorrect.',
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          'We could not sign you in right now. Please check your connection and try again.',
      };
    } finally {
      setIsAuthChecking(false);
    }
  };

  /**
   * Google authentication.
   */
  const googleLogin = async (
    credentials: GoogleLoginCredentials
  ): Promise<{
    success: boolean;
    error?: string;
    code?: string;
    email?: string;
    name?: string;
  }> => {
    setIsAuthChecking(true);

    try {
      const res = await api.googleLogin(credentials);

      const user =
        res.data?.user ||
        (res as any).user ||
        ((res as any).data?.id ? (res as any).data : null);

      const token =
        res.data?.token ||
        (res as any).token ||
        '';

      if (
        res.success &&
        user &&
        token &&
        (user.id || user.username || user.name)
      ) {
        saveSession(user as AppUser, token);

        return {
          success: true,
        };
      }

      return {
        success: false,
        error:
          res.error ||
          'Google sign-in could not be completed. Please try again.',
        code:
          res.code ||
          (res as any).data?.code,
        email:
          (res as any).email ||
          (res as any).data?.email,
        name:
          (res as any).name ||
          (res as any).data?.name,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          'We could not complete Google sign-in. Please try again.',
      };
    } finally {
      setIsAuthChecking(false);
    }
  };

  /**
   * Register a new farm and its first owner.
   *
   * Backend performs:
   * 1. Farm creation
   * 2. Owner creation
   * 3. Farm/user association
   * 4. Session creation
   * 5. Token generation
   */
  const registerFarm = async (
    data: RegisterFarmData
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    setIsAuthChecking(true);

    try {
      const res = await api.registerFarm(data);

      const user =
        res.data?.user ||
        (res as any).user ||
        ((res as any).data?.id ? (res as any).data : null);

      const token =
        res.data?.token ||
        (res as any).token ||
        '';

      /*
       * Registration is successful ONLY when:
       * - backend says success
       * - user exists
       * - session token exists
       */
      if (
        res.success &&
        user &&
        token &&
        (user.id || user.username || user.name)
      ) {
        const authenticatedUser = user as AppUser;

        /*
         * IMPORTANT:
         * Save the authenticated session immediately.
         * Do not wait for refreshUsers().
         */
        saveSession(authenticatedUser, token);

        /*
         * Loading team members is secondary.
         * Registration must remain successful even if
         * getUsers temporarily fails.
         */
        if (authenticatedUser.role === 'owner') {
          try {
            const usersResponse = await api.getUsers();

            if (
              usersResponse.success &&
              Array.isArray(usersResponse.data)
            ) {
              setUsers(usersResponse.data);
            }
          } catch (error) {
            console.warn(
              'Initial team-member loading failed after registration:',
              error
            );
          }
        }

        return {
          success: true,
        };
      }

      /*
       * Backend explicitly rejected registration.
       * Return its actual message instead of replacing it
       * with a generic connection error.
       */
      return {
        success: false,
        error:
          res.error ||
          'Your farm account could not be created. Please check your details and try again.',
      };
    } catch (error: any) {
      console.error(
        'Farm registration failed:',
        error
      );

      return {
        success: false,
        error:
          error?.message ||
          'We could not connect to DairyPulse. Please try again.',
      };
    } finally {
      setIsAuthChecking(false);
    }
  };

  /**
   * Logout.
   */
  const logout = () => {
    clearSession();
    setUsers([]);
  };

  /**
   * Owner: create another farm user.
   */
  const createUser = async (
    data: CreateUserData
  ): Promise<{
    success: boolean;
    error?: string;
    user?: AppUser;
  }> => {
    try {
      const res = await api.createUser(data);

      if (res.success && res.data) {
        await refreshUsers();

        return {
          success: true,
          user: res.data,
        };
      }

      return {
        success: false,
        error:
          res.error ||
          'Failed to create user.',
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          'Failed to create user.',
      };
    }
  };

  /**
   * Owner: update a farm user.
   */
  const updateUser = async (
    data: UpdateUserData
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const res = await api.updateUser(data);

      if (!res.success) {
        return {
          success: false,
          error:
            res.error ||
            'Failed to update user.',
        };
      }

      await refreshUsers();

      /*
       * If the logged-in owner updated their own profile,
       * update the local session copy too.
       */
      if (
        currentUser &&
        currentUser.id === data.id
      ) {
        const updatedUser: AppUser = {
          ...currentUser,

          ...(data.name !== undefined
            ? { name: data.name }
            : {}),

          ...(data.email !== undefined
            ? { email: data.email }
            : {}),

          ...(data.phone !== undefined
            ? { phone: data.phone }
            : {}),

          ...(data.role !== undefined
            ? { role: data.role }
            : {}),

          ...(data.authMethod !== undefined
            ? { authMethod: data.authMethod }
            : {}),

          ...(data.active !== undefined
            ? {
                active: data.active,
                status: data.active
                  ? 'Active'
                  : 'Inactive',
              }
            : {}),
        };

        setCurrentUser(updatedUser);

        try {
          localStorage.setItem(
            STORAGE_KEY_SESSION_USER,
            JSON.stringify(updatedUser)
          );
        } catch {
          // Ignore storage error.
        }
      }

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          'Failed to update user.',
      };
    }
  };

  /**
   * Owner: disable user.
   */
  const disableUser = async (
    id: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const res = await api.disableUser(id);

      if (res.success) {
        await refreshUsers();

        return {
          success: true,
        };
      }

      return {
        success: false,
        error:
          res.error ||
          'Failed to disable user.',
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          'Failed to disable user.',
      };
    }
  };

  /**
   * Owner: reactivate user.
   */
  const reactivateUser = async (
    id: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const res = await api.reactivateUser(id);

      if (res.success) {
        await refreshUsers();

        return {
          success: true,
        };
      }

      return {
        success: false,
        error:
          res.error ||
          'Failed to reactivate user.',
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          'Failed to reactivate user.',
      };
    }
  };

  const isOwner =
    currentUser?.role === 'owner';

  const isHerdsman =
    currentUser?.role === 'herdsman';

  const isAuthenticated =
    currentUser !== null;

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