import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div style={{
      background: "#007bff",
      padding: "15px",
      color: "white",
      display: "flex",
      gap: "20px"
    }}>
      <Link to="/" style={{ color: "white" }}>Employees</Link>
      <Link to="/deposit" style={{ color: "white" }}>Deposit</Link>
      <Link to="/restaurants" style={{ color: "white" }}>Order Food</Link>
      <Link to="/orders" style={{ color: "white" }}>Orders</Link>
    </div>
  );
}