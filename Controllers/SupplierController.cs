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
    public class SupplierController : Controller
    {
        private readonly UpmsDbContext _db;

        public SupplierController(UpmsDbContext db)
        {
            _db = db;
        }

        private async Task<bool> HasSupplierPermissionAsync()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return false;
            var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Username.ToLower() == username.ToLower());
            if (u == null || !u.IsActive) return false;
            if (string.Equals(u.Username, "admin", StringComparison.OrdinalIgnoreCase)) return true;
            if (u.Role?.ToLower() == "admin") return true;
            return u.CanSupplierData == 1;
        }

        public async Task<IActionResult> Index(string? search, int page = 1, int pageSize = 50)
        {
            if (!await HasSupplierPermissionAsync())
            {
                TempData["Error"] = "Akses ditolak (RBAC): Anda tidak memiliki izin untuk membuka menu Supplier Data.";
                return RedirectToAction("Index", "Home");
            }

            var query = _db.Suppliers.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLower();
                query = query.Where(s =>
                    s.Name.ToLower().Contains(term) ||
                    (s.Pic != null && s.Pic.ToLower().Contains(term)) ||
                    (s.Email != null && s.Email.ToLower().Contains(term)) ||
                    (s.Phone != null && s.Phone.ToLower().Contains(term)) ||
                    (s.Address != null && s.Address.ToLower().Contains(term))
                );
            }

            int totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(s => s.Name)
                .Skip((Math.Max(1, page) - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            ViewBag.Search = search;
            ViewBag.TotalCount = totalCount;
            ViewBag.Page = page;
            ViewBag.PageSize = pageSize;

            return View(items);
        }

        [HttpGet]
        public async Task<IActionResult> DetailsJson(int id)
        {
            if (!await HasSupplierPermissionAsync()) return Forbid();

            var supplier = await _db.Suppliers.FindAsync(id);
            if (supplier == null) return NotFound();
            return Json(supplier);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Supplier model, string? search)
        {
            if (!await HasSupplierPermissionAsync())
            {
                TempData["Error"] = "Akses ditolak (RBAC): Anda tidak memiliki izin untuk menambah Supplier Data.";
                return RedirectToAction("Index", "Home");
            }

            model.Name = model.Name?.Trim() ?? string.Empty;
            model.Pic = model.Pic?.Trim();
            model.Email = model.Email?.Trim();
            model.Phone = model.Phone?.Trim();
            model.Address = model.Address?.Trim();

            if (string.IsNullOrWhiteSpace(model.Name))
            {
                TempData["Error"] = "Supplier Name is required.";
                return RedirectToAction(nameof(Index), new { search });
            }

            bool exists = await _db.Suppliers.AnyAsync(s => s.Name.ToLower() == model.Name.ToLower());
            if (exists)
            {
                TempData["Error"] = $"Supplier '{model.Name}' already exists in database.";
                return RedirectToAction(nameof(Index), new { search });
            }

            _db.Suppliers.Add(model);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Supplier '{model.Name}' added successfully.";
            return RedirectToAction(nameof(Index), new { search });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(Supplier model, string? search)
        {
            if (!await HasSupplierPermissionAsync())
            {
                TempData["Error"] = "Akses ditolak (RBAC): Anda tidak memiliki izin untuk mengedit Supplier Data.";
                return RedirectToAction("Index", "Home");
            }

            var supplier = await _db.Suppliers.FindAsync(model.Id);
            if (supplier == null)
            {
                TempData["Error"] = "Supplier not found.";
                return RedirectToAction(nameof(Index), new { search });
            }

            model.Name = model.Name?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                TempData["Error"] = "Supplier Name is required.";
                return RedirectToAction(nameof(Index), new { search });
            }

            bool duplicate = await _db.Suppliers.AnyAsync(s => s.Id != model.Id && s.Name.ToLower() == model.Name.ToLower());
            if (duplicate)
            {
                TempData["Error"] = $"Another supplier named '{model.Name}' already exists.";
                return RedirectToAction(nameof(Index), new { search });
            }

            supplier.Name = model.Name;
            supplier.Pic = model.Pic?.Trim();
            supplier.Email = model.Email?.Trim();
            supplier.Phone = model.Phone?.Trim();
            supplier.Address = model.Address?.Trim();

            _db.Suppliers.Update(supplier);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Supplier '{supplier.Name}' updated successfully.";
            return RedirectToAction(nameof(Index), new { search });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id, string? search)
        {
            if (!await HasSupplierPermissionAsync())
            {
                TempData["Error"] = "Akses ditolak (RBAC): Anda tidak memiliki izin untuk menghapus Supplier Data.";
                return RedirectToAction("Index", "Home");
            }

            var supplier = await _db.Suppliers.FindAsync(id);
            if (supplier != null)
            {
                _db.Suppliers.Remove(supplier);
                await _db.SaveChangesAsync();
                TempData["Success"] = $"Supplier '{supplier.Name}' deleted successfully.";
            }
            else
            {
                TempData["Error"] = "Supplier not found.";
            }

            return RedirectToAction(nameof(Index), new { search });
        }
    }
}
