import type { MenuItem } from "../types";

const item = (
  id: number,
  name: string,
  description: string,
  price: number
): MenuItem => ({ id, name, description, price, restaurantId: 0, isAvailable: true });

export const getSampleMenu = (restaurantName: string): MenuItem[] => {
  const name = restaurantName.toLowerCase();

  if (name.includes("nando")) {
    return [
      item(1, "Quarter Chicken Meal", "Chicken, chips and drink", 95),
      item(2, "Chicken Burger Meal", "Burger, chips and drink", 85),
      item(3, "Full Chicken", "Flame-grilled full chicken", 210)
    ];
  }

  if (name.includes("wimpy")) {
    return [
      item(1, "Classic Burger", "Beef burger with chips", 89),
      item(2, "Breakfast Plate", "Eggs, bacon, toast and chips", 79),
      item(3, "Chicken Schnitzel", "Chicken schnitzel with chips", 105)
    ];
  }

  if (name.includes("kota")) {
    return [
      item(1, "Classic Kota", "Kota with chips, cheese and polony", 45),
      item(2, "Full House Kota", "Kota with egg, cheese, russian and chips", 75),
      item(3, "Kota Combo", "Kota with chips and drink", 90)
    ];
  }

  return [
    item(1, "Chicken Meal", "Chicken, chips and drink", 90),
    item(2, "Beef Burger Meal", "Burger, chips and drink", 85),
    item(3, "Wrap Combo", "Wrap, chips and drink", 80)
  ];
};

export { getSampleMenu as getSampleMenus };
