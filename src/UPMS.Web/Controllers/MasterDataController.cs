using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UPMS.Web.Models.Entities;
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class MasterDataController : Controller
    {
        private readonly ISparepartService _sparepartService;
        private readonly IExcelExportService _excelService;

        public MasterDataController(ISparepartService sparepartService, IExcelExportService excelService)
        {
            _sparepartService = sparepartService;
            _excelService = excelService;
        }

        public async Task<IActionResult> Index(string? search, string? upArea, string? category, string? frequency, string? line, string? stockStatus, int page = 1)
        {
            var pagedResult = await _sparepartService.GetPagedAsync(search, upArea, category, frequency, line, null, stockStatus, page, 50);

            ViewBag.Categories = await _sparepartService.GetCategoriesAsync();
            ViewBag.Lines = await _sparepartService.GetLinesAsync();
            ViewBag.UpAreas = await _sparepartService.GetUpAreasAsync();
            ViewBag.Kpis = await _sparepartService.GetKpiSummaryAsync();

            ViewBag.Search = search;
            ViewBag.UpArea = upArea;
            ViewBag.Category = category;
            ViewBag.Frequency = frequency;
            ViewBag.Line = line;
            ViewBag.StockStatus = stockStatus;

            return View(pagedResult);
        }

        [HttpGet]
        public async Task<IActionResult> Details(string id)
        {
            var item = await _sparepartService.GetByIdAsync(id);
            if (item == null) return NotFound();
            return PartialView("_DetailsModal", item);
        }

        [HttpGet]
        public async Task<IActionResult> DetailsJson(string id)
        {
            var item = await _sparepartService.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Json(item);
        }

        [HttpPost]
        public async Task<IActionResult> ToggleAlert(string id)
        {
            if (string.IsNullOrEmpty(id)) return Json(new { success = false, message = "Invalid ID" });

            var item = await _sparepartService.GetByIdAsync(id);
            if (item == null) return Json(new { success = false, message = "Item not found" });

            item.AlertSelected = !item.AlertSelected;
            bool success = await _sparepartService.UpdateAsync(item, User.Identity?.Name ?? "system");
            return Json(new { success = true, alertSelected = item.AlertSelected });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(MasterData model, IFormFile? imageFile, decimal? ltMonths, string? search, string? upAreaFilter, string? categoryFilter, string? frequencyFilter, string? lineFilter, string? stockStatusFilter, int page = 1)
        {
            if (!ModelState.IsValid)
            {
                TempData["Error"] = "Invalid master data submission.";
                return RedirectToAction("Index", new { search, upArea = upAreaFilter, category = categoryFilter, frequency = frequencyFilter, line = lineFilter, stockStatus = stockStatusFilter, page });
            }

            decimal ltCreate = ltMonths ?? (model.LtPerMonth.HasValue ? (decimal)model.LtPerMonth.Value : 0m);
            if (!model.SafetyStock.HasValue || model.SafetyStock.Value == 0)
            {
                if (ltCreate > 0 && model.QtyNeedYear.HasValue && !string.IsNullOrEmpty(model.Frequency))
                {
                    model.SafetyStock = _sparepartService.CalculateSafetyStock(model.QtyNeedYear.Value, ltCreate, model.Frequency);
                }
            }

            if (imageFile != null && imageFile.Length > 0)
            {
                model.Image = await SaveUploadedImageAsync(imageFile);
            }

            string newId = await _sparepartService.CreateAsync(model, User.Identity?.Name ?? "system");
            TempData["Success"] = $"Sparepart created successfully with ID: {newId}";
            return RedirectToAction("Index", new { search, upArea = upAreaFilter, category = categoryFilter, frequency = frequencyFilter, line = lineFilter, stockStatus = stockStatusFilter, page });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(MasterData model, IFormFile? imageFile, decimal? ltMonths, string? search, string? upAreaFilter, string? categoryFilter, string? frequencyFilter, string? lineFilter, string? stockStatusFilter, int page = 1)
        {
            decimal ltEdit = ltMonths ?? (model.LtPerMonth.HasValue ? (decimal)model.LtPerMonth.Value : 0m);
            if (!model.SafetyStock.HasValue || model.SafetyStock.Value == 0)
            {
                if (ltEdit > 0 && model.QtyNeedYear.HasValue && !string.IsNullOrEmpty(model.Frequency))
                {
                    model.SafetyStock = _sparepartService.CalculateSafetyStock(model.QtyNeedYear.Value, ltEdit, model.Frequency);
                }
            }

            if (imageFile != null && imageFile.Length > 0)
            {
                model.Image = await SaveUploadedImageAsync(imageFile);
            }

            bool success = await _sparepartService.UpdateAsync(model, User.Identity?.Name ?? "system");
            if (success)
            {
                TempData["Success"] = $"Sparepart {model.Id} updated successfully.";
            }
            else
            {
                TempData["Error"] = $"Failed to update sparepart {model.Id}.";
            }

            return RedirectToAction("Index", new { search, upArea = upAreaFilter, category = categoryFilter, frequency = frequencyFilter, line = lineFilter, stockStatus = stockStatusFilter, page });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(string id, string? search, string? upAreaFilter, string? categoryFilter, string? frequencyFilter, string? lineFilter, string? stockStatusFilter, int page = 1)
        {
            bool success = await _sparepartService.SoftDeleteAsync(id, User.Identity?.Name ?? "system");
            if (success)
            {
                TempData["Success"] = $"Sparepart {id} deleted successfully.";
            }
            else
            {
                TempData["Error"] = $"Failed to delete sparepart {id}.";
            }

            return RedirectToAction("Index", new { search, upArea = upAreaFilter, category = categoryFilter, frequency = frequencyFilter, line = lineFilter, stockStatus = stockStatusFilter, page });
        }

        [HttpGet]
        public async Task<IActionResult> ExportExcel(string? search, string? upArea, string? category, string? frequency, string? line, string? stockStatus)
        {
            var pagedResult = await _sparepartService.GetPagedAsync(search, upArea, category, frequency, line, null, stockStatus, 1, 10000);
            byte[] fileBytes = _excelService.ExportMasterDataToExcel(pagedResult.Items);
            string fileName = $"MasterData_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
            return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        private async Task<string> SaveUploadedImageAsync(IFormFile file)
        {
            string uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "spareparts");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }
            string uniqueFileName = $"{Guid.NewGuid().ToString().Substring(0, 8)}_{Path.GetFileName(file.FileName)}";
            string filePath = Path.Combine(uploadsFolder, uniqueFileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            return $"/uploads/spareparts/{uniqueFileName}";
        }
    }
}
