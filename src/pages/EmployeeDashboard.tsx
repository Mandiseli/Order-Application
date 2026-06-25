import { useEffect, useState } from "react";
import { api } from "../api/api";
import { getUserFromToken } from "../utils/auth";
import { toast } from "react-toastify";

interface Profile {
  name: string;
  employeeNumber: string;
  currentBalance: number;
  totalOrders: number;
  lastOrderDate: string | null;
}

interface Order {
  id: number;
  orderDate: string;
  totalAmount: number;
  status: string;
}

interface Favorite {
  restaurantName: string;
}

interface Recommendation {
  itemName: string;
  orderCount: number;
  averagePrice: number;
}

export default function EmployeeDashboard() {
  const user = getUserFromToken();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const employeeNumber = user?.employeeNumber || "";

  useEffect(() => {
    if (!employeeNumber) {
      toast.error("No employee number found for this account.");
      return;
    }

    loadDashboard();
  }, [employeeNumber]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const profileRes = await api.get(`/employeeProfile/${employeeNumber}`);
      setProfile(profileRes.data);

      const ordersRes = await api.get(`/orders/employee/${employeeNumber}`);
      setOrders(ordersRes.data);

      const favRes = await api.get(`/favorites/${employeeNumber}`);
      setFavorites(favRes.data);

      const recRes = await api.get(`/foodRecommendations/${employeeNumber}`);
      setRecommendations(recRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load employee dashboard");
    } finally {
      setLoading(false);
    }
  };

  const ordersThisMonth = orders.filter(o => {
    const date = new Date(o.orderDate);
    const now = new Date();

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;

  const favoriteRestaurant =
    favorites.length > 0 ? favorites[0].restaurantName : "No favorite yet";

  if (!employeeNumber) {
    return (
      <div className="card">
        This employee account is not linked to an employee number.
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">👤 Employee Dashboard</h1>

      {loading && <div className="card">Loading dashboard...</div>}

      {profile && profile.currentBalance < 100 && (
        <div className="budget-alert">
          ⚠️ Balance below R100. Please deposit funds soon.
        </div>
      )}

      {profile && (
        <>
          <div className="widgets">
            <div className="widget-card">
              <h3>Employee</h3>
              <h1>{profile.name}</h1>
            </div>

            <div className="widget-card">
              <h3>Current Balance</h3>
              <h1>R{Number(profile.currentBalance).toFixed(2)}</h1>
            </div>

            <div className="widget-card">
              <h3>Orders This Month</h3>
              <h1>{ordersThisMonth}</h1>
            </div>

            <div className="widget-card">
              <h3>Last Order</h3>
              <h1>
                {profile.lastOrderDate
                  ? new Date(profile.lastOrderDate).toLocaleDateString()
                  : "None"}
              </h1>
            </div>

            <div className="widget-card">
              <h3>Favorite Restaurant</h3>
              <h1>{favoriteRestaurant}</h1>
            </div>
          </div>

          <div className="card">
            <h2>🤖 Recommended For You</h2>

            {recommendations.length === 0 ? (
              <p>No recommendations yet.</p>
            ) : (
              recommendations.map(item => (
                <div key={item.itemName} className="report-row">
                  <span>{item.itemName}</span>
                  <strong>R{Number(item.averagePrice).toFixed(2)}</strong>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}