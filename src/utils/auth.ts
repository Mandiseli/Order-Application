export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

export function getUserFromToken() {
  const token = getToken();

  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    return {
      username:
        payload.unique_name ||
        payload.name ||
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
        "",
      role:
        payload.role ||
        payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
        "",
      employeeNumber: payload.employeeNumber || ""
    };
  } catch {
    return null;
  }
}

export function hasRole(roles: string[]) {
  const user = getUserFromToken();
  return user ? roles.includes(user.role) : false;
}