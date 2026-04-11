import { useEffect, useState } from "react";
import { api } from "../api/api";
import type { Restaurant } from "../types";
import { useCart } from "../hooks/useCart";
import EmployeeSelector from "../components/EmployeeSelector";

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [employeeNumber, setEmployeeNumber] = useState("");

  const { cart, addToCart, total, removeFromCart, clearCart } = useCart();

  useEffect(() => {
    api.get("/restaurants").then(res => setRestaurants(res.data));
  }, []);

  const placeOrder = async () => {
    const items: any = {};
    cart.forEach(c => items[c.menuItemId] = c.quantity);

    try {
      await api.post("/orders/place", null, {
        params: { employeeNumber, items }
      });

      alert("✅ Order placed successfully!");
      clearCart();
    } catch (err: any) {
      alert(err.response?.data || "❌ Failed");
    }
  };

  return (
    <div className="layout">

      {/* LEFT SIDE */}
      <div className="left">
        <h2>🍔 Restaurants</h2>

        <div className="card">
          <EmployeeSelector onSelect={setEmployeeNumber} />
        </div>

        {restaurants.map(r => (
          <div key={r.id} className="card">
            <h3>{r.name}</h3>
            <p>{r.locationDescription}</p>

            {r.menuItems.map(m => (
              <div key={m.id} className="card">
                <strong>{m.name}</strong>
                <p>{m.description}</p>
                <div>
                  R{m.price}
                  <button
                    className="button"
                    onClick={() =>
                      addToCart({
                        menuItemId: m.id,
                        name: m.name,
                        price: m.price,
                        quantity: 1
                      })
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* RIGHT SIDE CART */}
      <div className="right">
        <div className="card">
          <h2>🛒 Cart</h2>

          {cart.length === 0 && <p>No items yet</p>}

          {cart.map(item => (
            <div key={item.menuItemId} className="cart-item">
              <span>{item.name} x {item.quantity}</span>
              <span>R{item.price * item.quantity}</span>
              <button onClick={() => removeFromCart(item.menuItemId)}>❌</button>
            </div>
          ))}

          <hr />

          <h3>Total: R{total}</h3>

          <button className="button" onClick={placeOrder}>
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}