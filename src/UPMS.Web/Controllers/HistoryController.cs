using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class HistoryController : Controller
    {
        private readonly IInventoryService _inventoryService;
        private readonly IExcelExportService _excelService;

        public HistoryController(IInventoryService inventoryService, IExcelExportService excelService)
        {
            _inventoryService = inventoryService;
            _excelService = excelService;
        }

        public async Task<IActionResult> Index(string tab = "masuk", int? year = null, string? search = null, int page = 1)
        {
            ViewBag.Tab = tab.ToLower();
            ViewBag.Year = year;
            ViewBag.Search = search;

            if (tab.ToLower() == "keluar")
            {
                var keluarHistory = await _inventoryService.GetBarangKeluarHistoryAsync(year, search, page, 50);
                return View(keluarHistory);
            }
            else
            {
                var masukHistory = await _inventoryService.GetBarangMasukHistoryAsync(year, search, page, 50);
                return View("Index", masukHistory);
            }
        }

        [HttpGet]
        public async Task<IActionResult> ExportExcel(string tab = "masuk", int? year = null, string? search = null)
        {
            if (tab.ToLower() == "keluar")
            {
                var paged = await _inventoryService.GetBarangKeluarHistoryAsync(year, search, 1, 10000);
                byte[] fileBytes = _excelService.ExportBarangKeluarToExcel(paged.Items);
                string fileName = $"History_BarangKeluar_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            else
            {
                var paged = await _inventoryService.GetBarangMasukHistoryAsync(year, search, 1, 10000);
                byte[] fileBytes = _excelService.ExportBarangMasukToExcel(paged.Items);
                string fileName = $"History_BarangMasuk_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
        }
    }
}
