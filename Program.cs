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
builder.WebHost.UseStaticWebAssets();

// Add services to the container.
builder.Services.AddControllersWithViews();

// AUTH-003: Connection string reads from environment or appsettings — never hardcode passwords in source
string? connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "No database connection string found. Set ConnectionStrings__DefaultConnection environment variable.");
}

builder.Services.AddDbContext<UpmsDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure Anti-Forgery Cookie for Reverse Proxy / NGINX compatibility
builder.Services.AddAntiforgery(options =>
{
    options.Cookie.Name = "UPMS.Antiforgery";
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

// AUTH-008 & AUTH-010: Cookie Authentication with secure settings
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.AccessDeniedPath = "/Account/AccessDenied";

        // AUTH-008: Sliding expiration of 4h, absolute max of 8h
        options.ExpireTimeSpan = TimeSpan.FromHours(4);
        options.SlidingExpiration = true;
        options.Cookie.MaxAge = TimeSpan.FromHours(8); // hard absolute limit

        // AUTH-010: Secure cookie flags
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // use Always in production with HTTPS
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

var app = builder.Build();

var forwardedOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
};
forwardedOptions.KnownIPNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    app.UseHttpsRedirection();
}

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

// Seed default admin user if database is missing admin account
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<UpmsDbContext>();
    await DbSeeder.SeedDefaultAdminAsync(db);
}

app.Run();
