import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Employees from "./pages/Employees";
import Deposit from "./pages/Deposit";
import Restaurants from "./pages/Restaurants";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Reports from "./pages/Reports";
import TransactionsPage from "./pages/Transactions";
import AddEmployee from "./pages/AddEmployee";

import MainLayout from "./layouts/MainLayout";
import { startConnection } from "./signalr";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  useEffect(() => {
    startConnection();
  }, []);

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Employees />} />
          <Route path="/employees/add" element={<AddEmployee />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </MainLayout>

      <ToastContainer position="top-right" />
    </BrowserRouter>
  );
}

export default App;