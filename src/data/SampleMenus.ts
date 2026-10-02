// import { useState } from "react";
// import type { CartItem } from "../types/cart";

// export function useCart() {
//   const [cart, setCart] = useState<CartItem[]>([]);

//   const addToCart = (item: CartItem) => {
//     setCart(prev => {
//       const existing = prev.find(i => i.menuItemId === item.menuItemId);
//       if (existing) {
//         return prev.map(i =>
//           i.menuItemId === item.menuItemId
//             ? { ...i, quantity: i.quantity + 1 }
//             : i
//         );
//       }
//       return [...prev, item];
//     });
//   };

//   const removeFromCart = (id: number) => {
//     setCart(prev => prev.filter(i => i.menuItemId !== id));
//   };

//   const updateQuantity = (id: number, qty: number) => {
//     setCart(prev =>
//       prev.map(i =>
//         i.menuItemId === id ? { ...i, quantity: qty } : i
//       )
//     );
//   };

//   const clearCart = () => setCart([]);

//   const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

//   return {
//     cart,
//     addToCart,
//     removeFromCart,
//     updateQuantity,
//     clearCart,
//     total
//   };
// }

export interface SampleMenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
}

const defaultMenu: SampleMenuItem[] = [
  {
    id: 1,
    name: "Chicken Burger",
    description: "Grilled chicken burger with lettuce and sauce",
    price: 65,
  },
  {
    id: 2,
    name: "Beef Burger",
    description: "Beef burger with cheese and fresh vegetables",
    price: 75,
  },
  {
    id: 3,
    name: "Chicken Wrap",
    description: "Grilled chicken wrap with fresh salad",
    price: 60,
  },
  {
    id: 4,
    name: "Chips",
    description: "Crispy golden fries",
    price: 30,
  },
  {
    id: 5,
    name: "Soft Drink",
    description: "Cold soft drink",
    price: 20,
  },
];

export const getSampleMenu = (
  restaurantName: string
): SampleMenuItem[] => {
  const name = restaurantName.toLowerCase();

  if (name.includes("spur")) {
    return [
      {
        id: 1,
        name: "Spur Burger",
        description: "Classic Spur-style beef burger",
        price: 89,
      },
      {
        id: 2,
        name: "Chicken Schnitzel",
        description: "Chicken schnitzel with chips",
        price: 99,
      },
      {
        id: 3,
        name: "Spur Wings",
        description: "Spicy grilled chicken wings",
        price: 85,
      },
      {
        id: 4,
        name: "Chips",
        description: "Crispy golden chips",
        price: 35,
      },
    ];
  }

  if (name.includes("kfc")) {
    return [
      {
        id: 1,
        name: "Chicken Burger",
        description: "Crispy chicken burger",
        price: 55,
      },
      {
        id: 2,
        name: "Chicken Wrap",
        description: "Crispy chicken wrap",
        price: 49,
      },
      {
        id: 3,
        name: "Chicken Wings",
        description: "Crispy chicken wings",
        price: 65,
      },
      {
        id: 4,
        name: "Chips",
        description: "Golden fries",
        price: 30,
      },
    ];
  }

  if (name.includes("mcdonald")) {
    return [
      {
        id: 1,
        name: "Big Mac",
        description: "Classic Big Mac burger",
        price: 59,
      },
      {
        id: 2,
        name: "McChicken",
        description: "Crispy chicken burger",
        price: 55,
      },
      {
        id: 3,
        name: "Chicken Wrap",
        description: "Chicken wrap with fresh salad",
        price: 49,
      },
      {
        id: 4,
        name: "Fries",
        description: "McDonald's fries",
        price: 29,
      },
    ];
  }

  return defaultMenu;
};