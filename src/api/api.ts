import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "http://localhost:5174/api";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export interface AuthResponse {
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

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 15000,
});

export const getAccessToken = (): string | null => localStorage.getItem("accessToken");
export const getRefreshToken = (): string | null => localStorage.getItem("refreshToken");

export const saveTokens = (accessToken: string, refreshToken?: string | null): void => {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};

export const clearSession = (): void => {
  ["accessToken", "refreshToken", "user", "role", "employeeNumber"].forEach((key) =>
    localStorage.removeItem(key),
  );
  window.dispatchEvent(new Event("auth-changed"));
};

export const logout = (): void => {
  clearSession();
  if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
    window.location.assign("/login");
  }
};

let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post<AuthResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json", Accept: "application/json" }, timeout: 15000 },
    )
    .then(({ data }) => {
      const accessToken = data.accessToken ?? data.token;
      if (!accessToken) return null;
      saveTokens(accessToken, data.refreshToken);
      if (data.role) localStorage.setItem("role", data.role);
      if (data.employeeNumber) localStorage.setItem("employeeNumber", data.employeeNumber);

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as Record<string, unknown>;
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...user,
              ...(data.role ? { role: data.role } : {}),
              ...(data.employeeNumber ? { employeeNumber: data.employeeNumber } : {}),
            }),
          );
        } catch {
          // An invalid cached user must not prevent a successful token refresh.
        }
      }
      window.dispatchEvent(new Event("auth-changed"));
      return accessToken;
    })
    .catch((error: unknown) => {
      console.error("Refresh token request failed:", error);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (error.response?.status !== 401 || !originalRequest) return Promise.reject(error);

    const requestUrl = originalRequest.url ?? "";
    const isAuthRequest = ["/auth/login", "/auth/register", "/auth/refresh"].some((path) =>
      requestUrl.includes(path),
    );
    if (isAuthRequest) return Promise.reject(error);

    if (originalRequest._retry) {
      logout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      logout();
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(originalRequest);
  },
);

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const data: unknown = axiosError.response?.data;
    if (typeof data === "string" && data.trim()) return data.trim();

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const body = data as ApiErrorResponse;
      for (const message of [body.message, body.title, body.detail]) {
        if (typeof message === "string" && message.trim()) return message.trim();
      }
      if (body.errors) {
        const messages = Object.values(body.errors).flatMap((value) =>
          Array.isArray(value) ? value : [value],
        ).filter(Boolean);
        if (messages.length) return messages.join(" ");
      }
    }

    const statusMessages: Record<number, string> = {
      400: "The information provided is invalid.",
      401: "Your session has expired. Please log in again.",
      403: "You do not have permission to perform this action.",
      404: "The requested resource was not found.",
      409: "This request conflicts with existing data.",
      422: "Some of the information provided is invalid.",
      429: "Too many requests. Please try again later.",
      500: "A server error occurred. Please try again later.",
      502: "The server is temporarily unavailable. Please try again later.",
      503: "The server is temporarily unavailable. Please try again later.",
      504: "The server request timed out. Please try again.",
    };
    if (axiosError.response?.status && statusMessages[axiosError.response.status]) {
      return statusMessages[axiosError.response.status];
    }
    if (axiosError.code === "ERR_NETWORK") {
      return "Unable to connect to the server. Check that the backend is running.";
    }
    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
      return "The request timed out. Please try again.";
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
};

const storeAuthenticatedUser = (
  data: AuthResponse,
  fallbackUsername: string,
  fallbackEmployeeNumber = "",
): void => {
  const accessToken = data.accessToken ?? data.token;
  if (!accessToken) throw new Error("Authentication succeeded but no access token was returned.");

  saveTokens(accessToken, data.refreshToken);
  const role = data.role ?? "";
  const employeeNumber = data.employeeNumber ?? fallbackEmployeeNumber;
  if (role) localStorage.setItem("role", role);
  if (employeeNumber) localStorage.setItem("employeeNumber", employeeNumber);
  localStorage.setItem(
    "user",
    JSON.stringify({ username: data.username ?? fallbackUsername, role, employeeNumber }),
  );
  window.dispatchEvent(new Event("auth-changed"));
};

export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>("/auth/login", {
    username: username.trim(),
    password,
  });
  storeAuthenticatedUser(data, username);
  return data;
};

export const register = async (input: {
  username: string;
  password: string;
  employeeNumber: string;
}): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    username: input.username.trim(),
    password: input.password,
    employeeNumber: input.employeeNumber.trim(),
  });
  storeAuthenticatedUser(data, input.username, input.employeeNumber.trim());
  return data;
};

export const isAuthenticated = (): boolean => Boolean(getAccessToken());
export const getCurrentRole = (): string | null => localStorage.getItem("role");
export const getCurrentEmployeeNumber = (): string | null => localStorage.getItem("employeeNumber");
export { API_BASE_URL };
