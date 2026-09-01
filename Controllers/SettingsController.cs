using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class SettingsController : Controller
    {
        private readonly UpmsDbContext _db;

        public SettingsController(UpmsDbContext db)
        {
            _db = db;
        }

        private async Task<bool> HasSettingsPermissionAsync()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return false;
            var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Username.ToLower() == username.ToLower());
            if (u == null) return false;
            if (string.Equals(u.Username, "admin", StringComparison.OrdinalIgnoreCase)) return true;
            if (u.Role?.ToLower() == "admin") return true;
            return u.CanSettings == 1;
        }

        public async Task<IActionResult> Index()
        {
            if (!await HasSettingsPermissionAsync())
            {
                return RedirectToAction("Index", "Home");
            }
            var users = await _db.Users
                .AsNoTracking()
                .OrderBy(u => u.Id)
                .ToListAsync();

            var deleteSetting = await _db.AppSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "delete_protection_password");

            ViewBag.DeleteProtectionPassword = deleteSetting?.SettingValue ?? "123456";

            return View(users);
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateUser(User model, string rawPassword)
        {
            if (string.IsNullOrWhiteSpace(rawPassword))
            {
                TempData["Error"] = "Password wajib diisi untuk user baru.";
                return RedirectToAction("Index");
            }

            if (string.IsNullOrWhiteSpace(model.Username))
            {
                TempData["Error"] = "Username wajib diisi.";
                return RedirectToAction("Index");
            }

            bool exists = await _db.Users.AnyAsync(u => u.Username.ToLower() == model.Username.Trim().ToLower());
            if (exists)
            {
                TempData["Error"] = $"Username '{model.Username}' sudah digunakan oleh user lain.";
                return RedirectToAction("Index");
            }

            model.Username = model.Username.Trim();
            model.FullName = model.FullName?.Trim();
            model.Role = model.Role?.Trim().ToLower() ?? "user";
            model.IsActive = true;

            // If Role is Admin, enforce mutlak full permissions
            if (model.Role == "admin")
            {
                model.CanMasterData = 1;
                model.CanAdminMgmt = 1;
                model.CanBidding = 1;
                model.CanSettings = 1;
                model.CanBarangMasuk = 1;
                model.CanRiwayat = 1;
                model.CanElectricalParts = 1;
                model.CanSupplierData = 1;
                model.CanEmailSettings = 1;
                model.CanBarangKeluar = 1;
                model.CanLineMapping = 1;
                model.CanMasterMachine = 1;
                model.CanSparepartMachine = 1;
                model.CanCostIntelligence = 1;
                model.RequireApprovalKeluar = false;
            }

            model.PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword.Trim(), workFactor: 12);
            _db.Users.Add(model);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"User '{model.Username}' berhasil dibuat.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditUser(User model, string? rawPassword, string? newPassword)
        {
            var existing = await _db.Users.FindAsync(model.Id);
            if (existing == null) return NotFound();

            bool isRootAdmin = string.Equals(existing.Username, "admin", StringComparison.OrdinalIgnoreCase);

            if (!isRootAdmin)
            {
                existing.FullName = model.FullName?.Trim();
                existing.Role = model.Role?.Trim().ToLower() ?? "user";
            }

            // If Role is Admin, enforce mutlak full permissions
            if (existing.Role == "admin" || isRootAdmin)
            {
                existing.Role = "admin";
                existing.CanMasterData = 1;
                existing.CanAdminMgmt = 1;
                existing.CanBidding = 1;
                existing.CanSettings = 1;
                existing.CanBarangMasuk = 1;
                existing.CanRiwayat = 1;
                existing.CanElectricalParts = 1;
                existing.CanSupplierData = 1;
                existing.CanEmailSettings = 1;
                existing.CanBarangKeluar = 1;
                existing.CanLineMapping = 1;
                existing.CanMasterMachine = 1;
                existing.CanSparepartMachine = 1;
                existing.CanCostIntelligence = 1;
                existing.RequireApprovalKeluar = false;
            }
            else
            {
                existing.CanMasterData = Request.Form.ContainsKey("CanMasterData") ? 1 : 0;
                existing.CanAdminMgmt = Request.Form.ContainsKey("CanAdminMgmt") ? 1 : 0;
                existing.CanBidding = existing.CanAdminMgmt;
                existing.CanSettings = Request.Form.ContainsKey("CanSettings") ? 1 : 0;
                existing.CanBarangMasuk = Request.Form.ContainsKey("CanBarangMasuk") ? 1 : 0;
                existing.CanRiwayat = Request.Form.ContainsKey("CanRiwayat") ? 1 : 0;
                existing.CanSupplierData = Request.Form.ContainsKey("CanSupplierData") ? 1 : 0;
                existing.CanEmailSettings = Request.Form.ContainsKey("CanEmailSettings") ? 1 : 0;
                existing.CanBarangKeluar = Request.Form.ContainsKey("CanBarangKeluar") ? 1 : 0;
                existing.CanLineMapping = Request.Form.ContainsKey("CanLineMapping") ? 1 : 0;
                existing.CanMasterMachine = Request.Form.ContainsKey("CanMasterMachine") ? 1 : 0;
                existing.CanCostIntelligence = Request.Form.ContainsKey("CanCostIntelligence") ? 1 : 0;
                existing.RequireApprovalKeluar = Request.Form.ContainsKey("RequireApprovalKeluar");
            }

            string? passToChange = !string.IsNullOrWhiteSpace(rawPassword) ? rawPassword : newPassword;
            if (!string.IsNullOrWhiteSpace(passToChange))
            {
                existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(passToChange.Trim(), workFactor: 12);
            }

            await _db.SaveChangesAsync();
            TempData["Success"] = $"Data & hak akses user '{existing.Username}' berhasil diperbarui.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ToggleStatus(int userId)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase))
            {
                TempData["Error"] = "User root 'admin' tidak dapat dinonaktifkan.";
                return RedirectToAction("Index");
            }

            user.IsActive = !user.IsActive;
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Status user '{user.Username}' diubah menjadi {(user.IsActive ? "Active" : "Inactive")}.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteUser(int userId)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase))
            {
                TempData["Error"] = "User root 'admin' tidak dapat dihapus.";
                return RedirectToAction("Index");
            }

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"User '{user.Username}' berhasil dihapus.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SaveDeletePassword(string deletePassword)
        {
            if (string.IsNullOrWhiteSpace(deletePassword))
            {
                TempData["Error"] = "Password proteksi hapus tidak boleh kosong.";
                return RedirectToAction("Index");
            }

            // AUTH-007: Hash delete protection password before storing (never store plain text)
            var setting = await _db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "delete_protection_password");
            if (setting == null)
            {
                setting = new AppSetting
                {
                    SettingKey = "delete_protection_password",
                    SettingValue = BCrypt.Net.BCrypt.HashPassword(deletePassword.Trim(), workFactor: 12)
                };
                _db.AppSettings.Add(setting);
            }
            else
            {
                setting.SettingValue = BCrypt.Net.BCrypt.HashPassword(deletePassword.Trim(), workFactor: 12);
            }

            await _db.SaveChangesAsync();
            TempData["Success"] = "Password proteksi hapus data berhasil disimpan.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        [Authorize] // AUTH-005: Only authenticated users can verify delete password
        public async Task<IActionResult> VerifyDeletePassword([FromBody] DeleteVerifyRequest req)
        {
            var deleteSetting = await _db.AppSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "delete_protection_password");
            string configuredPassword = deleteSetting?.SettingValue ?? "123456";

            string inputPassword = req?.Password?.Trim() ?? "";

            // AUTH-007: Compare against BCrypt hash stored in DB
            // Support both BCrypt hashes (new) and legacy plain-text (old) for migration period
            bool isDeletePasswordValid = false;
            if (!string.IsNullOrEmpty(configuredPassword))
            {
                // Try BCrypt first (new format)
                try { isDeletePasswordValid = BCrypt.Net.BCrypt.Verify(inputPassword, configuredPassword); } catch { }
                // Fallback: plain text comparison for not-yet-migrated passwords
                if (!isDeletePasswordValid)
                    isDeletePasswordValid = string.Equals(inputPassword, configuredPassword, StringComparison.Ordinal);
            }

            if (isDeletePasswordValid)
            {
                return Json(new { success = true });
            }

            // Also allow current user's login password
            var username = User.Identity?.Name;
            if (!string.IsNullOrEmpty(username))
            {
                var currentUser = await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());

                if (currentUser != null && BCrypt.Net.BCrypt.Verify(inputPassword, currentUser.PasswordHash))
                {
                    return Json(new { success = true });
                }
            }

            return Json(new { success = false, message = "Password otentikasi hapus salah!" });
        }
    }

    public class DeleteVerifyRequest
    {
        public string? Password { get; set; }
    }
}
