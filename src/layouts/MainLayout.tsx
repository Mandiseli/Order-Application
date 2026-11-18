import { useState } from "react";
import { Link } from "react-router-dom";
import DarkModeToggle from "../components/DarkModeToggle";
import { getUserFromToken, logout } from "../utils/auth";
import "./MainLayout.css";

interface Props {
  children: React.ReactNode;
}

export default function MainLayout({ children }: Props) {
  const [open, setOpen] = useState(false);
  const user = getUserFromToken();

  const closeMenu = () => setOpen(false);

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <div className="logo">🍔 Cafeteria</div>

        <nav>
          {user?.role === "Admin" && (
            <>
              <Link to="/" onClick={closeMenu}>Employees</Link>
              <Link to="/employees/add" onClick={closeMenu}>Add Employee</Link>
              <Link to="/admin" onClick={closeMenu}>Admin</Link>
              <Link to="/deposit-approvals" onClick={closeMenu}>Deposit Approvals</Link>
              <Link to="/menu-admin" onClick={closeMenu}>Menu Admin</Link>
              <Link to="/transactions" onClick={closeMenu}>Transactions</Link>
            </>
          )}

          {(user?.role === "Admin" || user?.role === "Manager") && (
            <Link to="/reports" onClick={closeMenu}>Reports</Link>
          )}

          {(user?.role === "Admin" || user?.role === "Employee") && (
            <>
              <Link to="/deposit" onClick={closeMenu}>Deposits</Link>
              <Link to="/restaurants" onClick={closeMenu}>Restaurants</Link>
              <Link to="/employee-dashboard" onClick={closeMenu}>Employee Dashboard</Link>
              <Link to="/employee-profile" onClick={closeMenu}>Employee Profile</Link>
            </>
          )}

          {user && (
            <Link to="/orders" onClick={closeMenu}>Orders</Link>
          )}

          {!user && (
            <>
              <Link to="/login" onClick={closeMenu}>Login</Link>
              <Link to="/signup" onClick={closeMenu}>Signup</Link>
            </>
          )}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setOpen(!open)}
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

        <div className="content">{children}</div>
      </div>
    </div>
  );
}