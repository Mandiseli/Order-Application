using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Order_App.Data;

namespace Order_App
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();

            var connectionString = "Server=127.0.0.1;Database=CafeteriaDb;User=root;Password=10May1989;TreatTinyAsBoolean=false;";

            optionsBuilder.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));

            return new ApplicationDbContext(optionsBuilder.Options);
        }
    }
}