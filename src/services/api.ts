import { Buyer, Sale, Expense, User, ApiResponse, AppUser, LoginCredentials, GoogleLoginCredentials, CreateUserData, UpdateUserData, Farm, RegisterFarmData } from '../types';
import { INITIAL_BUYERS, INITIAL_EXPENSES, INITIAL_SALES, INITIAL_USERS } from '../data/demoData';

// Storage keys for local demo mode persistence
const STORAGE_KEY_URL = 'dairypulse_apps_script_url';
const STORAGE_KEY_SALES = 'dairypulse_local_sales';
const STORAGE_KEY_EXPENSES = 'dairypulse_local_expenses';
const STORAGE_KEY_BUYERS = 'dairypulse_local_buyers';
const STORAGE_KEY_USERS = 'dairypulse_local_users';
const STORAGE_KEY_FARMS = 'dairypulse_local_farms';
const STORAGE_KEY_SESSION_USER = 'dairypulse_auth_user';
const STORAGE_KEY_SESSION_TOKEN = 'dairypulse_auth_token';

interface StoredUser extends AppUser {
  password?: string;
  passwordHash?: string;
}

const DEFAULT_FARMS: Farm[] = [
  {
    id: 'FARM-01',
    name: 'DairyPulse Demo Farm',
    location: 'Mbarara, Uganda',
    phone: '+256 772 123456',
    description: 'Model dairy farm for record keeping',
    ownerId: 'USR-001',
    ownerEmail: 'owner@dairypulse.farm',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
];

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'USR-001',
    name: 'Patrick Mugisha',
    email: 'owner@dairypulse.farm',
    username: 'patrick',
    password: 'Farm@2026',
    role: 'owner',
    authMethod: 'both',
    title: 'Farm Owner / Admin',
    phone: '+256 772 123456',
    active: true,
    status: 'Active',
    farmId: 'FARM-01',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
    createdBy: 'SYSTEM',
  },
  {
    id: 'USR-002',
    name: 'David Kato',
    email: 'david@dairypulse.farm',
    username: 'david',
    password: 'Farm@2026',
    role: 'herdsman',
    authMethod: 'both',
    title: 'Head Herdsman',
    phone: '+256 701 443322',
    active: true,
    status: 'Active',
    farmId: 'FARM-01',
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    createdBy: 'USR-001',
  },
  {
    id: 'USR-003',
    name: 'John',
    email: 'john@gmail.com',
    username: 'john',
    password: 'Farm@2026',
    role: 'herdsman',
    authMethod: 'both',
    title: 'Herdsman',
    phone: '+256 701 987654',
    active: true,
    status: 'Active',
    farmId: 'FARM-01',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
    createdBy: 'USR-001',
  },
];

/**
 * Get current configured Google Apps Script Web App URL
 */
export function getAppsScriptUrl(): string {
  const customUrl = localStorage.getItem(STORAGE_KEY_URL);
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  const envUrl = (import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
  return envUrl;
}

export function setAppsScriptUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
  }
}

export function isConnectedToDatabase(): boolean {
  const url = getAppsScriptUrl();
  return !!(url && url.startsWith('http'));
}

/**
 * Get Google OAuth Web Client ID
 */
export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}

/**
 * Helper to get currently active session user for request signing
 */
function getCurrentSessionUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION_USER);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

// ----------------------------------------------------
// LOCAL DEMO REPOSITORY (Safe fallback & immediate trial)
// ----------------------------------------------------
function getLocalFarms(): Farm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FARMS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local farms, using defaults', e);
  }
  return [...DEFAULT_FARMS];
}

function saveLocalFarms(farms: Farm[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FARMS, JSON.stringify(farms));
  } catch (e) {
    console.error('Failed to save local farms', e);
  }
}

function getLocalSales(farmId?: string): Sale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (farmId && farmId !== 'FARM-01') {
          return parsed.filter((s: any) => s.farmId === farmId);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local sales, using defaults', e);
  }
  if (farmId && farmId !== 'FARM-01') {
    return [];
  }
  return [...INITIAL_SALES];
}

function saveLocalSales(sales: Sale[], farmId?: string): void {
  try {
    if (farmId && farmId !== 'FARM-01') {
      const raw = localStorage.getItem(STORAGE_KEY_SALES);
      let all: Sale[] = raw ? JSON.parse(raw) : [...INITIAL_SALES];
      all = all.filter((s: any) => s.farmId !== farmId);
      localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify([...sales, ...all]));
    } else {
      localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
    }
  } catch (e) {
    console.error('Failed to save local sales', e);
  }
}

function getLocalExpenses(farmId?: string): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (farmId && farmId !== 'FARM-01') {
          return parsed.filter((e: any) => e.farmId === farmId);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local expenses, using defaults', e);
  }
  if (farmId && farmId !== 'FARM-01') {
    return [];
  }
  return [...INITIAL_EXPENSES];
}

function saveLocalExpenses(expenses: Expense[], farmId?: string): void {
  try {
    if (farmId && farmId !== 'FARM-01') {
      const raw = localStorage.getItem(STORAGE_KEY_EXPENSES);
      let all: Expense[] = raw ? JSON.parse(raw) : [...INITIAL_EXPENSES];
      all = all.filter((e: any) => e.farmId !== farmId);
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify([...expenses, ...all]));
    } else {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    }
  } catch (e) {
    console.error('Failed to save local expenses', e);
  }
}

function getLocalBuyers(farmId?: string): Buyer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUYERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (farmId && farmId !== 'FARM-01') {
          return parsed.filter((b: any) => b.farmId === farmId);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local buyers, using defaults', e);
  }
  if (farmId && farmId !== 'FARM-01') {
    return [];
  }
  return [...INITIAL_BUYERS];
}

function saveLocalBuyers(buyers: Buyer[], farmId?: string): void {
  try {
    if (farmId && farmId !== 'FARM-01') {
      const raw = localStorage.getItem(STORAGE_KEY_BUYERS);
      let all: Buyer[] = raw ? JSON.parse(raw) : [...INITIAL_BUYERS];
      all = all.filter((b: any) => b.farmId !== farmId);
      localStorage.setItem(STORAGE_KEY_BUYERS, JSON.stringify([...buyers, ...all]));
    } else {
      localStorage.setItem(STORAGE_KEY_BUYERS, JSON.stringify(buyers));
    }
  } catch (e) {
    console.error('Failed to save local buyers', e);
  }
}

function getLocalUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all users have valid passwords and all default users exist
        const map = new Map<string, StoredUser>();
        DEFAULT_USERS.forEach((u) => map.set(u.id, { ...u }));
        parsed.forEach((u: any) => {
          const existing = map.get(u.id);
          const merged: StoredUser = {
            ...(existing || {}),
            ...u,
            password: u.password || existing?.password || 'Farm@2026',
            active: u.active !== false && u.status !== 'Inactive',
            status: (u.active !== false && u.status !== 'Inactive') ? 'Active' : 'Inactive',
          };
          map.set(u.id, merged);
        });
        const result = Array.from(map.values());
        saveLocalUsers(result);
        return result;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local users, using defaults', e);
  }
  saveLocalUsers(DEFAULT_USERS);
  return [...DEFAULT_USERS];
}

function saveLocalUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users', e);
  }
}

export function resetToDemoData(): void {
  localStorage.removeItem(STORAGE_KEY_SALES);
  localStorage.removeItem(STORAGE_KEY_EXPENSES);
  localStorage.removeItem(STORAGE_KEY_BUYERS);
  localStorage.removeItem(STORAGE_KEY_USERS);
}

// In-flight fetch deduplication map
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Universal safe fetch to Google Apps Script
 */
async function sendRequest<T>(
  action: string,
  method: 'GET' | 'POST' = 'GET',
  data?: any
): Promise<ApiResponse<T>> {
  const isAuthAction = action === 'registerFarm' || action === 'login' || action === 'googleLogin' || action === 'validateSession';
  const baseUrl = getAppsScriptUrl();

  // If no URL is set: auth actions MUST strictly fail without fake accounts
  if (!baseUrl || !baseUrl.startsWith('http')) {
    if (action === 'registerFarm') {
      return {
        success: false,
        error: "We couldn't connect to DairyPulse right now. Your account was not created. Please try again.",
        code: 'BACKEND_UNAVAILABLE',
      };
    }
    if (action === 'login' || action === 'googleLogin' || action === 'validateSession') {
      return {
        success: false,
        error: "We couldn't connect to DairyPulse right now. Please check your connection and try again.",
        code: 'BACKEND_UNAVAILABLE',
      };
    }
    return handleOfflineFallback<T>(action, method, data);
  }

  const cacheKey = `${method}:${action}:${data ? JSON.stringify(data) : ''}`;
  if (method === 'GET' && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const execution = (async () => {
    try {
      let url = baseUrl;
      const options: RequestInit = {
        method,
        redirect: 'follow',
      };

      const sessionUser = getCurrentSessionUser();
      const token = localStorage.getItem(STORAGE_KEY_SESSION_TOKEN) || '';

      if (method === 'GET') {
        const separator = url.includes('?') ? '&' : '?';
        const params = new URLSearchParams({
          action,
          farmId: sessionUser?.farmId || '',
          userRole: sessionUser?.role || '',
          token,
        });
        url = `${url}${separator}${params.toString()}`;
      } else {
        // Method POST
        // Use text/plain to avoid CORS OPTIONS preflight issues with Google Apps Script
        options.headers = {
          'Content-Type': 'text/plain;charset=utf-8',
        };
        options.body = JSON.stringify({
          action,
          data,
          token,
          userId: sessionUser?.id || '',
          userName: sessionUser?.name || 'User',
          userRole: sessionUser?.role || '',
          farmId: sessionUser?.farmId || '',
          user: sessionUser?.name || 'User',
          timestamp: new Date().toISOString(),
        });
      }

      // Add a 15-second timeout to prevent indefinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      options.signal = controller.signal;

      const res = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (action === 'registerFarm') {
          return {
            success: false,
            error: "We couldn't connect to DairyPulse right now. Your account was not created. Please try again.",
            code: 'BACKEND_UNAVAILABLE',
          };
        }
        if (action === 'login' || action === 'googleLogin') {
          return {
            success: false,
            error: "We couldn't connect to DairyPulse right now. Please check your connection and try again.",
            code: 'BACKEND_UNAVAILABLE',
          };
        }
        throw new Error(`Server returned status ${res.status}`);
      }

      const text = await res.text();
      let parsed: ApiResponse<T>;
      try {
        parsed = JSON.parse(text);
      } catch {
        if (action === 'registerFarm') {
          return {
            success: false,
            error: "We couldn't connect to DairyPulse right now. Your account was not created. Please try again.",
            code: 'BACKEND_UNAVAILABLE',
          };
        }
        if (action === 'login' || action === 'googleLogin') {
          return {
            success: false,
            error: "We couldn't connect to DairyPulse right now. Please check your connection and try again.",
            code: 'BACKEND_UNAVAILABLE',
          };
        }
        throw new Error('Invalid response received from database.');
      }

      if (!parsed.success) {
        if (action === 'registerFarm') {
          const errText = (parsed.error || '').toLowerCase();
          if (errText.includes('already exists') || parsed.code === 'ACCOUNT_EXISTS') {
            return {
              success: false,
              error: 'An account with this email already exists. Please sign in instead.',
              code: 'ACCOUNT_EXISTS',
            };
          }
          if (errText.includes('unsupported') || errText.includes('500') || errText.includes('exception')) {
            return {
              success: false,
              error: "We couldn't connect to DairyPulse right now. Your account was not created. Please try again.",
              code: 'BACKEND_UNAVAILABLE',
            };
          }
          return {
            success: false,
            error: parsed.error || 'Failed to create your farm account. Please try again.',
            code: parsed.code || 'REGISTRATION_FAILED',
          };
        }

        if (action === 'login' || action === 'googleLogin') {
          return {
            success: false,
            error: parsed.error || 'Username or password is incorrect.',
            code: parsed.code || 'LOGIN_FAILED',
          };
        }
      }

      return parsed;
    } catch (err: any) {
      console.warn(`Apps Script request to ${action} failed:`, err?.message || err);
      if (action === 'registerFarm') {
        return {
          success: false,
          error: "We couldn't connect to DairyPulse right now. Your account was not created. Please try again.",
          code: 'BACKEND_UNAVAILABLE',
        };
      }
      if (action === 'login' || action === 'googleLogin' || action === 'validateSession') {
        return {
          success: false,
          error: "We couldn't connect to DairyPulse right now. Please check your connection and try again.",
          code: 'BACKEND_UNAVAILABLE',
        };
      }

      // Return structured fallback for non-auth data queries
      const fallback = handleOfflineFallback<T>(action, method, data);
      return {
        ...fallback,
        message: 'Unable to connect to the farm database. Running in local demo mode.',
      };
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  if (method === 'GET') {
    pendingRequests.set(cacheKey, execution);
  }

  return execution;
}

/**
 * Decode JWT token client-side for offline simulation or fallback
 */
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Safe local fallback handler
 */
function handleOfflineFallback<T>(action: string, method: 'GET' | 'POST', data?: any): ApiResponse<T> {
  const sessionUser = getCurrentSessionUser();
  const currentFarmId = sessionUser?.farmId;
  const sales = getLocalSales(currentFarmId);
  const expenses = getLocalExpenses(currentFarmId);
  const buyers = getLocalBuyers(currentFarmId);

  if (method === 'GET') {
    if (action === 'health') {
      return {
        success: true,
        data: { status: 'ok', mode: 'offline-demo' } as any,
      };
    }
    if (action === 'farm') {
      const farms = getLocalFarms();
      const foundFarm = farms.find((f) => f.id === currentFarmId) || {
        id: currentFarmId || 'FARM-01',
        name: sessionUser?.farmName || 'My Farm',
        location: 'Uganda',
      };
      return { success: true, data: foundFarm as any };
    }
    if (action === 'sales' || action === 'getMilkRecords') {
      return { success: true, data: sales as any };
    }
    if (action === 'expenses') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized: Herdsmen cannot view farm expenses' };
      }
      return { success: true, data: expenses as any };
    }
    if (action === 'buyers') {
      const balances: Record<string, number> = {};
      sales.forEach((s) => {
        const bId = String(s.buyerId);
        balances[bId] = (balances[bId] || 0) + (Number(s.balance) || 0);
      });
      const enrichedBuyers = buyers.map((b) => ({
        ...b,
        amountOwed: balances[String(b.id)] || 0,
      }));
      return { success: true, data: enrichedBuyers as any };
    }
    if (action === 'users') {
      const users = getLocalUsers()
        .filter((u) => !currentFarmId || !u.farmId || u.farmId === currentFarmId)
        .map((u) => {
          const { password: _p, passwordHash: _ph, ...safeUser } = u;
          return safeUser;
        });
      return { success: true, data: users as any };
    }
  }

  if (method === 'POST') {
    // Auth actions MUST NOT have local offline account creation
    if (action === 'registerFarm') {
      return {
        success: false,
        error: "We couldn't connect to DairyPulse right now. Your account was not created. Please try again.",
        code: 'BACKEND_UNAVAILABLE',
      };
    }
    if (action === 'login' || action === 'googleLogin') {
      return {
        success: false,
        error: "We couldn't connect to DairyPulse right now. Please check your connection and try again.",
        code: 'BACKEND_UNAVAILABLE',
      };
    }

    // CREATE USER (OWNER ONLY)
    if (action === 'createUser') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized: Herdsmen cannot create users' };
      }

      const name = (data?.name || '').trim();
      const email = (data?.email || '').trim().toLowerCase();
      let username = (data?.username || '').trim().toLowerCase();
      const role: AppUser['role'] = data?.role === 'owner' ? 'owner' : 'herdsman';
      const authMethod: AppUser['authMethod'] = data?.authMethod || (email ? 'google' : 'password');
      const users = getLocalUsers();

      if (!name) {
        return { success: false, error: 'Full name is required' };
      }

      if ((authMethod === 'google' || authMethod === 'both') && !email) {
        return { success: false, error: 'Email address is required for Google authentication' };
      }

      if (!username) {
        username = email ? email.split('@')[0] : name.toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      if (email && users.some((u) => u.email && u.email.toLowerCase() === email)) {
        return { success: false, error: 'A user with this email address already exists' };
      }

      if (users.some((u) => u.username.toLowerCase() === username)) {
        return { success: false, error: 'Username already taken. Please choose another.' };
      }

      const active = data?.active !== false && data?.status !== 'Inactive';
      const nowIso = new Date().toISOString();

      const newUser: StoredUser = {
        id: data?.id || `USR-${Date.now().toString().slice(-4)}`,
        farmId: data?.farmId || sessionUser?.farmId || 'FARM-01',
        name,
        email,
        username,
        password: data?.password || 'Farm@2026',
        role,
        authMethod,
        title: role === 'owner' ? 'Farm Owner / Admin' : 'Herdsman',
        phone: data?.phone || '',
        active,
        status: active ? 'Active' : 'Inactive',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: sessionUser?.id || 'OWNER',
      };

      const updated = [...users, newUser];
      saveLocalUsers(updated);

      const { password: _p, passwordHash: _ph, ...safeUser } = newUser;
      return { success: true, data: safeUser as any };
    }

    // UPDATE USER (OWNER ONLY)
    if (action === 'updateUser' || action === 'disableUser' || action === 'reactivateUser') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized: Herdsmen cannot modify users' };
      }

      const users = getLocalUsers();
      const updated = users.map((u) => {
        if (u.id === (data?.id || data)) {
          const isDeactivate = action === 'disableUser' || data?.active === false || data?.status === 'Inactive';
          const isReactivate = action === 'reactivateUser' || data?.active === true || data?.status === 'Active';
          const newActive = isDeactivate ? false : isReactivate ? true : u.active;
          const newStatus = newActive ? 'Active' : 'Inactive';
          const newRole = data?.role !== undefined ? data.role : u.role;

          return {
            ...u,
            ...(data?.name !== undefined ? { name: data.name } : {}),
            ...(data?.email !== undefined ? { email: data.email } : {}),
            ...(data?.phone !== undefined ? { phone: data.phone } : {}),
            ...(data?.username !== undefined ? { username: data.username } : {}),
            ...(data?.authMethod !== undefined ? { authMethod: data.authMethod } : {}),
            ...(data?.password ? { password: data.password } : {}),
            role: newRole,
            title: newRole === 'owner' ? 'Farm Owner / Admin' : 'Herdsman',
            active: newActive,
            status: newStatus as 'Active' | 'Inactive',
            updatedAt: new Date().toISOString(),
          };
        }
        return u;
      });
      saveLocalUsers(updated);
      return { success: true, message: 'User updated successfully' as any };
    }

    // CREATE SALE / MILK RECORD (PRICE PROTECTED & AUDITED)
    if (action === 'createSale' || action === 'createMilkRecord') {
      const litres = Number(data?.litres) || 0;
      let price = Number(data?.pricePerLitre) || 0;
      const amountReceived = Number(data?.amountReceived) || 0;

      // Authoritative saved buyer price lookup
      const buyerId = data?.buyerId;
      let buyerName = data?.buyerName || 'Cash Customer';
      if (buyerId) {
        const foundB = buyers.find((b) => b.id === buyerId);
        if (foundB) {
          price = foundB.pricePerLitre;
          buyerName = foundB.name;
        }
      }

      if (price <= 0) price = 3500;

      const totalAmount = Math.round(litres * price);
      let balance = Math.round(totalAmount - amountReceived);
      if (balance < 0) balance = 0;

      let paymentStatus: Sale['paymentStatus'] = 'Not Paid';
      if (balance <= 0) {
        paymentStatus = 'Paid';
      } else if (amountReceived > 0) {
        paymentStatus = 'Partly Paid';
      }

      const newSale: Sale = {
        id: data?.id || `SAL-${Date.now().toString().slice(-4)}`,
        date: data?.date,
        buyerId: buyerId || '',
        buyerName,
        litres,
        pricePerLitre: price,
        totalAmount,
        amountReceived,
        balance,
        paymentStatus,
        notes: data?.notes || '',
        createdBy: sessionUser?.id || data?.createdBy || 'USR-ANON',
        createdByName: sessionUser?.name || data?.createdByName || 'Herdsman',
        createdAt: new Date().toISOString(),
      };
      (newSale as any).farmId = currentFarmId || 'FARM-01';

      const updated = [newSale, ...sales];
      saveLocalSales(updated, currentFarmId);
      return { success: true, data: newSale as any };
    }

    // CREATE EXPENSE (OWNER ONLY)
    if (action === 'createExpense') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized: Herdsmen cannot record farm expenses' };
      }

      const amount = Number(data?.amount) || 0;
      const newExpense: Expense = {
        id: data?.id || `EXP-${Date.now().toString().slice(-4)}`,
        date: data?.date,
        category: data?.category || 'Other',
        amount,
        description: data?.description || '',
        notes: data?.notes || '',
        createdAt: new Date().toISOString(),
      };
      (newExpense as any).farmId = currentFarmId || 'FARM-01';

      const updated = [newExpense, ...expenses];
      saveLocalExpenses(updated, currentFarmId);
      return { success: true, data: newExpense as any };
    }

    // BUYER OPERATIONS (OWNER ONLY)
    if (action === 'createBuyer') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized: Herdsmen cannot manage buyers' };
      }
      const newBuyer: Buyer = {
        id: data?.id || `BUY-${Date.now().toString().slice(-4)}`,
        name: data?.name,
        phone: data?.phone || '',
        location: data?.location || '',
        pricePerLitre: Number(data?.pricePerLitre) || 3500,
        amountOwed: 0,
        createdAt: new Date().toISOString(),
      };
      (newBuyer as any).farmId = currentFarmId || 'FARM-01';
      const updated = [...buyers, newBuyer];
      saveLocalBuyers(updated, currentFarmId);
      return { success: true, data: newBuyer as any };
    }

    if (action === 'updateBuyer') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized: Herdsmen cannot update buyer prices' };
      }
      const updated = buyers.map((b) => (b.id === data.id ? { ...b, ...data } : b));
      saveLocalBuyers(updated, currentFarmId);
      return { success: true, data: data as any };
    }

    if (action === 'deleteSale') {
      const id = data?.id || data;
      const updated = sales.filter((s) => s.id !== id);
      saveLocalSales(updated, currentFarmId);
      return { success: true, message: 'Sale deleted' as any };
    }

    if (action === 'deleteExpense') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized' };
      }
      const id = data?.id || data;
      const updated = expenses.filter((e) => e.id !== id);
      saveLocalExpenses(updated, currentFarmId);
      return { success: true, message: 'Expense deleted' as any };
    }

    if (action === 'deleteBuyer') {
      if (sessionUser && sessionUser.role === 'herdsman') {
        return { success: false, error: 'Unauthorized' };
      }
      const id = data?.id || data;
      const updated = buyers.filter((b) => b.id !== id);
      saveLocalBuyers(updated, currentFarmId);
      return { success: true, message: 'Buyer deleted' as any };
    }

    if (action === 'recordPayment') {
      const saleId = data?.saleId;
      const pAmt = Number(data?.amount) || 0;
      const updated = sales.map((s) => {
        if (s.id === saleId) {
          const newReceived = Math.min(s.totalAmount, s.amountReceived + pAmt);
          const newBal = Math.max(0, s.totalAmount - newReceived);
          return {
            ...s,
            amountReceived: newReceived,
            balance: newBal,
            paymentStatus: (newBal <= 0 ? 'Paid' : 'Partly Paid') as Sale['paymentStatus'],
          };
        }
        return s;
      });
      saveLocalSales(updated, currentFarmId);
      return { success: true, message: 'Payment recorded' as any };
    }
  }

  return { success: false, error: `Unhandled action: ${action}` };
}

// ----------------------------------------------------
// PUBLIC API SERVICE OBJECT
// ----------------------------------------------------
export const api = {
  /**
   * Health check for Apps Script
   */
  async getHealth(): Promise<ApiResponse<{ status: string; mode?: string }>> {
    return sendRequest('health', 'GET');
  },

  /**
   * Fetch all sales / milk records
   */
  async getSales(): Promise<ApiResponse<Sale[]>> {
    return sendRequest<Sale[]>('sales', 'GET');
  },

  /**
   * Fetch all expenses
   */
  async getExpenses(): Promise<ApiResponse<Expense[]>> {
    return sendRequest<Expense[]>('expenses', 'GET');
  },

  /**
   * Fetch all buyers (with calculated amount owed)
   */
  async getBuyers(): Promise<ApiResponse<Buyer[]>> {
    return sendRequest<Buyer[]>('buyers', 'GET');
  },

  /**
   * Record a new sale / milk record
   */
  async createSale(saleData: Omit<Sale, 'id' | 'createdAt'>): Promise<ApiResponse<Sale>> {
    return sendRequest<Sale>('createSale', 'POST', saleData);
  },

  /**
   * Record a new expense (Owner only)
   */
  async createExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<ApiResponse<Expense>> {
    return sendRequest<Expense>('createExpense', 'POST', expenseData);
  },

  /**
   * Create a new buyer (Owner only)
   */
  async createBuyer(buyerData: Omit<Buyer, 'id' | 'createdAt'>): Promise<ApiResponse<Buyer>> {
    return sendRequest<Buyer>('createBuyer', 'POST', buyerData);
  },

  /**
   * Update existing buyer (Owner only)
   */
  async updateBuyer(buyerData: Partial<Buyer> & { id: string }): Promise<ApiResponse<Buyer>> {
    return sendRequest<Buyer>('updateBuyer', 'POST', buyerData);
  },

  /**
   * Delete a sale / milk record
   */
  async deleteSale(id: string): Promise<ApiResponse<void>> {
    return sendRequest<void>('deleteSale', 'POST', { id });
  },

  /**
   * Delete an expense (Owner only)
   */
  async deleteExpense(id: string): Promise<ApiResponse<void>> {
    return sendRequest<void>('deleteExpense', 'POST', { id });
  },

  /**
   * Delete a buyer (Owner only)
   */
  async deleteBuyer(id: string): Promise<ApiResponse<void>> {
    return sendRequest<void>('deleteBuyer', 'POST', { id });
  },

  /**
   * Record payment against a sale's outstanding balance
   */
  async recordPayment(saleId: string, amount: number): Promise<ApiResponse<void>> {
    return sendRequest<void>('recordPayment', 'POST', { saleId, amount });
  },

  /**
   * Authenticate farm user via Username + Password
   */
  async login(creds: LoginCredentials): Promise<ApiResponse<{ user: AppUser; token: string }>> {
    const res = await sendRequest<any>('login', 'POST', creds);
    if (res.success) {
      const user = res.data?.user || (res as any).user || (res as any).data;
      const token = res.data?.token || (res as any).token || '';
      return {
        ...res,
        data: { user, token },
      };
    }
    return res;
  },

  /**
   * Authenticate farm user via Google Sign-In (ID token verification)
   */
  async googleLogin(creds: GoogleLoginCredentials): Promise<ApiResponse<{ user: AppUser; token: string }>> {
    const res = await sendRequest<any>('googleLogin', 'POST', creds);
    if (res.success) {
      const user = res.data?.user || (res as any).user || (res as any).data;
      const token = res.data?.token || (res as any).token || '';
      return {
        ...res,
        data: { user, token },
      };
    }
    return res;
  },

  /**
   * Create new farm user (Owner only)
   */
  async createUser(userData: CreateUserData): Promise<ApiResponse<AppUser>> {
    return sendRequest<AppUser>('createUser', 'POST', userData);
  },

  /**
   * Update existing farm user (Owner only)
   */
  async updateUser(userData: UpdateUserData): Promise<ApiResponse<void>> {
    return sendRequest<void>('updateUser', 'POST', userData);
  },

  /**
   * Disable farm user (Owner only)
   */
  async disableUser(id: string): Promise<ApiResponse<void>> {
    return sendRequest<void>('disableUser', 'POST', { id });
  },

  /**
   * Reactivate farm user (Owner only)
   */
  async reactivateUser(id: string): Promise<ApiResponse<void>> {
    return sendRequest<void>('reactivateUser', 'POST', { id });
  },

  /**
   * Get all farm users (Owner only)
   */
  async getUsers(): Promise<ApiResponse<AppUser[]>> {
    return sendRequest<AppUser[]>('users', 'GET');
  },

  /**
   * Register a new farm and its owner (onboarding)
   */
  async registerFarm(data: RegisterFarmData): Promise<ApiResponse<{ user: AppUser; farm: Farm; token: string }>> {
    const res = await sendRequest<any>('registerFarm', 'POST', data);
    if (res.success) {
      const user = res.data?.user || (res as any).user || (res as any).data;
      const farm = res.data?.farm || (res as any).farm;
      const token = res.data?.token || (res as any).token || '';
      return {
        ...res,
        data: { user, farm, token },
      };
    }
    return res;
  },

  /**
   * Get current farm details
   */
  async getFarm(): Promise<ApiResponse<Farm>> {
    return sendRequest<Farm>('farm', 'GET');
  },

  /**
   * Validate active session token against backend
   */
  async validateSession(): Promise<ApiResponse<{ user: AppUser; farm: Farm }>> {
    return sendRequest<any>('validateSession', 'GET');
  },
};
