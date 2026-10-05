using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Services;

// Enable Legacy Timestamp Behavior for PostgreSQL Npgsql
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Load local developer settings if present (git-ignored for security)
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Fix: Dewacloud may run app from bin/Debug/net10.0/ OR from the project root.
// Probe multiple candidate locations until we find where wwwroot actually lives.
if (!Directory.Exists(builder.Environment.WebRootPath))
{
    var candidateRoots = new[]
    {
        AppContext.BaseDirectory,                                               // already here
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..")),        // 1 level up
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../..")),     // 2 levels up
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../..")),  // 3 levels up (bin/Debug/net10.0 → project)
        Directory.GetCurrentDirectory(),                                        // cwd (dotnet run from project root)
    };

    foreach (var candidate in candidateRoots)
    {
        var wwwrootPath = Path.Combine(candidate, "wwwroot");
        if (Directory.Exists(wwwrootPath))
        {
            Console.WriteLine($"[Startup] Found wwwroot at: {wwwrootPath}");
            builder.WebHost.UseContentRoot(candidate);
            builder.WebHost.UseWebRoot(wwwrootPath);
            break;
        }
    }
}

if (builder.Environment.IsDevelopment())
{
    builder.WebHost.UseStaticWebAssets();
}

// Listen on appropriate ports for Local Development vs Dewa Cloud Production
var envPort = Environment.GetEnvironmentVariable("PORT");
var configuredUrls = builder.Configuration["urls"] ?? builder.Configuration["ASPNETCORE_URLS"];
if (!string.IsNullOrEmpty(envPort))
{
    builder.WebHost.UseUrls($"http://*:{envPort}");
}
else if (!string.IsNullOrEmpty(configuredUrls))
{
    builder.WebHost.UseUrls(configuredUrls);
}
else if (builder.Environment.IsDevelopment())
{
    builder.WebHost.UseUrls("http://localhost:5182");
}
else
{
    // Dewacloud: NGINX handles port 80/443 externally, Kestrel listens on 8080
    builder.WebHost.UseUrls("http://*:8080");
}

// Add services to the container.
builder.Services.AddControllersWithViews();

// Connection string reads dynamically from:
// 1. Environment variable 'DATABASE_URL' / 'POSTGRES_CONNECTION_STRING' (cloud PaaS)
// 2. Environment variable 'ConnectionStrings__DefaultConnection'
// 3. appsettings.Local.json (git-ignored for local developer machines)
// 4. appsettings.Production.json / appsettings.json
string? rawConnStr = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

// Support PostgreSQL URI format (postgres://user:pass@host:port/db) if provided by PaaS
string connectionString;
if (!string.IsNullOrWhiteSpace(rawConnStr) && 
    (rawConnStr.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
     rawConnStr.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)))
{
    var uri = new Uri(rawConnStr);
    var userInfo = uri.UserInfo.Split(':');
    var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "";
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var database = uri.AbsolutePath.TrimStart('/');
    var port = uri.Port > 0 ? uri.Port : 5432;
    connectionString = $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};";
}
else
{
    connectionString = rawConnStr ?? string.Empty;
}

if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("YOUR_"))
{
    throw new InvalidOperationException(
        "CRITICAL SECURITY: Database connection string is not configured. " +
        "Never commit real database credentials to Git! " +
        "Please provide the connection string via Environment Variable 'ConnectionStrings__DefaultConnection' " +
        "(in your Dewa Cloud / hosting environment) or inside 'appsettings.Local.json' (git-ignored) for local development.");
}

builder.Services.AddDbContext<UpmsDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    }));

// Configure Anti-Forgery Cookie for Reverse Proxy / NGINX compatibility
builder.Services.AddAntiforgery(options =>
{
    options.Cookie.Name = "UPMS.Antiforgery";
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

// Cookie Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.AccessDeniedPath = "/Account/AccessDenied";

        options.ExpireTimeSpan = TimeSpan.FromHours(4);
        options.SlidingExpiration = true;
        options.Cookie.MaxAge = TimeSpan.FromHours(8);

        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.Name = "UPMS.Auth";
    });

// AUTH-006: Rate limiting (IP-based, using AspNetCoreRateLimit)
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.EnableEndpointRateLimiting = true;
    options.StackBlockedRequests = false;
    options.HttpStatusCode = 429;
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "POST:/Account/Login",
            Period = "15m",
            Limit = 20  // max 20 login attempts per 15 minutes per IP
        }
    };
});
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
builder.Services.AddInMemoryRateLimiting();

// Custom Application Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISparepartService, SparepartService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IExcelExportService, ExcelExportService>();

// Scheduled Auto-Alert background service
// FAST-frequency parts: alert every 14 days (2 weeks)
// SLOW-frequency parts: alert every 30 days (1 month)
builder.Services.AddHostedService<AlertSchedulerService>();

var app = builder.Build();

var forwardedOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
};
forwardedOptions.KnownIPNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);

// Configure the HTTP request pipeline.
app.UseDeveloperExceptionPage();

app.UseStaticFiles();

app.UseRouting();

// AUTH-006: IP Rate Limiting middleware (must be before auth)
app.UseIpRateLimiting();

app.UseAuthentication();

// Real-Time Claims & RBAC Sync Middleware:
// Instantly updates logged-in user permissions from PostgreSQL on every request without requiring manual re-login
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var username = context.User.Identity.Name;
        if (!string.IsNullOrEmpty(username))
        {
            var db = context.RequestServices.GetRequiredService<UpmsDbContext>();
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
            if (user != null && user.IsActive)
            {
                var authService = context.RequestServices.GetRequiredService<IAuthService>();
                context.User = authService.CreateClaimsPrincipal(user);
            }
            else if (user != null && !user.IsActive)
            {
                await Microsoft.AspNetCore.Authentication.AuthenticationHttpContextExtensions.SignOutAsync(
                    context,
                    Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme);
                context.Response.Redirect("/Account/Login");
                return;
            }
        }
    }
    await next();
});

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Dashboard}/{action=Index}/{id?}");

// Seed default admin user and ensure required tables asynchronously on background startup
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(2000); // 2 second grace delay for DB container networking
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<UpmsDbContext>();
        await DbSeeder.SeedDefaultAdminAsync(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup Warning] Background DbSeeder: {ex.Message}");
    }
});

// Load saved timezone setting from App_Settings on startup
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(3000); // wait for DB to be ready
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<UpmsDbContext>();
        var setting = await db.AppSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SettingKey == "app_timezone");
        if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingValue))
        {
            bool applied = UPMS.Web.Helpers.TimeHelper.SetTimezone(setting.SettingValue);
            Console.WriteLine(applied
                ? $"[Startup] Timezone loaded from DB: {setting.SettingValue}"
                : $"[Startup Warning] Invalid timezone ID in DB: {setting.SettingValue}, using default WIB.");
        }
        else
        {
            Console.WriteLine("[Startup] No timezone setting found in DB, using default WIB (Asia/Jakarta).");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup Warning] Timezone load failed: {ex.Message}");
    }
});

app.Run();
// Trigger full process restart for DbSeeder column drop migration
