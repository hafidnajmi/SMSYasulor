using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.StaticFiles;
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
string? discoveredWwwroot = null;
var candidateRoots = new[]
{
    AppContext.BaseDirectory,
    Directory.GetCurrentDirectory(),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..")),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../..")),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../..")),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../..")),
    "/var/www/webroot/ROOT",
    "/app"
};

foreach (var candidate in candidateRoots)
{
    var candidateWwwroot = Path.Combine(candidate, "wwwroot");
    if (Directory.Exists(candidateWwwroot))
    {
        discoveredWwwroot = candidateWwwroot;
        Console.WriteLine($"[Startup] Found wwwroot at: {discoveredWwwroot}");
        break;
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
    options.HeaderName = "RequestVerificationToken";
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

// Configure CORS for Next.js frontend / SPA
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins",
        policy => policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Configure IM Digital DI Services
var imDbConfig = new PPI.IM.Infrastructure.Config.DatabaseConfig();
builder.Configuration.GetSection("Database").Bind(imDbConfig);

// Dewa Cloud environment variables support
var rawCloudConn = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
    ?? Environment.GetEnvironmentVariable("Database__ConnectionString");

if (!string.IsNullOrWhiteSpace(rawCloudConn))
{
    if (rawCloudConn.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
        rawCloudConn.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(rawCloudConn);
        var userInfo = uri.UserInfo.Split(':');
        imDbConfig.Server = uri.Host;
        imDbConfig.Port = uri.Port > 0 ? uri.Port : 5432;
        imDbConfig.Database = "IM-Digital";
        if (userInfo.Length > 0 && !string.IsNullOrEmpty(userInfo[0])) imDbConfig.Username = Uri.UnescapeDataString(userInfo[0]);
        if (userInfo.Length > 1 && !string.IsNullOrEmpty(userInfo[1])) imDbConfig.Password = Uri.UnescapeDataString(userInfo[1]);
        imDbConfig.SslMode = "Prefer";
    }
}

// Fallback to Dewa Cloud host if not running locally
if (string.IsNullOrWhiteSpace(imDbConfig.Server) || imDbConfig.Server == "YOUR_DB_HOST")
{
    imDbConfig.Server = "node79737-sms-yasulor.user.cloudjkt01.com";
    imDbConfig.Port = 5432;
    imDbConfig.Database = "IM-Digital";
    imDbConfig.Username = "webadmin";
    imDbConfig.SslMode = "Prefer";
}

// Inherit credentials from main connection string if not explicitly set
if (string.IsNullOrWhiteSpace(imDbConfig.Password) && !string.IsNullOrWhiteSpace(connectionString))
{
    try
    {
        var npgsqlBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
        if (!string.IsNullOrWhiteSpace(npgsqlBuilder.Password))
        {
            imDbConfig.Password = npgsqlBuilder.Password;
        }
        if (!string.IsNullOrWhiteSpace(npgsqlBuilder.Host) && (imDbConfig.Server == "node79737-sms-yasulor.user.cloudjkt01.com" || imDbConfig.Server == "YOUR_DB_HOST"))
        {
            imDbConfig.Server = npgsqlBuilder.Host;
            imDbConfig.Port = npgsqlBuilder.Port > 0 ? npgsqlBuilder.Port : 5432;
        }
        if (!string.IsNullOrWhiteSpace(npgsqlBuilder.Username) && (imDbConfig.Username == "webadmin" || imDbConfig.Username == "YOUR_DB_USER"))
        {
            imDbConfig.Username = npgsqlBuilder.Username;
        }
    }
    catch { }
}

builder.Services.AddSingleton(imDbConfig);
builder.Services.AddSingleton<PPI.IM.Infrastructure.Data.DbConnectionFactory>();
builder.Services.AddSingleton<PPI.IM.Infrastructure.Data.DbInitializer>();
builder.Services.AddSingleton<PPI.IM.Infrastructure.Repositories.UserRepository>();
builder.Services.AddSingleton<PPI.IM.Infrastructure.Repositories.ImRepository>();
builder.Services.AddSingleton<PPI.IM.Infrastructure.Repositories.LockRepository>();
builder.Services.AddSingleton<PPI.IM.Infrastructure.Repositories.AssigneeRepository>();
builder.Services.AddSingleton<PPI.IM.Application.Services.AuthService>();
builder.Services.AddSingleton<PPI.IM.Application.Services.QcCalculationService>();
builder.Services.AddSingleton<PPI.IM.Application.Services.IUpLockService, PPI.IM.Application.Services.UpLockService>();

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

app.UseDefaultFiles();

var staticFileProvider = new FileExtensionContentTypeProvider();
staticFileProvider.Mappings[".webp"] = "image/webp";

if (!string.IsNullOrEmpty(discoveredWwwroot) && Directory.Exists(discoveredWwwroot))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(discoveredWwwroot),
        ContentTypeProvider = staticFileProvider
    });
}
else
{
    app.UseStaticFiles(new StaticFileOptions
    {
        ContentTypeProvider = staticFileProvider
    });
}

app.UseRouting();
app.UseCors("AllowAllOrigins");

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

app.MapControllers();

app.MapFallbackToFile("/im-digital/{*path:nonfile}", "/im-digital/index.html");

// Run IM Digital DB initialization asynchronously on background startup
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(3000);
        using var scope = app.Services.CreateScope();
        var imDbInit = scope.ServiceProvider.GetRequiredService<PPI.IM.Infrastructure.Data.DbInitializer>();
        await imDbInit.InitializeAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[IM DB Init Error] {ex.Message}");
    }
});

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
