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
  menuItemCode?: number;
  restaurantName?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  restaurantId: number;
  isAvailable?: boolean;
}

export interface Restaurant {
  id: number;
  name: string;
  locationDescription: string;
  contactNumber: string;
  imageUrl?: string;
  menuItems: MenuItem[];
}

export interface OrderItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPriceAtTimeOfOrder: number;
}

export interface Order {
  id: number;
  employeeId?: number;
  employeeName: string;
  employeeNumber: string;
  driverId?: number | string | null;
  driverName?: string | null;
  totalAmount: number;
  status: string;
  estimatedDeliveryTime?: string | null;
  orderDate: string;
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

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
