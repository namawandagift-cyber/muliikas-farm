export type PaymentStatus = 'Paid' | 'Partly Paid' | 'Not Paid';

export type ExpenseCategory =
  | 'Feed'
  | 'Transport'
  | 'Medicine'
  | 'Labour'
  | 'Fuel'
  | 'Repairs'
  | 'Other';

export type UserRole = 'owner' | 'herdsman';
export type AuthMethod = 'google' | 'password' | 'both';

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  username: string;
  phone?: string;
  role: UserRole;
  authMethod?: AuthMethod;
  title: string;
  active: boolean;
  status?: 'Active' | 'Inactive';
  farmId?: string;
  farmName?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  createdBy?: string;
}

export type User = AppUser;

export interface Farm {
  id: string;
  name: string;
  location: string;
  phone?: string;
  description?: string;
  ownerId?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterFarmData {
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  password: string;
  farmName: string;
  farmLocation: string;
  farmPhone?: string;
  farmDescription?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface GoogleLoginCredentials {
  credential: string; // Google ID token JWT
}

export interface CreateUserData {
  name: string;
  email?: string;
  username?: string;
  password?: string;
  phone?: string;
  role: UserRole;
  authMethod: AuthMethod;
  active?: boolean;
  farmId?: string;
}

export interface UpdateUserData {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  phone?: string;
  role?: UserRole;
  authMethod?: AuthMethod;
  active?: boolean;
  password?: string;
}

export interface Buyer {
  id: string;
  name: string;
  phone: string;
  location: string;
  pricePerLitre: number;
  amountOwed?: number;
  createdAt?: string;
}

export interface Sale {
  id: string;
  date: string;
  buyerId: string;
  buyerName: string;
  litres: number;
  pricePerLitre: number;
  totalAmount: number;
  amountReceived: number;
  balance: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  notes?: string;
  createdAt?: string;
}

export interface ActivityLog {
  id: string;
  date: string;
  action: string;
  description: string;
  user: string;
  createdAt: string;
}

export type DateFilterOption = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateFilter {
  type: DateFilterOption;
  startDate?: string;
  endDate?: string;
}

export interface DashboardMetrics {
  litres: number;
  sales: number;
  moneyIn: number;
  moneySpent: number;
  moneyOwed: number;
  profit: number;
  count: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}
