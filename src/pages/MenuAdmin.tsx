import { useEffect, useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";

interface Restaurant {
  id: number;
  name: string;
}

interface MenuItem {
  id: number;
  restaurantId: number;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
}

export default function MenuAdmin() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [restaurantId, setRestaurantId] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);

  useEffect(() => {
    loadRestaurants();
    loadItems();
  }, []);

  const loadRestaurants = async () => {
    const res = await api.get("/restaurants");
    setRestaurants(res.data);
  };

  const loadItems = async () => {
    const res = await api.get("/restaurants");
    const allItems: MenuItem[] = [];

    res.data.forEach((r: any) => {
      r.menuItems?.forEach((m: any) => {
        allItems.push(m);
      });
    });

    setItems(allItems);
  };

  const createItem = async () => {
    if (!restaurantId || !name.trim() || price <= 0) {
      toast.error("Restaurant, name and price are required");
      return;
    }

    try {
      await api.post("/menuItems", {
        restaurantId,
        name,
        description,
        price,
        isAvailable: true
      });

      toast.success("Menu item created");
      setName("");
      setDescription("");
      setPrice(0);
      loadItems();
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to create menu item");
    }
  };

  const toggleAvailability = async (id: number, current: boolean) => {
    try {
      await api.put(`/menuItems/${id}/availability`, !current, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      toast.success("Availability updated");
      loadItems();
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to update availability");
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this menu item?")) return;

    try {
      await api.delete(`/menuItems/${id}`);
      toast.success("Menu item deleted");
      loadItems();
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to delete menu item");
    }
  };

  return (
    <div>
      <h1 className="page-title">🍽️ Menu Admin</h1>

      <div className="card">
        <h2>Add Menu Item</h2>

        <select
          className="input"
          value={restaurantId}
          onChange={(e) => setRestaurantId(Number(e.target.value))}
        >
          <option value={0}>Select Restaurant</option>

          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Meal name"
        />

        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />

        <input
          className="input"
          type="number"
          value={price || ""}
          onChange={(e) => setPrice(Number(e.target.value))}
          placeholder="Price"
        />

        <button className="button button-success" onClick={createItem}>
          Add Item
        </button>
      </div>

      <div className="grid">
        {items.map((item) => (
          <div key={item.id} className="card">
            <h2>{item.name}</h2>

            <p>{item.description}</p>

            <p>
              <strong>Price:</strong> R{Number(item.price).toFixed(2)}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {item.isAvailable ? "Available" : "Unavailable"}
            </p>

            <div className="status-actions">
              <button
                className="button"
                onClick={() =>
                  toggleAvailability(item.id, item.isAvailable)
                }
              >
                {item.isAvailable ? "Disable" : "Enable"}
              </button>

              <button
                className="button button-danger"
                onClick={() => deleteItem(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}