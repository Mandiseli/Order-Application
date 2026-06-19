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

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <div className="logo">🍔 Cafeteria</div>

        <nav>
          {user?.role === "Admin" && (
            <>
              <Link to="/">Employees</Link>
              <Link to="/employees/add">Add Employee</Link>
              <Link to="/admin">Admin</Link>
              <Link to="/transactions">Transactions</Link>
            </>
          )}

          {(user?.role === "Admin" || user?.role === "Manager") && (
            <Link to="/reports">Reports</Link>
          )}

          {(user?.role === "Admin" || user?.role === "Employee") && (
            <>
              <Link to="/deposit">Deposits</Link>
              <Link to="/restaurants">Restaurants</Link>
              <Link to="/employee-dashboard">Employee Dashboard</Link>
              <Link to="/employee-profile">Employee Profile</Link>
            </>
          )}

          {user && <Link to="/orders">Orders</Link>}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(!open)}>
            ☰
          </button>

          <h2>Employee Cafeteria System</h2>

          <div className="topbar-actions">
            <DarkModeToggle />

            {user ? (
              <button className="button button-danger" onClick={logout}>
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