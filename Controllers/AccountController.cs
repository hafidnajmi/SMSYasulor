using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    public class AccountController : Controller
    {
        private readonly IAuthService _authService;

        // AUTH-006: In-memory brute force tracking (IP → failed attempts + lockout time)
        private static readonly ConcurrentDictionary<string, (int Count, DateTime? LockedUntil)> _loginAttempts = new();
        private const int MaxFailedAttempts = 5;
        private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

        public AccountController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult Login(string? returnUrl = null)
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                return RedirectToAction("Index", "Dashboard");
            }

            ViewData["ReturnUrl"] = returnUrl;
            return View();
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(string username, string password, string? department = "Filling", string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;
            department = string.IsNullOrWhiteSpace(department) ? "Filling" : department.Trim();

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                ModelState.AddModelError(string.Empty, "Username and password are required.");
                return View();
            }

            // AUTH-006: Check brute force lockout
            string clientIp = GetClientIp();
            string lockoutKey = $"{clientIp}:{username.Trim().ToLower()}";

            if (_loginAttempts.TryGetValue(lockoutKey, out var attempt))
            {
                if (attempt.LockedUntil.HasValue && attempt.LockedUntil.Value > DateTime.UtcNow)
                {
                    var remaining = (int)(attempt.LockedUntil.Value - DateTime.UtcNow).TotalMinutes + 1;
                    ModelState.AddModelError(string.Empty, $"Terlalu banyak percobaan login gagal. Coba lagi dalam {remaining} menit.");
                    return View();
                }
            }

            var user = await _authService.ValidateUserAsync(username, password);
            if (user == null)
            {
                // AUTH-006: Track failed attempts
                _loginAttempts.AddOrUpdate(lockoutKey,
                    (1, null),
                    (k, old) =>
                    {
                        int newCount = old.Count + 1;
                        DateTime? locked = newCount >= MaxFailedAttempts
                            ? DateTime.UtcNow.Add(LockoutDuration)
                            : (DateTime?)null;
                        return (newCount, locked);
                    });

                // AUTH-011: Log failed login
                await _authService.LogFailedLoginAsync(username.Trim(), clientIp);

                ModelState.AddModelError(string.Empty, "Invalid username or password.");
                return View();
            }

            // AUTH-006: Reset failed attempts on successful login
            _loginAttempts.TryRemove(lockoutKey, out _);

            // Store Department context in cookie for enterprise multi-dept security isolation
            Response.Cookies.Append("SMS_ACTIVE_DEPT", department, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });

            var principal = _authService.CreateClaimsPrincipal(user);
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
            await _authService.UpdateLastLoginAsync(user.Id);

            if (string.Equals(department, "Process", StringComparison.OrdinalIgnoreCase) || 
                string.Equals(department, "Utility", StringComparison.OrdinalIgnoreCase))
            {
                return RedirectToAction("ComingSoon", "Account", new { dept = department });
            }

            if (user.Role == "operator")
            {
                return Redirect("/Operator");
            }

            if (string.Equals(user.Role, "technician", StringComparison.OrdinalIgnoreCase) || 
                string.Equals(user.Username, "technician", StringComparison.OrdinalIgnoreCase))
            {
                return Redirect($"/BarangKeluar?dept={Uri.EscapeDataString(department)}");
            }

            if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
            {
                return LocalRedirect(returnUrl);
            }

            return Redirect("/Dashboard");
        }

        [HttpGet]
        [AllowAnonymous]
        public IActionResult ComingSoon(string? dept = "Process")
        {
            dept = string.IsNullOrWhiteSpace(dept) ? "Process" : dept.Trim();
            ViewData["Dept"] = dept;
            return View();
        }

        [HttpGet]
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            Response.Cookies.Delete("SMS_ACTIVE_DEPT");
            return RedirectToAction("Login", "Account");
        }

        [HttpGet]
        public IActionResult AccessDenied()
        {
            return View();
        }

        private string GetClientIp()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}
