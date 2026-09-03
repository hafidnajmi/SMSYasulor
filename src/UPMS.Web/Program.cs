using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Services;

// Enable Legacy Timestamp Behavior for PostgreSQL Npgsql
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Configure Forwarded Headers for Reverse Proxy (Nginx Load Balancer in Dewa Cloud / Jelastic)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Add services to the container.
builder.Services.AddControllersWithViews();

// Database Context (PostgreSQL)
string connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=node79737-sms-yasulor.user.cloudjkt01.com;Port=5432;Database=postgres;Username=webadmin;Password=KrKUiDqUuP;";

builder.Services.AddDbContext<UpmsDbContext>(options =>
    options.UseNpgsql(connectionString));

// Cookie Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.AccessDeniedPath = "/Account/AccessDenied";
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
    });

// Custom Application Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISparepartService, SparepartService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IExcelExportService, ExcelExportService>();

var app = builder.Build();

// Enable Forwarded Headers for Nginx
app.UseForwardedHeaders();

// Configure the HTTP request pipeline.
app.UseDeveloperExceptionPage();

app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();

// Real-Time Claims & RBAC Sync Middleware:
// Instantly updates logged-in user permissions from PostgreSQL on every request without requiring manual re-login
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        try
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
        catch (Exception ex)
        {
            Console.WriteLine($"[RBAC Sync Middleware Warning] {ex.Message}");
        }
    }
    await next();
});

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Dashboard}/{action=Index}/{id?}");

// Seed default admin user if database is reachable
try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<UpmsDbContext>();
        await DbSeeder.SeedDefaultAdminAsync(db);
    }
}
catch (Exception ex)
{
    Console.WriteLine($"[Startup Warning] Database Seeding Skipped or Failed: {ex.Message}");
}

app.Run();
