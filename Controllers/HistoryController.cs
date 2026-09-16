using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UPMS.Web.Services;

using UPMS.Web.Data;
using UPMS.Web.Helpers;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class HistoryController : Controller
    {
        private readonly IInventoryService _inventoryService;
        private readonly IExcelExportService _excelService;
        private readonly UpmsDbContext _db;

        public HistoryController(IInventoryService inventoryService, IExcelExportService excelService, UpmsDbContext db)
        {
            _inventoryService = inventoryService;
            _excelService = excelService;
            _db = db;
        }

        public async Task<IActionResult> Index(string tab = "masuk", int? year = null, DateTime? startDate = null, DateTime? endDate = null, string? search = null, int page = 1)
        {
            var username = User.Identity?.Name;
            bool canRiwayat = await RbacHelper.HasPermissionAsync(_db, username, u => u.CanRiwayat);

            if (!canRiwayat)
            {
                TempData["Error"] = "Akses Ditolak: Anda tidak memiliki wewenang untuk membuka Transaction Logs.";
                return RedirectToAction("Index", "Dashboard");
            }

            ViewBag.Tab = tab.ToLower();
            ViewBag.Year = year;
            ViewBag.StartDate = startDate?.ToString("yyyy-MM-dd");
            ViewBag.EndDate = endDate?.ToString("yyyy-MM-dd");
            ViewBag.Search = search;

            if (tab.ToLower() == "keluar")
            {
                var keluarHistory = await _inventoryService.GetBarangKeluarHistoryAsync(year, startDate, endDate, search, page, 50);
                return View(keluarHistory);
            }
            else
            {
                var masukHistory = await _inventoryService.GetBarangMasukHistoryAsync(year, startDate, endDate, search, page, 50);
                return View("Index", masukHistory);
            }
        }

        [HttpGet]
        public async Task<IActionResult> ExportExcel(string tab = "masuk", int? year = null, DateTime? startDate = null, DateTime? endDate = null, string? search = null)
        {
            var username = User.Identity?.Name;
            bool canRiwayat = await RbacHelper.HasPermissionAsync(_db, username, u => u.CanRiwayat);

            if (!canRiwayat)
            {
                TempData["Error"] = "Akses Ditolak: Anda tidak memiliki wewenang untuk mengekspor Transaction Logs.";
                return RedirectToAction("Index", "Dashboard");
            }

            if (tab.ToLower() == "keluar")
            {
                var paged = await _inventoryService.GetBarangKeluarHistoryAsync(year, startDate, endDate, search, 1, 10000);
                byte[] fileBytes = _excelService.ExportBarangKeluarToExcel(paged.Items);
                string fileName = $"History_BarangKeluar_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            else
            {
                var paged = await _inventoryService.GetBarangMasukHistoryAsync(year, startDate, endDate, search, 1, 10000);
                byte[] fileBytes = _excelService.ExportBarangMasukToExcel(paged.Items);
                string fileName = $"History_BarangMasuk_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
        }
    }
}
