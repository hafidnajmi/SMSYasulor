using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PPI.IM.Application.Services;
using PPI.IM.Infrastructure.Config;
using PPI.IM.Infrastructure.Data;
using PPI.IM.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJs",
        policy => policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Configure Dependency Injection (Reusing Desktop Infrastructure)
// 1. Load local developer settings if present (git-ignored for security)
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

var candidateLocalConfigs = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), "appsettings.Local.json"),
    Path.Combine(AppContext.BaseDirectory, "appsettings.Local.json"),
    Path.Combine(AppContext.BaseDirectory, "..", "appsettings.Local.json"),
    Path.Combine(AppContext.BaseDirectory, "..", "..", "appsettings.Local.json"),
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "appsettings.Local.json")
};
foreach (var candidate in candidateLocalConfigs)
{
    if (File.Exists(candidate))
    {
        builder.Configuration.AddJsonFile(Path.GetFullPath(candidate), optional: true, reloadOnChange: true);
        break;
    }
}

var dbConfig = new DatabaseConfig();
builder.Configuration.GetSection("Database").Bind(dbConfig);

// 2. Support Dewa Cloud / PaaS Environment Variables (DATABASE_URL / POSTGRES_CONNECTION_STRING)
var rawCloudConn = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
    ?? Environment.GetEnvironmentVariable("Database__ConnectionString");

if (!string.IsNullOrWhiteSpace(rawCloudConn))
{
    if (rawCloudConn.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
        rawCloudConn.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(rawCloudConn);
        var userInfo = uri.UserInfo.Split(':');
        dbConfig.Server = uri.Host;
        dbConfig.Port = uri.Port > 0 ? uri.Port : 5432;
        dbConfig.Database = uri.AbsolutePath.TrimStart('/');
        if (userInfo.Length > 0 && !string.IsNullOrEmpty(userInfo[0])) dbConfig.Username = Uri.UnescapeDataString(userInfo[0]);
        if (userInfo.Length > 1 && !string.IsNullOrEmpty(userInfo[1])) dbConfig.Password = Uri.UnescapeDataString(userInfo[1]);
        dbConfig.SslMode = "Prefer";
    }
    else
    {
        dbConfig.ConnectionString = rawCloudConn;
    }
}

Console.WriteLine($"[Startup] Active Database Target: {dbConfig.Server}:{dbConfig.Port} (Database: {dbConfig.Database}, User: {dbConfig.Username})");
builder.Services.AddSingleton(dbConfig);

builder.Services.AddSingleton<DbConnectionFactory>();
builder.Services.AddSingleton<DbInitializer>();
// Repositories
builder.Services.AddSingleton<UserRepository>();
builder.Services.AddSingleton<ImRepository>();
builder.Services.AddSingleton<LockRepository>();
builder.Services.AddSingleton<AssigneeRepository>();
// Services
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<QcCalculationService>();
builder.Services.AddSingleton<IUpLockService, UpLockService>();

var app = builder.Build();

// Run DB initialization and migrations
try
{
    using var scope = app.Services.CreateScope();
    var dbInit = scope.ServiceProvider.GetRequiredService<DbInitializer>();
    await dbInit.InitializeAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"[DB Error] Failed to initialize DB: {ex.Message}");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowNextJs");
// app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
