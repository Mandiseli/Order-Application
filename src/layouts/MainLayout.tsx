
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import DarkModeToggle from "../components/DarkModeToggle";
import { getUserFromToken, logout } from "../utils/auth";
import "./MainLayout.css";

interface Props {
  children: ReactNode;
}

export default function MainLayout({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(() => getUserFromToken());
  const location = useLocation();

  useEffect(() => {
    const syncUser = () => {
      setUser(getUserFromToken());
    };

    window.addEventListener("auth-changed", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("auth-changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setUser(getUserFromToken());
  }, [location.pathname]);

  const closeMenu = () => setOpen(false);

  const role = user?.role.trim().toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isEmployee = role === "employee";

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <div className="logo">🍔 Cafeteria</div>

        <nav aria-label="Main navigation">
          {!user && (
            <>
              <Link to="/login" onClick={closeMenu}>
                Login
              </Link>
              <Link to="/signup" onClick={closeMenu}>
                Sign Up
              </Link>
            </>
          )}

          {(isAdmin || isManager) && (
            <Link to="/" onClick={closeMenu}>
              Employees
            </Link>
          )}

          {isAdmin && (
            <>
              <Link to="/employees/add" onClick={closeMenu}>
                Add Employee
              </Link>
              <Link to="/admin" onClick={closeMenu}>
                Admin Dashboard
              </Link>
              <Link to="/deposit-approvals" onClick={closeMenu}>
                Deposit Approvals
              </Link>
              <Link to="/menu-admin" onClick={closeMenu}>
                Menu Admin
              </Link>
            </>
          )}

          {(isAdmin || isManager) && (
            <>
              <Link to="/reports" onClick={closeMenu}>
                Reports
              </Link>
              <Link to="/transactions" onClick={closeMenu}>
                Transactions
              </Link>
            </>
          )}

          {(isAdmin || isEmployee) && (
            <>
              <Link to="/deposit" onClick={closeMenu}>
                Deposits
              </Link>
              <Link to="/restaurants" onClick={closeMenu}>
                Restaurants
              </Link>
              <Link to="/employee-dashboard" onClick={closeMenu}>
                Employee Dashboard
              </Link>
              <Link to="/employee-profile" onClick={closeMenu}>
                Employee Profile
              </Link>
            </>
          )}

          {user && (
            <Link to="/orders" onClick={closeMenu}>
              Orders
            </Link>
          )}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setOpen(previous => !previous)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            ☰
          </button>

          <h2>Employee Cafeteria System</h2>

          <div className="topbar-actions">
            <DarkModeToggle />

            {user ? (
              <button
                type="button"
                className="button button-danger"
                onClick={logout}
              >
                Logout
              </button>
            ) : (
              <Link className="button" to="/login">
                Login
              </Link>
            )}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
