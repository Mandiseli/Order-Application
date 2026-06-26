import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Employees from "./pages/Employees";
import Deposit from "./pages/Deposit";
import Restaurants from "./pages/Restaurants";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import Reports from "./pages/Reports";
import TransactionsPage from "./pages/Transactions";
import AddEmployee from "./pages/AddEmployee";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import DepositApprovals from "./pages/DepositApprovals";
import MenuAdmin from "./pages/MenuAdmin";

import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import { startConnection } from "./signalr";
import { ToastContainer } from "react-toastify";

function App() {
  useEffect(() => {
    startConnection();
  }, []);

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute roles={["Admin", "Manager"]}>
                <Employees />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees/add"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <AddEmployee />
              </ProtectedRoute>
            }
          />

          <Route
            path="/deposit"
            element={
              <ProtectedRoute roles={["Admin", "Employee"]}>
                <Deposit />
              </ProtectedRoute>
            }
          />

          <Route
            path="/deposit-approvals"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <DepositApprovals />
              </ProtectedRoute>
            }
          />

          <Route
            path="/menu-admin"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <MenuAdmin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/restaurants"
            element={
              <ProtectedRoute roles={["Admin", "Employee"]}>
                <Restaurants />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute roles={["Admin", "Manager", "Employee"]}>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute roles={["Admin", "Manager"]}>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={["Admin", "Manager"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee-profile"
            element={
              <ProtectedRoute roles={["Admin", "Employee"]}>
                <EmployeeProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee-dashboard"
            element={
              <ProtectedRoute roles={["Admin", "Employee"]}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MainLayout>

      <ToastContainer position="top-right" />
    </BrowserRouter>
  );
}

export default App;