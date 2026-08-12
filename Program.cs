using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using Order_App.Hubs;
using Serilog;
using DotNetEnv;

//
// Load environment variables from .env
//
Env.Load();

//
// Create builder
//
var builder = WebApplication.CreateBuilder(args);

//
// Serilog
//
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(
        "Logs/order-app-.log",
        rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

//
// Controllers + JSON configuration
//
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            ReferenceHandler.IgnoreCycles;

        options.JsonSerializerOptions.WriteIndented = true;
    });

//
// Swagger
//
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

//
// SignalR
//
builder.Services.AddSignalR();

//
// Database connection
//
// First try DB_CONNECTION from .env.
// If it does not exist, use DefaultConnection from appsettings.json.
//
var cs =
    Environment.GetEnvironmentVariable("DB_CONNECTION")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(cs))
{
    throw new Exception(
        "Database connection string is missing. " +
        "Please configure DB_CONNECTION in .env " +
        "or DefaultConnection in appsettings.json.");
}

//
// Do NOT print the actual password.
//
var safeConnectionString = cs;

if (safeConnectionString.Contains("Password=", StringComparison.OrdinalIgnoreCase))
{
    var passwordStart = safeConnectionString.IndexOf(
        "Password=",
        StringComparison.OrdinalIgnoreCase);

    var passwordEnd = safeConnectionString.IndexOf(
        ';',
        passwordStart);

    if (passwordEnd == -1)
    {
        passwordEnd = safeConnectionString.Length;
    }

    safeConnectionString =
        safeConnectionString.Substring(0, passwordStart)
        + "Password=***"
        + safeConnectionString.Substring(passwordEnd);
}

Console.WriteLine(
    $"Database connection configured: {safeConnectionString}");

//
// Entity Framework Core + MySQL
//
// Explicitly specify MySQL 8 instead of AutoDetect.
// This prevents EF Core from trying to connect during
// server-version detection.
//
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseMySql(
        cs,
        new MySqlServerVersion(new Version(8, 0, 0)));
});

//
// Dependency Injection
//
builder.Services.AddScoped<IDepositService, DepositService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<AuthService>();

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmsService, SmsService>();

builder.Services.AddHttpClient<IGeoapifyService, GeoapifyService>();

//
// JWT configuration
//
// First try JWT_KEY from .env.
// Otherwise use Jwt:Key from appsettings.json.
//
var jwtKey =
    Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new Exception(
        "JWT key is missing. " +
        "Please configure JWT_KEY in .env " +
        "or Jwt:Key in appsettings.json.");
}

//
// JWT Authentication
//
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey))
            };
    });

//
// CORS
//
// Allows the React/Vite frontend to communicate with
// the ASP.NET Core backend.
//
builder.Services.AddCors(options =>
{
    options.AddPolicy("client", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                return origin.StartsWith(
                    "http://localhost:",
                    StringComparison.OrdinalIgnoreCase)
                    ||
                    origin.StartsWith(
                        "https://localhost:",
                        StringComparison.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

//
// Build application
//
var app = builder.Build();

//
// Serilog HTTP request logging
//
app.UseSerilogRequestLogging();

//
// Swagger
//
// Swagger is intentionally enabled regardless of
// Development/Production environment.
//
app.UseSwagger();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint(
        "/swagger/v1/swagger.json",
        "Order Application API v1");

    options.RoutePrefix = "swagger";
});

//
// Routing
//
app.UseRouting();

//
// CORS
//
app.UseCors("client");

//
// Authentication
//
app.UseAuthentication();

//
// Authorization
//
app.UseAuthorization();

//
// Controllers
//
app.MapControllers();

//
// SignalR
//
app.MapHub<OrderHub>("/orderHub");

//
// Root endpoint
//
app.MapGet("/", () =>
    Results.Ok(new
    {
        message = "Order API is running...",
        swagger = "/swagger",
        status = "OK"
    }));

//
// Database migration and seed
//
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db =
            scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

        Console.WriteLine("Checking database...");

        db.Database.Migrate();

        Console.WriteLine(
            "Database migrations completed successfully.");

        SeedData.EnsureSeeded(db);

        Console.WriteLine(
            "Database seed completed successfully.");
    }
    catch (Exception ex)
    {
        Log.Error(
            ex,
            "An error occurred while initializing the database.");

        Console.WriteLine(
            "DATABASE INITIALIZATION ERROR:");

        Console.WriteLine(ex.Message);

        if (ex.InnerException != null)
        {
            Console.WriteLine(
                "INNER EXCEPTION:");

            Console.WriteLine(
                ex.InnerException.Message);
        }

        //
        // Stop the application because the API depends
        // on the database.
        //
        throw;
    }
}

//
// Start application
//
try
{
    Log.Information("Order Application API starting...");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(
        ex,
        "Order Application API terminated unexpectedly.");
}
finally
{
    Log.CloseAndFlush();
}