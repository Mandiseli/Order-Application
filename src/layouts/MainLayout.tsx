import { useState } from "react";
import { Link } from "react-router-dom";
import "./MainLayout.css";

interface Props {
  children: React.ReactNode;
}

export default function MainLayout({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <div className="logo">🍔 Cafeteria</div>

        <nav>
          <Link to="/" onClick={() => setOpen(false)}>Employees</Link>
          <Link to="/employees/add" onClick={() => setOpen(false)}>Add Employee</Link>
          <Link to="/employee-profile" onClick={() => setOpen(false)}>Employee Profile</Link>
          <Link to="/deposit" onClick={() => setOpen(false)}>Deposits</Link>
          <Link to="/restaurants" onClick={() => setOpen(false)}>Restaurants</Link>
          <Link to="/orders" onClick={() => setOpen(false)}>Orders</Link>
          <Link to="/transactions" onClick={() => setOpen(false)}>Transactions</Link>
          <Link to="/admin" onClick={() => setOpen(false)}>Admin</Link>
          <Link to="/reports" onClick={() => setOpen(false)}>Reports</Link>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="menu-btn"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>

          <h2>Employee Cafeteria System</h2>
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}