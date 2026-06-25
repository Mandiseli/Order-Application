import { useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";
import CitySelector from "../components/CitySelector";
import EmployeeSelector from "../components/EmployeeSelector";
import { useCart } from "../hooks/useCart";
import { getSampleMenu } from "../data/sampleMenus";
import type { GeoRestaurant } from "../types";
import { getUserFromToken } from "../utils/auth";

export default function Restaurants() {
  const user = getUserFromToken();

  const [restaurants, setRestaurants] = useState<GeoRestaurant[]>([]);
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  const { cart, addToCart, removeFromCart, clearCart, total } = useCart();

  const employeeNumber =
    user?.role === "Employee"
      ? user.employeeNumber
      : selectedEmployeeNumber;

  const loadRestaurants = async (selectedCity: string) => {
    if (!selectedCity) return;

    try {
      setLoading(true);
      setCity(selectedCity);

      const res = await api.get(`/places/restaurants/${selectedCity}`);
      setRestaurants(res.data);

      toast.success(`Restaurants loaded for ${selectedCity}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load restaurants. Check Geoapify API key/backend.");
    } finally {
      setLoading(false);
    }
  };

  const addMenuItemToCart = (
    restaurantIndex: number,
    restaurantName: string,
    itemId: number,
    itemName: string,
    price: number
  ) => {
    addToCart({
      menuItemId: restaurantIndex * 1000 + itemId,
      name: `${restaurantName} - ${itemName}`,
      price,
      quantity: 1
    });

    toast.success(`${itemName} added to cart`);
  };

  const addFavorite = async (restaurant: GeoRestaurant) => {
    if (!employeeNumber) {
      toast.error("Please select an employee first");
      return;
    }

    try {
      await api.post("/favorites", {
        employeeNumber,
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude
      });

      toast.success("Added to favorites ❤️");
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to add favorite");
    }
  };

  const rateRestaurant = async (restaurant: GeoRestaurant, rating: number) => {
    if (!employeeNumber) {
      toast.error("Please select an employee first");
      return;
    }

    try {
      await api.post("/restaurantRatings", {
        employeeNumber,
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        rating,
        comment: ""
      });

      toast.success(`Rated ${rating} stars ⭐`);
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to rate restaurant");
    }
  };

  const placeOrder = async () => {
    if (!employeeNumber) {
      toast.error("Please select an employee");
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      await api.post("/orders/place-external", {
        employeeNumber,
        items: cart.map(item => ({
          itemName: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      });

      toast.success("Order placed successfully 🍔");
      clearCart();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data || "Order failed");
    }
  };

  return (
    <div className="uber-layout">
      <div className="uber-left">
        <h1 className="page-title">🍔 Restaurants Near You</h1>

        {user?.role !== "Employee" && (
          <div className="card">
            <EmployeeSelector onSelect={setSelectedEmployeeNumber} />
          </div>
        )}

        {user?.role === "Employee" && (
          <div className="card">
            <strong>Logged in as:</strong> {user.employeeNumber}
          </div>
        )}

        <div className="card">
          <CitySelector onSelect={loadRestaurants} />
        </div>

        {employeeNumber && (
          <div className="card">
            <strong>Selected Employee:</strong> {employeeNumber}
          </div>
        )}

        {city && (
          <div className="card">
            <strong>Selected City:</strong> {city}
          </div>
        )}

        {loading ? (
          <div className="card">Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="card">Select a city to view restaurants.</div>
        ) : (
          restaurants.map((restaurant, restaurantIndex) => {
            const menu = getSampleMenu(restaurant.name);

            return (
              <div
                key={`${restaurant.name}-${restaurantIndex}`}
                className="uber-restaurant-card"
              >
                <div className="restaurant-image">
                  <img
                    src={
                      restaurant.imageUrl ||
                      `https://source.unsplash.com/600x300/?restaurant,food,${restaurant.name}`
                    }
                    alt={restaurant.name}
                  />
                </div>

                <div className="restaurant-header">
                  <h2>{restaurant.name}</h2>

                  <p>{restaurant.address}</p>

                  <p className="muted">
                    📍 {restaurant.latitude}, {restaurant.longitude}
                  </p>

                  <div className="restaurant-actions">
                    <button
                      className="button"
                      onClick={() => addFavorite(restaurant)}
                    >
                      ❤️ Favorite
                    </button>

                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        className="star-btn"
                        onClick={() => rateRestaurant(restaurant, star)}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div className="menu-list">
                  {menu.map(item => (
                    <div key={item.id} className="menu-item">
                      <div className="menu-info">
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                        <p>R{item.price.toFixed(2)}</p>
                      </div>

                      <button
                        className="add-btn"
                        onClick={() =>
                          addMenuItemToCart(
                            restaurantIndex,
                            restaurant.name,
                            item.id,
                            item.name,
                            item.price
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="uber-right">
        <div className="cart-box">
          <h2>🛒 Your Order</h2>

          {cart.length === 0 ? (
            <p className="muted">Your cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.menuItemId} className="cart-item">
                <div>
                  <strong>{item.name}</strong>

                  <div className="qty-controls">
                    <button onClick={() => removeFromCart(item.menuItemId)}>
                      -
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() =>
                        addToCart({
                          menuItemId: item.menuItemId,
                          name: item.name,
                          price: item.price,
                          quantity: 1
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                <p>R{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))
          )}

          <hr />

          <h3>Total: R{total.toFixed(2)}</h3>

          <button className="checkout-btn" onClick={placeOrder}>
            Checkout
          </button>

          <button className="clear-btn" onClick={clearCart}>
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  );
}