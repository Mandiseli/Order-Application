import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">

      <div className="navbar-logo">
        🍔 Cafeteria System
      </div>

      <div className="navbar-links">

        <Link to="/employees/add">Add Employee</Link>
        <Link to="/">Employees</Link>
        <Link to="/deposit">Deposits</Link>
        <Link to="/restaurants">Restaurants</Link>
        <Link to="/orders">Orders</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/reports">Reports</Link>

      </div>

    </nav>
  );
}