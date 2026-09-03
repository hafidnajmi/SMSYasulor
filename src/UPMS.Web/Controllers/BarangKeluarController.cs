using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class BarangKeluarController : Controller
    {
        private readonly IInventoryService _inventoryService;
        private readonly ISparepartService _sparepartService;
        private readonly IAuthService _authService;
        private readonly UpmsDbContext _db;

        public BarangKeluarController(IInventoryService inventoryService, ISparepartService sparepartService, IAuthService authService, UpmsDbContext db)
        {
            _inventoryService = inventoryService;
            _sparepartService = sparepartService;
            _authService = authService;
            _db = db;
        }

        public async Task<IActionResult> Index(int? year, string? search, int page = 1)
        {
            var history = await _inventoryService.GetBarangKeluarHistoryAsync(year, search, page, 50);
            ViewBag.Year = year;
            ViewBag.Search = search;

            var pics = new List<string>
            {
                "Adit", "Sudrajat", "Rimba", "Susilo", "Aricko", "Chandra",
                "Marjuki", "Jayadi", "Zulfi", "Priyanto", "Andra", "Madsari",
                "Rohmadi", "Slamet", "Bobot", "Bachir", "Suryanto", "Ferry",
                "Suyut", "Bambang", "Aji", "Ricky", "Hafid", "Hussein",
                "Yully", "Raisa", "Agus"
            };
            pics.Sort();
            ViewBag.Pics = pics;

            var rawLines = await _db.MasterDatas
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line)
                .ToListAsync();

            var lineSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var r in rawLines)
            {
                if (string.IsNullOrWhiteSpace(r)) continue;
                var parts = r.Split(new[] { ',', ';', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    var trimmed = part.Trim();
                    if (!string.IsNullOrEmpty(trimmed))
                    {
                        lineSet.Add(trimmed);
                    }
                }
            }

            var machineLines = await _db.MachineMasters
                .Where(m => !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line)
                .ToListAsync();

            foreach (var ml in machineLines)
            {
                if (string.IsNullOrWhiteSpace(ml)) continue;
                var parts = ml.Split(new[] { ',', ';', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    var trimmed = part.Trim();
                    if (!string.IsNullOrEmpty(trimmed))
                    {
                        lineSet.Add(trimmed);
                    }
                }
            }

            var lines = lineSet.OrderBy(l => l).ToList();

            if (!lines.Any())
            {
                lines = new List<string> { "B01", "B02", "B03", "B04", "B05", "B06", "B24", "B25", "PACKING", "UTILITY" };
            }
            ViewBag.Lines = lines;

            ViewBag.MaintenanceTypes = new List<string> { "PM", "Breakdown", "Improvement", "Trial", "Stock Correction", "Others" };

            return View(history);
        }

        [HttpGet]
        public async Task<IActionResult> GetMachinesByLine(string line)
        {
            if (string.IsNullOrWhiteSpace(line)) return Json(new List<object>());
            string term = line.Trim();
            var machines = await _db.MachineMasters
                .Where(m => m.Line == term || m.Line.Contains(term))
                .OrderBy(m => m.MachineCode)
                .Select(m => new { id = m.Id, code = m.MachineCode, name = m.MachineName })
                .ToListAsync();
            return Json(machines);
        }

        [HttpGet]
        public async Task<IActionResult> SearchMasterData(string query)
        {
            if (string.IsNullOrWhiteSpace(query)) return Json(new List<object>());
            string term = query.Trim().ToLower();

            var results = await _db.MasterDatas
                .Where(m => !m.IsDeleted && (
                    m.Id.ToLower().Contains(term) ||
                    m.Item.ToLower().Contains(term) ||
                    (m.Bin != null && m.Bin.ToLower().Contains(term))
                ))
                .Take(15)
                .Select(m => new {
                    id = m.Id,
                    item = m.Item,
                    bin = m.Bin ?? "-",
                    brand = m.Brand ?? "-",
                    stock = m.CurrentStock ?? 0,
                    line = m.Line ?? ""
                })
                .ToListAsync();

            return Json(results);
        }

        [HttpGet]
        public async Task<IActionResult> LookupBarcode(string query)
        {
            if (string.IsNullOrWhiteSpace(query)) return Json(null);
            string term = query.Trim();

            var itemByBin = await _sparepartService.GetByBinAsync(term);
            if (itemByBin != null)
            {
                return Json(new { MasterDataId = itemByBin.Id, itemByBin.Bin, ItemName = itemByBin.Item, itemByBin.CurrentStock, itemByBin.CurrentUnitPrice });
            }

            var itemById = await _sparepartService.GetByIdAsync(term);
            if (itemById != null)
            {
                return Json(new { MasterDataId = itemById.Id, Bin = itemById.Bin ?? "", ItemName = itemById.Item, itemById.CurrentStock, itemById.CurrentUnitPrice });
            }

            return Json(null);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Submit(BarangKeluar model)
        {
            if (!ModelState.IsValid || model.Qty <= 0)
            {
                TempData["Error"] = "Please enter valid item details and quantity.";
                return RedirectToAction("Index");
            }

            if (model.Tanggal == default || model.Tanggal.TimeOfDay == TimeSpan.Zero)
            {
                model.Tanggal = DateTime.Now;
            }

            int userId = 0;
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

            bool reqApproval = false;
            bool.TryParse(User.FindFirstValue("RequireApprovalKeluar"), out reqApproval);

            string role = User.FindFirstValue(ClaimTypes.Role) ?? "user";

            var user = new User
            {
                Id = userId,
                Username = User.Identity?.Name ?? "system",
                Role = role,
                RequireApprovalKeluar = reqApproval
            };

            try
            {
                int newId = await _inventoryService.CreateBarangKeluarAsync(model, user);
                if (model.ApprovalStatus == "Pending")
                {
                    TempData["Success"] = $"Transaction submitted for Admin Approval (ID #{newId}). Stock will update once approved.";
                }
                else
                {
                    TempData["Success"] = $"Outgoing transaction processed successfully (ID #{newId}).";
                }
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Error recording outgoing transaction: {ex.Message}";
            }

            return RedirectToAction("Index");
        }

        [HttpPost]
        public async Task<IActionResult> SubmitBatch([FromBody] List<BarangKeluar> items)
        {
            if (items == null || !items.Any())
            {
                return Json(new { success = false, message = "Daftar barang keluar kosong." });
            }

            int userId = 0;
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
            bool reqApproval = false;
            bool.TryParse(User.FindFirstValue("RequireApprovalKeluar"), out reqApproval);
            string role = User.FindFirstValue(ClaimTypes.Role) ?? "user";

            var user = new User
            {
                Id = userId,
                Username = User.Identity?.Name ?? "system",
                Role = role,
                RequireApprovalKeluar = reqApproval
            };

            int successCount = 0;
            foreach (var item in items)
            {
                if (item.Qty <= 0 || string.IsNullOrWhiteSpace(item.ItemName)) continue;
                if (item.Tanggal == default || item.Tanggal.TimeOfDay == TimeSpan.Zero)
                {
                    item.Tanggal = DateTime.Now;
                }
                await _inventoryService.CreateBarangKeluarAsync(item, user);
                successCount++;
            }

            return Json(new { success = true, count = successCount, message = $"{successCount} transaksi barang keluar berhasil diproses." });
        }
    }
}
