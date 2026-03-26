using Order_App.Data;
using Order_App.Models;

namespace Order_App.Data
{
    public static class SeedData
    {
        public static void EnsureSeeded(ApplicationDbContext db)
        {
            if (!db.Employees.Any())
            {
                db.Employees.AddRange(
                    new Employee { Name = "Sipho Dlamini", EmployeeNumber = "EMP001", Balance = 0 },
                    new Employee { Name = "Lerato Mokoena", EmployeeNumber = "EMP002", Balance = 0 }
                );
            }

            if (!db.Restaurants.Any())
            {
                var mcd = new Restaurant { Name = "McDonald's Braamfontein", LocationDescription = "Jan Smuts Avenue", ContactNumber = "011-000-0000" };
                var kfc = new Restaurant { Name = "KFC Braamfontein", LocationDescription = "Station Street", ContactNumber = "011-111-1111" };
                db.Restaurants.AddRange(mcd, kfc);
                db.SaveChanges();

                db.MenuItems.AddRange(
                    new MenuItem { RestaurantId = mcd.Id, Name = "Big Mac Meal", Description = "Burger + fries + drink", Price = 85 },
                    new MenuItem { RestaurantId = mcd.Id, Name = "McChicken Meal", Description = "Chicken burger meal", Price = 79 },
                    new MenuItem { RestaurantId = kfc.Id, Name = "Streetwise Two", Description = "2 pcs chicken + chips", Price = 60 },
                    new MenuItem { RestaurantId = kfc.Id, Name = "Zinger Burger Meal", Description = "Burger + chips + drink", Price = 82 }
                );
            }

            db.SaveChanges();
        }
    }
}
