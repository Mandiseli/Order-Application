using Order_App.Models;

namespace Order_App.Data;

public static class SeedData
{
    public static void EnsureSeeded(ApplicationDbContext db)
    {
        if (!db.Employees.Any())
        {
            db.Employees.AddRange(
                new Employee
                {
                    Name = "Sipho Dlamini",
                    EmployeeNumber = "EMP001",
                    Balance = 1000
                },
                new Employee
                {
                    Name = "Ayanda Ndlovu",
                    EmployeeNumber = "EMP002",
                    Balance = 750
                },
                new Employee
                {
                    Name = "Thabo Mokoena",
                    EmployeeNumber = "EMP003",
                    Balance = 500
                }
            );
        }

        if (!db.Users.Any())
        {
            db.Users.AddRange(
                new User
                {
                    Username = "admin",
                    Password = "admin123",
                    Role = "Admin"
                },
                new User
                {
                    Username = "manager",
                    Password = "manager123",
                    Role = "Manager"
                },
                new User
                {
                    Username = "employee",
                    Password = "employee123",
                    Role = "Employee",
                    EmployeeNumber = "EMP001"
                }
            );
        }

        db.SaveChanges();
    }
}