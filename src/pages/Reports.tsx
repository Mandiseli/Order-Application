import { useEffect, useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";

interface Monthly {
  year: number;
  month: number;
  totalOrders: number;
  totalSpending: number;
}

interface EmployeeReport {
  employeeName: string;
  employeeNumber: string;
  totalOrders: number;
  totalSpending: number;
}

interface RestaurantReport {
  restaurantName: string;
  totalOrders: number;
  totalRevenue: number;
}

export default function Reports() {
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [topEmployees, setTopEmployees] = useState<EmployeeReport[]>([]);
  const [highestSpending, setHighestSpending] = useState<EmployeeReport[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<RestaurantReport[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const monthlyRes = await api.get("/reports/monthly-spending");
      setMonthly(monthlyRes.data);

      const topEmployeesRes = await api.get("/reports/top-employees");
      setTopEmployees(topEmployeesRes.data);

      const highestSpendingRes = await api.get("/reports/highest-spending-employees");
      setHighestSpending(highestSpendingRes.data);

      const topRestaurantsRes = await api.get("/reports/top-restaurants");
      setTopRestaurants(topRestaurantsRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load reports");
    }
  };

  const download = (type: "csv" | "excel" | "pdf") => {
    window.open(`http://localhost:5174/api/reports/export/${type}`, "_blank");
  };

  return (
    <div>
      <h1 className="page-title">📊 Reports Dashboard</h1>

      <div className="status-actions">
        <button className="button" onClick={() => download("csv")}>
          Export CSV
        </button>

        <button className="button" onClick={() => download("excel")}>
          Export Excel
        </button>

        <button className="button button-danger" onClick={() => download("pdf")}>
          Export PDF
        </button>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h2>Monthly Spending</h2>

          {monthly.map(item => (
            <div key={`${item.year}-${item.month}`} className="report-row">
              <span>{item.year}-{item.month}</span>
              <strong>R{Number(item.totalSpending).toFixed(2)}</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Top Employees - Most Orders</h2>

          {topEmployees.map(emp => (
            <div key={emp.employeeNumber} className="report-row">
              <span>{emp.employeeName}</span>
              <strong>{emp.totalOrders} orders</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Highest Spending Employees</h2>

          {highestSpending.map(emp => (
            <div key={emp.employeeNumber} className="report-row">
              <span>{emp.employeeName}</span>
              <strong>R{Number(emp.totalSpending).toFixed(2)}</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Top Restaurants</h2>

          {topRestaurants.map(rest => (
            <div key={rest.restaurantName} className="report-row">
              <span>{rest.restaurantName}</span>
              <strong>{rest.totalOrders} orders</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}