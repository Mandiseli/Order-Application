using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Manager")]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EmployeesController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/employees
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
    {
        return await _context.Employees
            .OrderBy(e => e.Name)
            .ToListAsync();
    }

    // GET: api/employees/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Employee>> GetEmployee(int id)
    {
        var employee = await _context.Employees.FindAsync(id);

        if (employee == null)
            return NotFound();

        return employee;
    }

    // POST: api/employees
    //[HttpPost]
    //public async Task<ActionResult<Employee>> CreateEmployee(Employee employee)
    //{
    //if (string.IsNullOrWhiteSpace(employee.EmployeeNumber))
    //return BadRequest("Employee number required");

    //_context.Employees.Add(employee);
    // await _context.SaveChangesAsync();

    //return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, employee);
    //}

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<Employee>> PostEmployee(
    Employee employee)
    {
        var exists = await _context.Employees
            .AnyAsync(e =>
                e.EmployeeNumber == employee.EmployeeNumber);

        if (exists)
        {
            return Conflict(
                "Employee number already exists");
        }

        employee.Name = employee.Name.Trim();
        employee.EmployeeNumber = employee.EmployeeNumber.Trim();
        employee.Email = string.IsNullOrWhiteSpace(employee.Email) ? null : employee.Email.Trim();
        employee.PhoneNumber = string.IsNullOrWhiteSpace(employee.PhoneNumber) ? null : employee.PhoneNumber.Trim();
        if (employee.Email != null && !System.Net.Mail.MailAddress.TryCreate(employee.Email, out _))
            return BadRequest("A valid employee email address is required.");

        employee.Balance = 0;

        employee.LastDepositMonth =
            new DateTime(
                DateTime.UtcNow.Year,
                DateTime.UtcNow.Month,
                1);

        _context.Employees.Add(employee);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetEmployee),
            new { id = employee.Id },
            employee);
    }

    // DELETE: api/employees/{id}
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var emp = await _context.Employees.FindAsync(id);

        if (emp == null)
            return NotFound();

        _context.Employees.Remove(emp);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}