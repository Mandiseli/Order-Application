
export interface AuthUser {
  username: string;
  role: string;
  employeeNumber: string;
}

export function getToken(): string | null {
  return localStorage.getItem("accessToken");
}

function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = normalized.padEnd(
    Math.ceil(normalized.length / 4) * 4,
    "="
  );

  return atob(padded);
}

export function getUserFromToken(): AuthUser | null {
  const token = getToken();

  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      decodeBase64Url(parts[1])
    );

    const username =
      payload.unique_name ??
      payload.name ??
      payload[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ] ??
      "";

    const role =
      payload.role ??
      payload[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      ] ??
      "";

    const employeeNumber =
      payload.employeeNumber ??
      payload.EmployeeNumber ??
      "";

    if (!role) return null;

    return {
      username: String(username),
      role: String(
        Array.isArray(role) ? role[0] ?? "" : role
      ),
      employeeNumber: String(employeeNumber)
    };
  } catch {
    return null;
  }
}

export function getDefaultRouteForRole(
  role: string | undefined | null
): string {
  switch (role?.trim().toLowerCase()) {
    case "admin":
      return "/admin";

    case "manager":
      return "/reports";

    case "employee":
      return "/employee-dashboard";

    default:
      return "/login";
  }
}

export function logout(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("employeeNumber");

  window.dispatchEvent(new Event("auth-changed"));
  window.location.assign("/login");
}

export function hasRole(roles: string[]): boolean {
  const user = getUserFromToken();

  if (!user) return false;

  const currentRole = user.role.trim().toLowerCase();

  return roles.some(
    role => role.trim().toLowerCase() === currentRole
  );
}
