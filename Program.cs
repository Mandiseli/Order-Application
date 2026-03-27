
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// EF Core + MySQL
var cs = builder.Configuration.GetConnectionString("DefaultConnection")!;
builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseMySql(cs, ServerVersion.AutoDetect(cs)));

// DI
builder.Services.AddScoped<IDepositService, DepositService>();
builder.Services.AddScoped<IOrderService, OrderService>();

// CORS for React dev server
builder.Services.AddCors(o => o.AddPolicy("client",
    p => p.AllowAnyHeader().AllowAnyMethod()
          .WithOrigins("http://localhost:5173", "https://localhost:5173")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("client");
app.MapControllers();

// Auto-migrate & seed dev data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();
    SeedData.EnsureSeeded(db);
}

app.Run();
