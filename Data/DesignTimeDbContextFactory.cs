using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Order_App;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<Order_App.Data.ApplicationDbContext>
{
    public Order_App.Data.ApplicationDbContext CreateDbContext(string[] args)
    {
        Env.Load();

        var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("DB_CONNECTION is required for EF Core design-time operations.");

        var optionsBuilder = new DbContextOptionsBuilder<Order_App.Data.ApplicationDbContext>();
        optionsBuilder.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 0)));

        return new Order_App.Data.ApplicationDbContext(optionsBuilder.Options);
    }
}
