import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

/*
|--------------------------------------------------------------------------
| API CONFIGURATION
|--------------------------------------------------------------------------
|
| Create a .env file in the React project:
|
| VITE_API_BASE_URL=http://localhost:5174/api
|
| For production:
|
| VITE_API_BASE_URL=https://your-production-api.com/api
|
*/

const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "http://localhost:5174/api";

/*
|--------------------------------------------------------------------------
| TYPES 
|--------------------------------------------------------------------------
*/

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  role?: string;
  employeeNumber?: string;
  username?: string;
}

interface ApiErrorResponse {
  message?: string;
  title?: string;
  detail?: string;
  errors?: Record<string, string[] | string>;
}

/*
|--------------------------------------------------------------------------
| AXIOS INSTANCE
|--------------------------------------------------------------------------
*/

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },

  timeout: 15000,
});

/*
|--------------------------------------------------------------------------
| AUTH STORAGE HELPERS
|--------------------------------------------------------------------------
*/

export const getAccessToken = (): string | null => {
  return localStorage.getItem("accessToken");
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem("refreshToken");
};

export const saveTokens = (
  accessToken: string,
  refreshToken?: string | null
): void => {
  localStorage.setItem("accessToken", accessToken);

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
};

export const clearSession = (): void => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  /*
  |--------------------------------------------------------------
  | Optional user information
  |--------------------------------------------------------------
  */

  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("employeeNumber");
};

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export const logout = (): void => {
  clearSession();

  if (
    window.location.pathname !== "/login" &&
    window.location.pathname !== "/signup"
  ) {
    window.location.href = "/login";
  }
};

/*
|--------------------------------------------------------------------------
| REFRESH TOKEN CONTROL
|--------------------------------------------------------------------------
|
| If several API requests expire at the same time, we don't want
| to send multiple refresh requests to the backend.
|
| All requests wait for the same refresh operation.
|
*/

let refreshPromise: Promise<string | null> | null = null;

/*
|--------------------------------------------------------------------------
| REFRESH ACCESS TOKEN
|--------------------------------------------------------------------------
*/

export const refreshAccessToken =
  async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    /*
    |--------------------------------------------------------------
    | If another request is already refreshing the token,
    | wait for it.
    |--------------------------------------------------------------
    */

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = axios
      .post<AuthResponse>(
        `${API_BASE_URL}/auth/refresh`,
        {
          refreshToken,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 15000,
        }
      )
      .then((response) => {
        const data = response.data;

        const accessToken =
          data.accessToken ?? data.token;

        const newRefreshToken =
          data.refreshToken;

        if (!accessToken) {
          return null;
        }

        /*
        |----------------------------------------------------------
        | Save new access token
        |----------------------------------------------------------
        */

        localStorage.setItem(
          "accessToken",
          accessToken
        );

        /*
        |----------------------------------------------------------
        | Save rotated refresh token
        |----------------------------------------------------------
        */

        if (newRefreshToken) {
          localStorage.setItem(
            "refreshToken",
            newRefreshToken
          );
        }

        /*
        |----------------------------------------------------------
        | Keep useful authentication information
        |----------------------------------------------------------
        */

        if (data.role) {
          localStorage.setItem(
            "role",
            data.role
          );
        }

        if (data.employeeNumber) {
          localStorage.setItem(
            "employeeNumber",
            data.employeeNumber
          );
        }

        return accessToken;
      })
      .catch((error) => {
        console.error(
          "Refresh token failed:",
          error
        );

        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  };

/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
|
| Adds:
|
| Authorization: Bearer <access-token>
|
| to protected API requests.
|
*/

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
|
| If the API returns 401:
|
| 1. Try refresh token.
| 2. Save the new access token.
| 3. Retry the original request.
|
| If refresh fails:
|
| 1. Clear session.
| 2. Redirect to login.
|
*/

api.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest =
      error.config as RetryableRequestConfig | undefined;

    /*
    |--------------------------------------------------------------
    | No request information
    |--------------------------------------------------------------
    */

    if (!originalRequest) {
      return Promise.reject(error);
    }

    /*
    |--------------------------------------------------------------
    | Only handle 401 Unauthorized
    |--------------------------------------------------------------
    */

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    /*
    |--------------------------------------------------------------
    | Never refresh the refresh endpoint itself
    |--------------------------------------------------------------
    */

    if (
      originalRequest.url?.includes(
        "/auth/refresh"
      )
    ) {
      clearSession();

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/signup"
      ) {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    /*
    |--------------------------------------------------------------
    | Don't retry the same request twice
    |--------------------------------------------------------------
    */

    if (originalRequest._retry) {
      clearSession();

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/signup"
      ) {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    /*
    |--------------------------------------------------------------
    | Don't refresh login/register requests
    |--------------------------------------------------------------
    */

    if (
      originalRequest.url?.includes(
        "/auth/login"
      ) ||
      originalRequest.url?.includes(
        "/auth/register"
      )
    ) {
      return Promise.reject(error);
    }

    /*
    |--------------------------------------------------------------
    | Mark request as retried
    |--------------------------------------------------------------
    */

    originalRequest._retry = true;

    /*
    |--------------------------------------------------------------
    | Try refreshing the access token
    |--------------------------------------------------------------
    */

    const newAccessToken =
      await refreshAccessToken();

    /*
    |--------------------------------------------------------------
    | Refresh failed
    |--------------------------------------------------------------
    */

    if (!newAccessToken) {
      clearSession();

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/signup"
      ) {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    /*
    |--------------------------------------------------------------
    | Retry original request with new token
    |--------------------------------------------------------------
    */

    originalRequest.headers.Authorization =
      `Bearer ${newAccessToken}`;

    return api(originalRequest);
  }
);

/*
|--------------------------------------------------------------------------
| API ERROR MESSAGE
|--------------------------------------------------------------------------
|
| Converts ASP.NET Core errors into user-friendly messages.
|
| Handles:
|
| 400 Bad Request
| 401 Unauthorized
| 403 Forbidden
| 404 Not Found
| 409 Conflict
| 422 Validation Error
| 500 Server Error
|
*/

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  /*
  |--------------------------------------------------------------
  | Axios error
  |--------------------------------------------------------------
  */

  if (axios.isAxiosError(error)) {
    const axiosError =
      error as AxiosError<ApiErrorResponse>;

    const status =
      axiosError.response?.status;

    const data =
      axiosError.response?.data;

    /*
    |--------------------------------------------------------------
    | Backend returned plain text
    |--------------------------------------------------------------
    */

    if (
      typeof data === "string" &&
      data.trim()
    ) {
      return data;
    }

    /*
    |--------------------------------------------------------------
    | Backend message
    |--------------------------------------------------------------
    */

    if (
      data?.message &&
      data.message.trim()
    ) {
      return data.message;
    }

    /*
    |--------------------------------------------------------------
    | ASP.NET ProblemDetails title
    |--------------------------------------------------------------
    */

    if (
      data?.title &&
      data.title.trim()
    ) {
      return data.title;
    }

    /*
    |--------------------------------------------------------------
    | ASP.NET ProblemDetails detail
    |--------------------------------------------------------------
    */

    if (
      data?.detail &&
      data.detail.trim()
    ) {
      return data.detail;
    }

    /*
    |--------------------------------------------------------------
    | ASP.NET validation errors
    |
    | Example:
    |
    | {
    |   "errors": {
    |      "Username": [
    |          "Username is required."
    |      ]
    |   }
    | }
    |--------------------------------------------------------------
    */

    if (
      data?.errors &&
      typeof data.errors === "object"
    ) {
      const messages: string[] = [];

      Object.values(data.errors).forEach(
        (value) => {
          if (Array.isArray(value)) {
            value.forEach((message) => {
              if (message) {
                messages.push(
                  String(message)
                );
              }
            });
          } else if (value) {
            messages.push(
              String(value)
            );
          }
        }
      );

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    /*
    |--------------------------------------------------------------
    | HTTP status messages
    |--------------------------------------------------------------
    */

    switch (status) {
      case 400:
        return "The information provided is invalid.";

      case 401:
        return "Your session has expired. Please login again.";

      case 403:
        return "You do not have permission to perform this action.";

      case 404:
        return "The requested resource was not found.";

      case 409:
        return "This request conflicts with existing data.";

      case 422:
        return "Some of the information provided is invalid.";

      case 429:
        return "Too many requests. Please try again later.";

      case 500:
        return "A server error occurred. Please try again later.";

      case 502:
      case 503:
      case 504:
        return "The server is temporarily unavailable. Please try again later.";

      default:
        break;
    }

    /*
    |--------------------------------------------------------------
    | Network error
    |--------------------------------------------------------------
    */

    if (
      axiosError.code ===
      "ERR_NETWORK"
    ) {
      return "Unable to connect to the server. Please check that the backend is running.";
    }

    /*
    |--------------------------------------------------------------
    | Timeout
    |--------------------------------------------------------------
    */

    if (
      axiosError.code ===
      "ECONNABORTED"
    ) {
      return "The request timed out. Please try again.";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Normal JavaScript Error
  |--------------------------------------------------------------------------
  */

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
};

/*
|--------------------------------------------------------------------------
| AUTH API HELPERS
|--------------------------------------------------------------------------
|
| These functions can optionally be used by Login/Signup pages.
|
*/

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

export const login = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  const response =
    await api.post<AuthResponse>(
      "/auth/login",
      {
        username: username.trim(),
        password,
      }
    );

  const data = response.data;

  const accessToken =
    data.accessToken ?? data.token;

  if (!accessToken) {
    throw new Error(
      "Login succeeded but no access token was returned."
    );
  }

  saveTokens(
    accessToken,
    data.refreshToken
  );

  if (data.role) {
    localStorage.setItem(
      "role",
      data.role
    );
  }

  if (data.employeeNumber) {
    localStorage.setItem(
      "employeeNumber",
      data.employeeNumber
    );
  }

  /*
  |--------------------------------------------------------------
  | Store basic user information
  |--------------------------------------------------------------
  */

  localStorage.setItem(
    "user",
    JSON.stringify({
      username: data.username ?? username,
      role: data.role ?? "",
      employeeNumber:
        data.employeeNumber ?? "",
    })
  );

  return data;
};

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

export const register = async (data: {
  username: string;
  password: string;
  employeeNumber: string;
}): Promise<AuthResponse> => {
  const response =
    await api.post<AuthResponse>(
      "/auth/register",
      {
        username: data.username.trim(),
        password: data.password,
        employeeNumber:
          data.employeeNumber.trim(),
      }
    );

  const result = response.data;

  const accessToken =
    result.accessToken ?? result.token;

  if (!accessToken) {
    throw new Error(
      "Registration succeeded but no access token was returned."
    );
  }

  saveTokens(
    accessToken,
    result.refreshToken
  );

  if (result.role) {
    localStorage.setItem(
      "role",
      result.role
    );
  }

  if (result.employeeNumber) {
    localStorage.setItem(
      "employeeNumber",
      result.employeeNumber
    );
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      username:
        result.username ??
        data.username,
      role:
        result.role ??
        "Employee",
      employeeNumber:
        result.employeeNumber ??
        data.employeeNumber,
    })
  );

  return result;
};

/*
|--------------------------------------------------------------------------
| CHECK AUTHENTICATION
|--------------------------------------------------------------------------
*/

export const isAuthenticated = (): boolean => {
  return Boolean(getAccessToken());
};

/*
|--------------------------------------------------------------------------
| GET CURRENT ROLE
|--------------------------------------------------------------------------
*/

export const getCurrentRole = (): string | null => {
  return localStorage.getItem("role");
};

/*
|--------------------------------------------------------------------------
| GET CURRENT EMPLOYEE NUMBER
|--------------------------------------------------------------------------
*/

export const getCurrentEmployeeNumber =
  (): string | null => {
    return localStorage.getItem(
      "employeeNumber"
    );
  };

/*
|--------------------------------------------------------------------------
| EXPORT API URL
|--------------------------------------------------------------------------
*/

export { API_BASE_URL };