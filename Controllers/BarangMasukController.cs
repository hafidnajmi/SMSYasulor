using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UPMS.Web.Models.Entities;
using UPMS.Web.Services;

using System.Linq;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class BarangMasukController : Controller
    {
        private readonly IInventoryService _inventoryService;
        private readonly ISparepartService _sparepartService;
        private readonly UpmsDbContext _db;

        public BarangMasukController(IInventoryService inventoryService, ISparepartService sparepartService, UpmsDbContext db)
        {
            _inventoryService = inventoryService;
            _sparepartService = sparepartService;
            _db = db;
        }

        public async Task<IActionResult> Index(int? year, string? search, int page = 1)
        {
            var history = await _inventoryService.GetBarangMasukHistoryAsync(year, search, page, 50);
            ViewBag.Year = year;
            ViewBag.Search = search;

            ViewBag.Pics = new List<string> { "Raisa", "Priyanto", "Rohmadi", "Yully", "Hussein", "Slamet", "Andra" };
            ViewBag.Suppliers = await _db.Suppliers.AsNoTracking().OrderBy(s => s.Name).Select(s => s.Name).ToListAsync();

            return View(history);
        }

        [HttpGet]
        public async Task<IActionResult> LookupBin(string query)
        {
            if (string.IsNullOrWhiteSpace(query)) return Json(null);
            string q = query.Trim().ToUpper();

            var item = await _sparepartService.GetByBinAsync(q);
            if (item != null)
            {
                return Json(new { Bin = item.Bin ?? "", ItemName = item.Item, PartNumber = item.Id, item.CurrentStock, item.CurrentUnitPrice });
            }

            var itemById = await _sparepartService.GetByIdAsync(q);
            if (itemById != null)
            {
                return Json(new { Bin = itemById.Bin ?? "", ItemName = itemById.Item, PartNumber = itemById.Id, itemById.CurrentStock, itemById.CurrentUnitPrice });
            }

            return Json(null);
        }

        [HttpGet]
        public async Task<IActionResult> SearchMasterData(string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2) return Json(new List<object>());
            string q = query.Trim().ToLower();

            var matches = await _db.MasterDatas
                .AsNoTracking()
                .Where(m => !m.IsDeleted && (
                    m.Id.ToLower().Contains(q) ||
                    m.Item.ToLower().Contains(q) ||
                    (m.Bin != null && m.Bin.ToLower().Contains(q))
                ))
                .Take(10)
                .Select(x => new
                {
                    x.Id,
                    x.Item,
                    Bin = x.Bin ?? "-",
                    Brand = x.Brand ?? "-"
                })
                .ToListAsync();

            return Json(matches);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SubmitDirect(BarangMasuk model)
        {
            if (!ModelState.IsValid || model.Qty <= 0)
            {
                TempData["Error"] = "Please enter valid item details and quantity greater than 0.";
                return RedirectToAction("Index");
            }

            try
            {
                if (model.Tanggal == default || model.Tanggal.TimeOfDay == TimeSpan.Zero)
                {
                    model.Tanggal = DateTime.Today.Add(DateTime.Now.TimeOfDay);
                }

                int newId = await _inventoryService.CreateBarangMasukAsync(model, User.Identity?.Name ?? "system");
                TempData["Success"] = $"Incoming goods recorded successfully with ID #{newId}";
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Error saving transaction: {ex.Message}";
            }

            return RedirectToAction("Index");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SubmitBatch([FromBody] List<BarangMasuk> items)
        {
            if (items == null || items.Count == 0)
            {
                return Json(new { success = false, message = "No pending items to save." });
            }

            try
            {
                int count = await _inventoryService.CreateBarangMasukBatchAsync(items, User.Identity?.Name ?? "system");
                return Json(new { success = true, message = $"{count} items submitted and stock updated successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error saving batch: {ex.Message}" });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            bool success = await _inventoryService.DeleteBarangMasukAsync(id, User.Identity?.Name ?? "system");
            if (success)
            {
                TempData["Success"] = $"Entry #{id} deleted and stock adjusted.";
            }
            else
            {
                TempData["Error"] = $"Failed to delete entry #{id}.";
            }
            return RedirectToAction("Index");
        }
    }
}
