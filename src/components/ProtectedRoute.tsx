
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import {
  getDefaultRouteForRole,
  getUserFromToken
} from "../utils/auth";

interface Props {
  children: ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({
  children,
  roles
}: Props) {
  const user = getUserFromToken();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = user.role.trim().toLowerCase();

  const isAllowed =
    !roles ||
    roles.some(
      role => role.trim().toLowerCase() === currentRole
    );

  if (!isAllowed) {
    const defaultRoute = getDefaultRouteForRole(user.role);

    return (
      <Navigate
        to={defaultRoute}
        replace
      />
    );
  }

  return <>{children}</>;
}
