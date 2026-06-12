using Order_App.Models;

namespace Order_App.Data;

public static class SeedData
{
    public static void EnsureSeeded(ApplicationDbContext db)
    {
        if (db.Employees.Any()) return;

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
}