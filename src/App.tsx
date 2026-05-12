import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

// Pages
import Employees from "./pages/Employees";
import Deposit from "./pages/Deposit";
import Restaurants from "./pages/Restaurants";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Reports from "./pages/Reports";
import TransactionsPage from "./pages/Transactions";

// Components
import Navbar from "./components/Navbar";

// SignalR
import { startConnection } from "./signalr";

function App() {

  useEffect(() => {
    startConnection();
  }, []);

  return (
    <BrowserRouter>
      <Navbar />

      <div className="container">
        <Routes>
          {/* Employee Pages */}
          <Route path="/" element={<Employees />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/transactions" element={<TransactionsPage />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;