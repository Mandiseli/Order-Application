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
      username: payload.unique_name || payload.name || "",
      role: payload.role || "",
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