import {
  Buyer,
  Sale,
  Expense,
  AppUser,
  ApiResponse,
  LoginCredentials,
  GoogleLoginCredentials,
  CreateUserData,
  UpdateUserData,
  Farm,
  RegisterFarmData,
} from '../types';

const STORAGE_KEY_URL =
  'dairypulse_apps_script_url';

const STORAGE_KEY_SESSION_USER =
  'dairypulse_auth_user';

const STORAGE_KEY_SESSION_TOKEN =
  'dairypulse_auth_token';


/************************************************************
 * API URL
 ************************************************************/

export function getAppsScriptUrl(): string {
  const storedUrl =
    localStorage.getItem(
      STORAGE_KEY_URL
    );

  if (
    storedUrl &&
    storedUrl.trim()
  ) {
    return storedUrl.trim();
  }

  const envUrl =
    String(
      import.meta.env.VITE_APPS_SCRIPT_URL || ''
    ).trim();

  return envUrl;
}


/************************************************************
 * SESSION
 ************************************************************/

function getSessionToken(): string {
  return (
    localStorage.getItem(
      STORAGE_KEY_SESSION_TOKEN
    ) || ''
  );
}


function getSessionUser(): AppUser | null {
  try {
    const value =
      localStorage.getItem(
        STORAGE_KEY_SESSION_USER
      );

    if (!value) {
      return null;
    }

    return JSON.parse(value) as AppUser;
  } catch {
    return null;
  }
}


/************************************************************
 * REQUEST
 ************************************************************/

async function sendRequest<T = any>(
  action: string,
  method: 'GET' | 'POST' = 'POST',
  data: any = undefined
): Promise<ApiResponse<T>> {

  const url =
    getAppsScriptUrl();

  if (!url) {

    return {
      success: false,
      error:
        'DairyPulse is not connected to its backend. Check VITE_APPS_SCRIPT_URL in Vercel.',
      code:
        'BACKEND_URL_MISSING',
    };
  }

  const token =
    getSessionToken();

  const sessionUser =
    getSessionUser();

  try {

    let response: Response;

    if (method === 'GET') {

      const query =
        new URLSearchParams();

      query.set(
        'action',
        action
      );

      if (token) {
        query.set(
          'token',
          token
        );
      }

      response =
        await fetch(
          `${url}?${query.toString()}`,
          {
            method: 'GET',
            redirect: 'follow',
          }
        );

    } else {

      const payload = {
        action,

        data:
          data || {},

        token,

        /*
         * These values are informational only.
         * Backend MUST NOT trust them for authorization.
         */
        userId:
          sessionUser?.id || '',

        userName:
          sessionUser?.name || '',

        userRole:
          sessionUser?.role || '',

        farmId:
          sessionUser?.farmId || '',

        timestamp:
          new Date().toISOString(),
      };

      response =
        await fetch(
          url,
          {
            method: 'POST',

            headers: {
              /*
               * text/plain avoids an OPTIONS
               * CORS preflight with Apps Script.
               */
              'Content-Type':
                'text/plain;charset=utf-8',
            },

            body:
              JSON.stringify(payload),

            redirect:
              'follow',
          }
        );
    }

    const responseText =
      await response.text();

    let result: any;

    try {

      result =
        JSON.parse(responseText);

    } catch {

      console.error(
        'DairyPulse backend returned non-JSON:',
        responseText
      );

      return {
        success: false,
        error:
          `DairyPulse backend returned an invalid response (HTTP ${response.status}).`,
        code:
          'INVALID_BACKEND_RESPONSE',
      };
    }

    /*
     * HTTP-level failure.
     *
     * IMPORTANT:
     * Do not hide the actual backend error.
     */
    if (!response.ok) {

      return {
        success: false,

        error:
          result?.error ||
          result?.message ||
          `DairyPulse backend returned HTTP ${response.status}.`,

        code:
          result?.code ||
          `HTTP_${response.status}`,
      };
    }

    return result as ApiResponse<T>;

  } catch (error: any) {

    console.error(
      `DairyPulse API error [${action}]:`,
      error
    );

    return {
      success: false,

      error:
        error?.message ||
        'Could not connect to the DairyPulse backend.',

      code:
        'NETWORK_ERROR',
    };
  }
}


/************************************************************
 * API
 ************************************************************/

export const api = {

  /******************************************************
   * HEALTH
   ******************************************************/

  async health() {
    return sendRequest(
      'health',
      'GET'
    );
  },


  /******************************************************
   * SESSION
   ******************************************************/

  async validateSession(): Promise<
    ApiResponse<{
      user: AppUser;
      farm: Farm;
    }>
  > {

    const token =
      getSessionToken();

    if (!token) {

      return {
        success: false,
        error: 'No active session.',
        code: 'UNAUTHORIZED',
      };
    }

    return sendRequest(
      'validateSession',
      'GET'
    );
  },


  /******************************************************
   * REGISTRATION
   ******************************************************/

  async registerFarm(
    data: RegisterFarmData
  ): Promise<
    ApiResponse<{
      user: AppUser;
      farm: Farm;
      token: string;
    }>
  > {

    const response =
      await sendRequest<any>(
        'registerFarm',
        'POST',
        data
      );

    if (!response.success) {
      return response;
    }

    const user =
      response.data?.user ||
      response.user;

    const farm =
      response.data?.farm ||
      response.farm;

    const token =
      response.data?.token ||
      response.token ||
      '';

    if (
      !user ||
      !token
    ) {

      return {
        success: false,
        error:
          'The farm was created, but DairyPulse did not receive a valid authentication session.',
        code:
          'INVALID_REGISTRATION_RESPONSE',
      };
    }

    return {
      ...response,

      success: true,

      data: {
        user,
        farm,
        token,
      },
    };
  },


  /******************************************************
   * LOGIN
   ******************************************************/

  async login(
    credentials: LoginCredentials
  ): Promise<
    ApiResponse<{
      user: AppUser;
      farm: Farm;
      token: string;
    }>
  > {

    const response =
      await sendRequest<any>(
        'login',
        'POST',
        credentials
      );

    if (!response.success) {
      return response;
    }

    const user =
      response.data?.user ||
      response.user;

    const farm =
      response.data?.farm ||
      response.farm;

    const token =
      response.data?.token ||
      response.token ||
      '';

    if (
      !user ||
      !token
    ) {

      return {
        success: false,
        error:
          'Login succeeded on the server, but no valid session was returned.',
        code:
          'INVALID_LOGIN_RESPONSE',
      };
    }

    return {
      ...response,

      success: true,

      data: {
        user,
        farm,
        token,
      },
    };
  },


  /******************************************************
   * GOOGLE LOGIN
   ******************************************************/

  async googleLogin(
    credentials: GoogleLoginCredentials
  ): Promise<
    ApiResponse<{
      user: AppUser;
      farm: Farm;
      token: string;
    }>
  > {

    const response =
      await sendRequest<any>(
        'googleLogin',
        'POST',
        credentials
      );

    if (!response.success) {
      return response;
    }

    const user =
      response.data?.user ||
      response.user;

    const farm =
      response.data?.farm ||
      response.farm;

    const token =
      response.data?.token ||
      response.token ||
      '';

    if (
      !user ||
      !token
    ) {

      return {
        success: false,
        error:
          'Google sign-in succeeded, but no valid session was returned.',
        code:
          'INVALID_GOOGLE_LOGIN_RESPONSE',
      };
    }

    return {
      ...response,

      success: true,

      data: {
        user,
        farm,
        token,
      },
    };
  },


  /******************************************************
   * FARM
   ******************************************************/

  async getFarm(): Promise<
    ApiResponse<Farm>
  > {

    return sendRequest(
      'getFarm',
      'POST'
    );
  },


  /******************************************************
   * USERS
   ******************************************************/

  async getUsers(): Promise<
    ApiResponse<AppUser[]>
  > {

    return sendRequest(
      'getUsers',
      'POST'
    );
  },


  async createUser(
    data: CreateUserData
  ): Promise<
    ApiResponse<AppUser>
  > {

    return sendRequest(
      'createUser',
      'POST',
      data
    );
  },


  async updateUser(
    data: UpdateUserData
  ): Promise<
    ApiResponse<void>
  > {

    return sendRequest(
      'updateUser',
      'POST',
      data
    );
  },


  async disableUser(
    id: string
  ): Promise<
    ApiResponse<void>
  > {

    return sendRequest(
      'disableUser',
      'POST',
      { id }
    );
  },


  async reactivateUser(
    id: string
  ): Promise<
    ApiResponse<void>
  > {

    return sendRequest(
      'reactivateUser',
      'POST',
      { id }
    );
  },


  /******************************************************
   * BUYERS
   ******************************************************/

  async getBuyers(): Promise<
    ApiResponse<Buyer[]>
  > {

    return sendRequest(
      'getBuyers',
      'POST'
    );
  },


  async createBuyer(
    data: Partial<Buyer>
  ): Promise<
    ApiResponse<Buyer>
  > {

    return sendRequest(
      'createBuyer',
      'POST',
      data
    );
  },


  async updateBuyer(
    data: Partial<Buyer> & { id: string }
  ): Promise<
    ApiResponse<void>
  > {

    return sendRequest(
      'updateBuyer',
      'POST',
      data
    );
  },


  async deleteBuyer(
    id: string
  ): Promise<
    ApiResponse<void>
  > {

    return sendRequest(
      'deleteBuyer',
      'POST',
      { id }
    );
  },


  /******************************************************
   * MILK
   ******************************************************/

  async getMilkRecords(
    data: any = {}
  ) {

    return sendRequest(
      'getMilkRecords',
      'POST',
      data
    );
  },


  async createMilkRecord(
    data: any
  ) {

    return sendRequest(
      'createMilkRecord',
      'POST',
      data
    );
  },


  async updateMilkRecord(
    data: any
  ) {

    return sendRequest(
      'updateMilkRecord',
      'POST',
      data
    );
  },


  async deleteMilkRecord(
    id: string
  ) {

    return sendRequest(
      'deleteMilkRecord',
      'POST',
      { id }
    );
  },


  /******************************************************
   * SALES
   ******************************************************/

  async getSales(
    data: any = {}
  ): Promise<
    ApiResponse<Sale[]>
  > {

    return sendRequest(
      'getSales',
      'POST',
      data
    );
  },


  async createSale(
    data: any
  ): Promise<
    ApiResponse<Sale>
  > {

    return sendRequest(
      'createSale',
      'POST',
      data
    );
  },


  async updateSale(
    data: any
  ) {

    return sendRequest(
      'updateSale',
      'POST',
      data
    );
  },


  async deleteSale(
    id: string
  ) {

    return sendRequest(
      'deleteSale',
      'POST',
      { id }
    );
  },


  /******************************************************
   * EXPENSES
   ******************************************************/

  async getExpenses(
    data: any = {}
  ): Promise<
    ApiResponse<Expense[]>
  > {

    return sendRequest(
      'getExpenses',
      'POST',
      data
    );
  },


  async createExpense(
    data: any
  ): Promise<
    ApiResponse<Expense>
  > {

    return sendRequest(
      'createExpense',
      'POST',
      data
    );
  },


  async updateExpense(
    data: any
  ) {

    return sendRequest(
      'updateExpense',
      'POST',
      data
    );
  },


  async deleteExpense(
    id: string
  ) {

    return sendRequest(
      'deleteExpense',
      'POST',
      { id }
    );
  },


  /******************************************************
   * DASHBOARD
   ******************************************************/

  async getDashboard(
    data: any = {}
  ) {

    return sendRequest(
      'getDashboard',
      'POST',
      data
    );
  },
};