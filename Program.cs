using System.Text;
using System.Text.Json.Serialization;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Order_App.Data;
using Order_App.Hubs;
using Order_App.Services;
using Serilog;

//
// Load environment variables from .env
//
Env.Load();

//
// Create builder
//
var builder = WebApplication.CreateBuilder(args);

//
// ------------------------------------------------------------
// Serilog
// ------------------------------------------------------------
//
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        "Logs/order-app-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30)
    .CreateLogger();

builder.Host.UseSerilog();

//
// ------------------------------------------------------------
// Controllers + JSON
// ------------------------------------------------------------
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
// ------------------------------------------------------------
// Swagger
// ------------------------------------------------------------
//
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

//
// ------------------------------------------------------------
// SignalR
// ------------------------------------------------------------
//
builder.Services.AddSignalR();

//
// ------------------------------------------------------------
// Database
// ------------------------------------------------------------
//
var connectionString =
    Environment.GetEnvironmentVariable("DB_CONNECTION")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Database connection string is missing. " +
        "Configure DB_CONNECTION in .env or " +
        "DefaultConnection in appsettings.json.");
}

//
// Never print the real database password.
//
var safeConnectionString = connectionString;

var passwordIndex = safeConnectionString.IndexOf(
    "Password=",
    StringComparison.OrdinalIgnoreCase);

if (passwordIndex >= 0)
{
    var passwordEnd = safeConnectionString.IndexOf(
        ';',
        passwordIndex);

    if (passwordEnd == -1)
    {
        passwordEnd = safeConnectionString.Length;
    }

    safeConnectionString =
        safeConnectionString.Substring(
            0,
            passwordIndex)
        + "Password=***"
        + safeConnectionString.Substring(passwordEnd);
}

Log.Information(
    "Database connection configured: {ConnectionString}",
    safeConnectionString);

//
// ------------------------------------------------------------
// Entity Framework Core + MySQL
// ------------------------------------------------------------
//
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseMySql(
        connectionString,
        new MySqlServerVersion(
            new Version(8, 0, 0)));
});

//
// ------------------------------------------------------------
// Application Services
// ------------------------------------------------------------
//
builder.Services.AddScoped<IDepositService, DepositService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<AuthService>();

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmsService, SmsService>();

builder.Services.AddHttpClient<IGeoapifyService, GeoapifyService>();

//
// ------------------------------------------------------------
// JWT
// ------------------------------------------------------------
//
var jwtKey =
    Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "JWT key is missing. " +
        "Configure JWT_KEY in .env or Jwt:Key in appsettings.json.");
}

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "JWT key must be at least 32 bytes long.");
}

var jwtSigningKey =
    new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(jwtKey));

//
// ------------------------------------------------------------
// Authentication
// ------------------------------------------------------------
//
builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,

                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1),

                ValidateIssuerSigningKey = true,
                IssuerSigningKey = jwtSigningKey,

                RoleClaimType =
                    System.Security.Claims.ClaimTypes.Role,

                NameClaimType =
                    System.Security.Claims.ClaimTypes.Name
            };

        //
        // ----------------------------------------------------
        // IMPORTANT:
        // SignalR WebSockets cannot normally send the JWT
        // through the Authorization header during the initial
        // WebSocket handshake.
        //
        // SignalR therefore sends the token as:
        //
        // /orderHub?access_token=...
        //
        // This code extracts it.
        // ----------------------------------------------------
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken =
                    context.Request.Query["access_token"];

                var path =
                    context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken)
                    && path.StartsWithSegments("/orderHub"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },

            OnAuthenticationFailed = context =>
            {
                Log.Warning(
                    context.Exception,
                    "JWT authentication failed.");

                return Task.CompletedTask;
            }
        };
    });

//
// ------------------------------------------------------------
// Authorization
// ------------------------------------------------------------
//
builder.Services.AddAuthorization();

//
// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------
//
builder.Services.AddCors(options =>
{
    options.AddPolicy("client", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

//
// ------------------------------------------------------------
// Build application
// ------------------------------------------------------------
//
var app = builder.Build();

//
// ------------------------------------------------------------
// Serilog HTTP logging
// ------------------------------------------------------------
//
app.UseSerilogRequestLogging();

//
// ------------------------------------------------------------
// Swagger
// ------------------------------------------------------------
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
// ------------------------------------------------------------
// Routing
// ------------------------------------------------------------
//
app.UseRouting();

//
// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------
//
app.UseCors("client");

//
// ------------------------------------------------------------
// Authentication
// ------------------------------------------------------------
//
app.UseAuthentication();

//
// ------------------------------------------------------------
// Authorization
// ------------------------------------------------------------
//
app.UseAuthorization();

//
// ------------------------------------------------------------
// Controllers
// ------------------------------------------------------------
//
app.MapControllers();

//
// ------------------------------------------------------------
// SignalR Hub
// ------------------------------------------------------------
//
app.MapHub<OrderHub>("/orderHub");

//
// ------------------------------------------------------------
// Root endpoint
// ------------------------------------------------------------
//
app.MapGet("/", () =>
{
    return Results.Ok(new
    {
        message = "Order API is running.",
        swagger = "/swagger",
        signalR = "/orderHub",
        status = "OK",
        timestamp = DateTime.UtcNow
    });
});

//
// ------------------------------------------------------------
// Health endpoint
// ------------------------------------------------------------
//
app.MapGet("/health", () =>
{
    return Results.Ok(new
    {
        status = "Healthy",
        timestamp = DateTime.UtcNow
    });
});

//
// ------------------------------------------------------------
// Database migration + seed
// ------------------------------------------------------------
//
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db =
            scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

        Log.Information("Checking database...");

        db.Database.Migrate();

        Log.Information(
            "Database migrations completed successfully.");

        SeedData.EnsureSeeded(db);

        Log.Information(
            "Database seed completed successfully.");
    }
    catch (Exception ex)
    {
        Log.Fatal(
            ex,
            "Database initialization failed.");

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
        // The API depends on the database.
        // Stop startup if database initialization fails.
        //
        throw;
    }
}

//
// ------------------------------------------------------------
// Start application
// ------------------------------------------------------------
//
try
{
    Log.Information(
        "Order Application API starting...");

    Log.Information(
        "SignalR hub available at /orderHub");

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