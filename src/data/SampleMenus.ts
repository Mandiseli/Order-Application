import type { MenuItem } from "../types";

export const getSampleMenu = (restaurantName: string): MenuItem[] => {
  const name = restaurantName.toLowerCase();

  if (name.includes("nando")) {
    return [
      { id: 1, name: "Quarter Chicken Meal", description: "Chicken, chips and drink", price: 95 },
      { id: 2, name: "Chicken Burger Meal", description: "Burger, chips and drink", price: 85 },
      { id: 3, name: "Full Chicken", description: "Flame-grilled full chicken", price: 210 }
    ];
  }

  if (name.includes("wimpy")) {
    return [
      { id: 1, name: "Classic Burger", description: "Beef burger with chips", price: 89 },
      { id: 2, name: "Breakfast Plate", description: "Eggs, bacon, toast and chips", price: 79 },
      { id: 3, name: "Chicken Schnitzel", description: "Chicken schnitzel with chips", price: 105 }
    ];
  }

  if (name.includes("kota")) {
    return [
      { id: 1, name: "Classic Kota", description: "Kota with chips, cheese and polony", price: 45 },
      { id: 2, name: "Full House Kota", description: "Kota with egg, cheese, russian and chips", price: 75 },
      { id: 3, name: "Kota Combo", description: "Kota with chips and drink", price: 90 }
    ];
  }

  return [
    { id: 1, name: "Chicken Meal", description: "Chicken, chips and drink", price: 90 },
    { id: 2, name: "Beef Burger Meal", description: "Burger, chips and drink", price: 85 },
    { id: 3, name: "Wrap Combo", description: "Wrap, chips and drink", price: 80 }
  ];
};