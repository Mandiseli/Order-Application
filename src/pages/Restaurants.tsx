import { useEffect, useState } from "react";
import { api } from "../api/api";
import { Restaurant } from "../types";
import { useCart } from "../hooks/useCart";
import EmployeeSelector from "../components/EmployeeSelector";

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [employeeNumber, setEmployeeNumber] = useState("");

  const { cart, addToCart, total, clearCart } = useCart();

  useEffect(() => {
    api.get("/restaurants").then(res => setRestaurants(res.data));
  }, []);

  const placeOrder = async () => {
    const items: any = {};

    cart.forEach(c => {
      items[c.menuItemId] = c.quantity;
    });

    try {
      await api.post("/orders/place", null, {
        params: { employeeNumber, items }
      });

      alert("Order placed!");
      clearCart();
    } catch {
      alert("Order failed");
    }
  };

  return (
    <div style={{ display: "flex", gap: "40px" }}>
      
      {/* LEFT SIDE - MENU */}
      <div>
        <h2>Restaurants</h2>

        <EmployeeSelector onSelect={setEmployeeNumber} />

        {restaurants.map(r => (
          <div key={r.id}>
            <h3>{r.name}</h3>

            {r.menuItems.map(m => (
              <div key={m.id}>
                {m.name} - R{m.price}
                <button onClick={() =>
                  addToCart({
                    menuItemId: m.id,
                    name: m.name,
                    price: m.price,
                    quantity: 1
                  })
                }>
                  Add
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* RIGHT SIDE - CART */}
      <div>
        <h2>Cart</h2>

        {cart.map(item => (
          <div key={item.menuItemId}>
            {item.name} x {item.quantity} = R{item.price * item.quantity}
          </div>
        ))}

        <h3>Total: R{total}</h3>

        <button onClick={placeOrder}>Place Order</button>
      </div>
    </div>
  );
}