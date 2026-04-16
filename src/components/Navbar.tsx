import { Link } from "react-router-dom";
import "../index.css";

export default function Navbar() {
  return (
    <div className="navbar">
      <Link to="/">Employees</Link>
      <Link to="/deposit">Deposit</Link>
      <Link to="/restaurants">Order Food</Link>
      <Link to="/orders">Orders</Link>
      <Link to="/admin">Admin</Link>
      <Link to="/reports">Reports</Link>
    </div>
  );
}