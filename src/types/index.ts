export interface Employee {
  id: number;
  name: string;
  employeeNumber: string;
  balance: number;
  lastDepositMonth?: string;
}

export interface GeoRestaurant {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  imageUrl?: string;
}

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
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

export interface Transaction {
  id: number;
  employeeId: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}