export interface Employee {
  id: number;
  name: string;
  employeeNumber: string;
  balance: number;
}

export interface Restaurant {
  id: number;
  name: string;
  locationDescription: string;
  contactNumber: string;
  menuItems: MenuItem[];
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  restaurantId: number;
}

export interface OrderItem {
  menuItemId: number;
  quantity: number;
  unitPriceAtTimeOfOrder: number;
}

export interface Order {
  id: number;
  totalAmount: number;
  status: string;
  items: OrderItem[];
}