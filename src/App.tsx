
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";
import { ToastContainer } from "react-toastify";

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
import { getDefaultRouteForRole, getUserFromToken } from "./utils/auth";
import { startConnection, stopConnection } from "./signalr";

function SignalRBootstrap() {
  useEffect(() => {
    let disposed = false;

    const syncConnection = async () => {
      if (disposed) return;

      if (getUserFromToken()) {
        await startConnection();
      } else {
        await stopConnection();
      }
    };

    void syncConnection();

    const handleAuthChanged = () => {
      void syncConnection();
    };

    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      disposed = true;
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
      void stopConnection();
    };
  }, []);

  return null;
}

function NotFoundRedirect() {
  const user = getUserFromToken();

  return (
    <Navigate
      to={getDefaultRouteForRole(user?.role)}
      replace
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <SignalRBootstrap />

      <MainLayout>
        <Routes>
          {/* Public pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Employees */}
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

          {/* Deposits */}
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

          {/* Restaurants and menu */}
          <Route
            path="/restaurants"
            element={
              <ProtectedRoute roles={["Admin", "Employee"]}>
                <Restaurants />
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

          {/* Orders */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute roles={["Admin", "Manager", "Employee"]}>
                <Orders />
              </ProtectedRoute>
            }
          />

          {/* Transactions */}
          <Route
            path="/transactions"
            element={
              <ProtectedRoute roles={["Admin", "Manager"]}>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={["Admin", "Manager"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Employee pages */}
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

          {/* Redirect unknown URLs instead of showing a blank page */}
          <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
      </MainLayout>

      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </BrowserRouter>
  );
}

export default App;
