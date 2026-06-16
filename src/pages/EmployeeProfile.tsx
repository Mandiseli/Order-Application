import { useEffect, useState } from "react";
import { api } from "../api/api";
import EmployeeSelector from "../components/EmployeeSelector";
import { toast } from "react-toastify";

interface Dashboard {
  employeeName: string;
  employeeNumber: string;
  balance: number;
  totalOrders: number;
  totalSpent: number;
  favoritesCount: number;
  ratingsCount: number;
}

interface Favorite {
  id: number;
  restaurantName: string;
  restaurantAddress: string;
}

interface MonthlyData {
  month: string;
  totalSpent: number;
  orders: number;
}

export default function EmployeeProfile() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);

  useEffect(() => {
    if (employeeNumber) {
      loadProfile();
    }
  }, [employeeNumber]);

  const loadProfile = async () => {
    try {
      const dashboardRes = await api.get(`/employeeDashboard/${employeeNumber}`);
      setDashboard(dashboardRes.data);

      const favoritesRes = await api.get(`/favorites/${employeeNumber}`);
      setFavorites(favoritesRes.data);

      const monthlyRes = await api.get(`/employeeDashboard/${employeeNumber}/monthly-chart`);
      setMonthly(monthlyRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load employee profile");
    }
  };

  return (
    <div>
      <h1 className="page-title">👤 Employee Profile</h1>

      <div className="card">
        <EmployeeSelector onSelect={setEmployeeNumber} />
      </div>

      {dashboard && (
        <>
          <div className="widgets">
            <div className="widget-card">
              <h3>Name</h3>
              <h1>{dashboard.employeeName}</h1>
            </div>

            <div className="widget-card">
              <h3>Balance</h3>
              <h1>R{Number(dashboard.balance).toFixed(2)}</h1>
            </div>

            <div className="widget-card">
              <h3>Total Orders</h3>
              <h1>{dashboard.totalOrders}</h1>
            </div>

            <div className="widget-card">
              <h3>Total Spent</h3>
              <h1>R{Number(dashboard.totalSpent).toFixed(2)}</h1>
            </div>
          </div>

          <div className="grid grid-3">
            <div className="card">
              <h2>❤️ Favorite Restaurants</h2>

              {favorites.length === 0 ? (
                <p>No favorites yet.</p>
              ) : (
                favorites.map(f => (
                  <div key={f.id} className="report-row">
                    <span>{f.restaurantName}</span>
                    <small>{f.restaurantAddress}</small>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h2>📊 Monthly Spending</h2>

              {monthly.length === 0 ? (
                <p>No monthly data.</p>
              ) : (
                monthly.map(m => (
                  <div key={m.month} className="report-row">
                    <span>{m.month}</span>
                    <strong>R{Number(m.totalSpent).toFixed(2)}</strong>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h2>⭐ Activity</h2>

              <div className="report-row">
                <span>Favorites</span>
                <strong>{dashboard.favoritesCount}</strong>
              </div>

              <div className="report-row">
                <span>Ratings</span>
                <strong>{dashboard.ratingsCount}</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}