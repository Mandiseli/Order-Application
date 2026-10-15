
import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

/*
|--------------------------------------------------------------------------
| API CONFIGURATION
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "http://localhost:5174/api";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
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

export const getAccessToken = (): string | null =>
  localStorage.getItem("accessToken");

export const getRefreshToken = (): string | null =>
  localStorage.getItem("refreshToken");

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
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("employeeNumber");

  window.dispatchEvent(new Event("auth-changed"));
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
*/

let refreshPromise: Promise<string | null> | null = null;

/*
|--------------------------------------------------------------------------
| REFRESH ACCESS TOKEN
|--------------------------------------------------------------------------
*/

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = axios
    .post<AuthResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
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
      const accessToken = data.accessToken ?? data.token;

      if (!accessToken) {
        return null;
      }

      localStorage.setItem("accessToken", accessToken);

      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      if (data.role) {
        localStorage.setItem("role", data.role);
      }

      if (data.employeeNumber) {
        localStorage.setItem("employeeNumber", data.employeeNumber);
      }

      const existingUser = localStorage.getItem("user");

      if (existingUser) {
        try {
          const parsedUser = JSON.parse(existingUser) as Record<
            string,
            unknown
          >;

          localStorage.setItem(
            "user",
            JSON.stringify({
              ...parsedUser,
              ...(data.role ? { role: data.role } : {}),
              ...(data.employeeNumber
                ? { employeeNumber: data.employeeNumber }
                : {}),
            })
          );
        } catch {
          // Leave existing user data unchanged if it is invalid JSON.
        }
      }

      window.dispatchEvent(new Event("auth-changed"));

      return accessToken;
    })
    .catch((error: unknown) => {
      console.error("Refresh token failed:", error);
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
*/

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | RetryableRequestConfig
      | undefined;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";

    // Never attempt to refresh the refresh-token endpoint itself.
    if (requestUrl.includes("/auth/refresh")) {
      clearSession();

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/signup"
      ) {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    // Login and registration failures should be shown on their own pages.
    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register")
    ) {
      return Promise.reject(error);
    }

    // Prevent a request from being retried repeatedly.
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

    originalRequest._retry = true;

    const newAccessToken = await refreshAccessToken();

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

    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

    return api(originalRequest);
  }
);

/*
|--------------------------------------------------------------------------
| API ERROR MESSAGE
|--------------------------------------------------------------------------
*/

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const status = axiosError.response?.status;
    const responseData: unknown = axiosError.response?.data;

    // Some endpoints return a plain-text error response.
    if (
      typeof responseData === "string" &&
      responseData.trim().length > 0
    ) {
      return responseData.trim();
    }

    // Narrow the response before accessing object properties.
    if (
      responseData !== null &&
      typeof responseData === "object" &&
      !Array.isArray(responseData)
    ) {
      const data = responseData as ApiErrorResponse;

      if (typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
      }

      if (typeof data.title === "string" && data.title.trim()) {
        return data.title.trim();
      }

      if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail.trim();
      }

      if (data.errors && typeof data.errors === "object") {
        const messages: string[] = [];

        Object.values(data.errors).forEach((value) => {
          if (Array.isArray(value)) {
            value.forEach((message) => {
              if (message) messages.push(String(message));
            });
          } else if (value) {
            messages.push(String(value));
          }
        });

        if (messages.length > 0) {
          return messages.join(" ");
        }
      }
    }

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

    if (axiosError.code === "ERR_NETWORK") {
      return "Unable to connect to the server. Please check that the backend is running.";
    }

    if (
      axiosError.code === "ECONNABORTED" ||
      axiosError.code === "ETIMEDOUT"
    ) {
      return "The request timed out. Please try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

export const login = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", {
    username: username.trim(),
    password,
  });

  const data = response.data;
  const accessToken = data.accessToken ?? data.token;

  if (!accessToken) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  saveTokens(accessToken, data.refreshToken);

  if (data.role) {
    localStorage.setItem("role", data.role);
  }

  if (data.employeeNumber) {
    localStorage.setItem("employeeNumber", data.employeeNumber);
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      username: data.username ?? username,
      role: data.role ?? "",
      employeeNumber: data.employeeNumber ?? "",
    })
  );

  window.dispatchEvent(new Event("auth-changed"));

  return data;
};

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

export const register = async (input: {
  username: string;
  password: string;
  employeeNumber: string;
}): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/register", {
    username: input.username.trim(),
    password: input.password,
    employeeNumber: input.employeeNumber.trim(),
  });

  const result = response.data;
  const accessToken = result.accessToken ?? result.token;

  if (!accessToken) {
    throw new Error(
      "Registration succeeded but no access token was returned."
    );
  }

  saveTokens(accessToken, result.refreshToken);

  const role = result.role ?? "Employee";
  const employeeNumber =
    result.employeeNumber ?? input.employeeNumber;

  localStorage.setItem("role", role);
  localStorage.setItem("employeeNumber", employeeNumber);

  localStorage.setItem(
    "user",
    JSON.stringify({
      username: result.username ?? input.username,
      role,
      employeeNumber,
    })
  );

  window.dispatchEvent(new Event("auth-changed"));

  return result;
};

/*
|--------------------------------------------------------------------------
| AUTHENTICATION HELPERS
|--------------------------------------------------------------------------
*/

export const isAuthenticated = (): boolean =>
  Boolean(getAccessToken());

export const getCurrentRole = (): string | null =>
  localStorage.getItem("role");

export const getCurrentEmployeeNumber = (): string | null =>
  localStorage.getItem("employeeNumber");

export { API_BASE_URL };
