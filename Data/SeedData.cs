using Microsoft.EntityFrameworkCore;
using Order_App.Models;

namespace Order_App.Data;

public static class SeedData
{
    public static void EnsureSeeded(ApplicationDbContext db)
    {
        // =========================================================
        // SEED EMPLOYEES
        // =========================================================

        var employees = new[]
        {
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
            },
            new Employee
            {
                Name = "New Employee",
                EmployeeNumber = "EMP004",
                Balance = 0
            }
        };

        foreach (var employee in employees)
        {
            var existingEmployee = db.Employees
                .FirstOrDefault(e =>
                    e.EmployeeNumber.ToLower() ==
                    employee.EmployeeNumber.ToLower());

            if (existingEmployee == null)
            {
                db.Employees.Add(employee);
            }
        }

        db.SaveChanges();

        // =========================================================
        // READ INITIAL USER PASSWORDS
        // =========================================================

        var adminPassword = RequiredSecret("SEED_ADMIN_PASSWORD");
        var managerPassword = RequiredSecret("SEED_MANAGER_PASSWORD");
        var employeePassword = RequiredSecret("SEED_EMPLOYEE_PASSWORD");

        // =========================================================
        // SEED ADMIN
        // =========================================================

        CreateUserIfMissing(
            db,
            username: "admin",
            password: adminPassword,
            role: "Admin",
            employeeNumber: null);

        // =========================================================
        // SEED MANAGER
        // =========================================================

        CreateUserIfMissing(
            db,
            username: "manager",
            password: managerPassword,
            role: "Manager",
            employeeNumber: null);

        // =========================================================
        // SEED EMPLOYEES
        // =========================================================

        CreateUserIfMissing(
            db,
            username: "sipho",
            password: employeePassword,
            role: "Employee",
            employeeNumber: "EMP001");

        CreateUserIfMissing(
            db,
            username: "ayanda",
            password: employeePassword,
            role: "Employee",
            employeeNumber: "EMP002");

        CreateUserIfMissing(
            db,
            username: "thabo",
            password: employeePassword,
            role: "Employee",
            employeeNumber: "EMP003");

        // EMP004 intentionally has no user account.
        // This allows you to test the Signup functionality.

        db.SaveChanges();
    }

    // =============================================================
    // CREATE USER ONLY IF IT DOES NOT ALREADY EXIST
    // =============================================================

    private static void CreateUserIfMissing(
        ApplicationDbContext db,
        string username,
        string password,
        string role,
        string? employeeNumber)
    {
        var existingUser = db.Users
            .FirstOrDefault(u =>
                u.Username.ToLower() ==
                username.ToLower());

        if (existingUser != null)
            return;

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            EmployeeNumber = employeeNumber,
            RefreshToken = null,
            RefreshTokenExpiresAt = null
        };

        db.Users.Add(user);
    }

    // =============================================================
    // REQUIRED ENVIRONMENT SECRET
    // =============================================================

    private static string RequiredSecret(string name)
    {
        var value = Environment.GetEnvironmentVariable(name);

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"{name} is required when creating the initial users.");
        }

        return value;
    }
}