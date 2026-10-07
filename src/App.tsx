import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

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

import { ToastContainer } from "react-toastify";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          {/* Public Routes */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<Signup />}
          />

          {/* Employees */}

          <Route
            path="/"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Manager"
                ]}
              >
                <Employees />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees/add"
            element={
              <ProtectedRoute
                roles={["Admin"]}
              >
                <AddEmployee />
              </ProtectedRoute>
            }
          />

          {/* Employee Deposits */}

          <Route
            path="/deposit"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Employee"
                ]}
              >
                <Deposit />
              </ProtectedRoute>
            }
          />

          <Route
            path="/deposit-approvals"
            element={
              <ProtectedRoute
                roles={["Admin"]}
              >
                <DepositApprovals />
              </ProtectedRoute>
            }
          />

          {/* Restaurants */}

          <Route
            path="/restaurants"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Employee"
                ]}
              >
                <Restaurants />
              </ProtectedRoute>
            }
          />

          {/* Menu Administration */}

          <Route
            path="/menu-admin"
            element={
              <ProtectedRoute
                roles={["Admin"]}
              >
                <MenuAdmin />
              </ProtectedRoute>
            }
          />

          {/* Orders */}

          <Route
            path="/orders"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Manager",
                  "Employee"
                ]}
              >
                <Orders />
              </ProtectedRoute>
            }
          />

          {/* Transactions */}

          <Route
            path="/transactions"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Manager"
                ]}
              >
                <TransactionsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                roles={["Admin"]}
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Reports */}

          <Route
            path="/reports"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Manager"
                ]}
              >
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Employee Profile */}

          <Route
            path="/employee-profile"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Employee"
                ]}
              >
                <EmployeeProfile />
              </ProtectedRoute>
            }
          />

          {/* Employee Dashboard */}

          <Route
            path="/employee-dashboard"
            element={
              <ProtectedRoute
                roles={[
                  "Admin",
                  "Employee"
                ]}
              >
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
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