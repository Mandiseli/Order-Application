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

            db.SaveChanges();
        }

        if (!db.Users.Any())
        {
            db.Users.AddRange(
                new User
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = "Admin"
                },
                new User
                {
                    Username = "manager",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("manager123"),
                    Role = "Manager"
                },
                new User
                {
                    Username = "sipho",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("employee123"),
                    Role = "Employee",
                    EmployeeNumber = "EMP001"
                },
                new User
                {
                    Username = "ayanda",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("employee123"),
                    Role = "Employee",
                    EmployeeNumber = "EMP002"
                },
                new User
                {
                    Username = "thabo",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("employee123"),
                    Role = "Employee",
                    EmployeeNumber = "EMP003"
                }
            );

            db.SaveChanges();
        }
    }
}