import { useState } from "react";
import type { CartItem } from "../types/cart";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map(i =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.menuItemId !== id));
  };

  const updateQuantity = (id: number, qty: number) => {
    setCart(prev =>
      prev.map(i =>
        i.menuItemId === id ? { ...i, quantity: qty } : i
      )
    );
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total
  };
}