using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class MaintenanceController : Controller
    {
        private readonly UpmsDbContext _db;

        public MaintenanceController(UpmsDbContext db)
        {
            _db = db;
        }

        public async Task<IActionResult> Index(int? year, int? month, string? machine, string? status, string? search)
        {
            int selectedYear = year ?? DateTime.Now.Year;
            int selectedMonth = month ?? DateTime.Now.Month;

            ViewBag.SelectedYear = selectedYear;
            ViewBag.SelectedMonth = selectedMonth;
            ViewBag.SelectedMachine = machine ?? "";
            ViewBag.SelectedStatus = status ?? "";
            ViewBag.SearchQuery = search ?? "";

            // Machine list for dropdowns
            var machines = await _db.MachineMasters
                .AsNoTracking()
                .OrderBy(m => m.MachineName)
                .ToListAsync();
            ViewBag.Machines = machines;

            var query = _db.PmSchedules.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(machine))
            {
                query = query.Where(p => p.MachineName == machine || p.MachineCode == machine);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(p => p.Status.ToUpper() == status.ToUpper());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(term) ||
                                         (p.MachineName != null && p.MachineName.ToLower().Contains(term)) ||
                                         (p.Technician != null && p.Technician.ToLower().Contains(term)) ||
                                         (p.Notes != null && p.Notes.ToLower().Contains(term)));
            }

            // Filter for list view by year and month
            var listQuery = query.Where(p => p.ScheduledDate.Year == selectedYear && p.ScheduledDate.Month == selectedMonth);
            var pmList = await listQuery.OrderBy(p => p.ScheduledDate).ThenBy(p => p.Title).ToListAsync();

            // All events for the selected month to build calendar badges
            var monthEvents = await _db.PmSchedules
                .AsNoTracking()
                .Where(p => p.ScheduledDate.Year == selectedYear && p.ScheduledDate.Month == selectedMonth)
                .OrderBy(p => p.ScheduledDate)
                .ToListAsync();

            ViewBag.MonthEvents = monthEvents;

            // Summary stats for KPI cards
            ViewBag.TotalCount = monthEvents.Count;
            ViewBag.PlanningCount = monthEvents.Count(e => e.Status.ToUpper() == "P" || e.Status.ToLower() == "planning");
            ViewBag.ExecuteCount = monthEvents.Count(e => e.Status.ToUpper() == "E" || e.Status.ToLower() == "execute");
            ViewBag.RevisionCount = monthEvents.Count(e => e.Status.ToUpper() == "R" || e.Status.ToLower() == "revision");
            ViewBag.MissedCount = monthEvents.Count(e => e.Status.ToUpper() == "M" || e.Status.ToLower() == "missed");

            return View(pmList);
        }

        [HttpGet]
        public async Task<IActionResult> GetEvents(int year, int month)
        {
            var events = await _db.PmSchedules
                .AsNoTracking()
                .Where(p => p.ScheduledDate.Year == year && p.ScheduledDate.Month == month)
                .OrderBy(p => p.ScheduledDate)
                .Select(p => new
                {
                    id = p.Id,
                    title = p.Title,
                    machineName = p.MachineName ?? "-",
                    machineCode = p.MachineCode ?? "-",
                    scheduledDate = p.ScheduledDate.ToString("yyyy-MM-dd"),
                    day = p.ScheduledDate.Day,
                    status = p.Status.ToUpper(),
                    technician = p.Technician ?? "",
                    notes = p.Notes ?? ""
                })
                .ToListAsync();

            return Json(events);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(PmSchedule model)
        {
            if (string.IsNullOrWhiteSpace(model.Title))
            {
                TempData["Error"] = "Judul Kegiatan PM wajib diisi.";
                return RedirectToAction(nameof(Index), new { year = model.ScheduledDate.Year, month = model.ScheduledDate.Month });
            }

            if (model.MachineId.HasValue && model.MachineId.Value > 0)
            {
                var machine = await _db.MachineMasters.FindAsync(model.MachineId.Value);
                if (machine != null)
                {
                    model.MachineCode = machine.MachineCode;
                    model.MachineName = machine.MachineName;
                }
            }

            model.Status = (model.Status ?? "P").Trim().ToUpper();
            if (!new[] { "P", "E", "R", "M" }.Contains(model.Status))
            {
                model.Status = "P";
            }

            model.CreatedAt = DateTime.Now;
            model.CreatedBy = User.Identity?.Name ?? "System";

            _db.PmSchedules.Add(model);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Jadwal PM '{model.Title}' berhasil ditambahkan.";
            return RedirectToAction(nameof(Index), new { year = model.ScheduledDate.Year, month = model.ScheduledDate.Month });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateStatus(int id, string status, string? notes)
        {
            var item = await _db.PmSchedules.FindAsync(id);
            if (item == null)
            {
                return Json(new { success = false, message = "Jadwal PM tidak ditemukan." });
            }

            string newStatus = (status ?? "P").Trim().ToUpper();
            if (!new[] { "P", "E", "R", "M" }.Contains(newStatus))
            {
                return Json(new { success = false, message = "Status tidak valid." });
            }

            item.Status = newStatus;
            if (notes != null)
            {
                item.Notes = notes;
            }
            item.UpdatedAt = DateTime.Now;
            item.UpdatedBy = User.Identity?.Name ?? "System";

            await _db.SaveChangesAsync();
            return Json(new { success = true, message = $"Status PM berhasil diperbarui ke '{newStatus}'." });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(PmSchedule model)
        {
            var item = await _db.PmSchedules.FindAsync(model.Id);
            if (item == null)
            {
                TempData["Error"] = "Jadwal PM tidak ditemukan.";
                return RedirectToAction(nameof(Index));
            }

            item.Title = model.Title;
            item.ScheduledDate = model.ScheduledDate;
            item.Status = (model.Status ?? "P").Trim().ToUpper();
            if (!new[] { "P", "E", "R", "M" }.Contains(item.Status))
            {
                item.Status = "P";
            }

            if (model.MachineId.HasValue && model.MachineId.Value > 0)
            {
                var machine = await _db.MachineMasters.FindAsync(model.MachineId.Value);
                if (machine != null)
                {
                    item.MachineId = machine.Id;
                    item.MachineCode = machine.MachineCode;
                    item.MachineName = machine.MachineName;
                }
            }
            else if (!string.IsNullOrWhiteSpace(model.MachineName))
            {
                item.MachineName = model.MachineName;
            }

            item.Technician = model.Technician;
            item.Notes = model.Notes;
            item.UpdatedAt = DateTime.Now;
            item.UpdatedBy = User.Identity?.Name ?? "System";

            await _db.SaveChangesAsync();

            TempData["Success"] = $"Jadwal PM '{item.Title}' berhasil diperbarui.";
            return RedirectToAction(nameof(Index), new { year = item.ScheduledDate.Year, month = item.ScheduledDate.Month });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _db.PmSchedules.FindAsync(id);
            if (item == null)
            {
                TempData["Error"] = "Jadwal PM tidak ditemukan.";
                return RedirectToAction(nameof(Index));
            }

            int year = item.ScheduledDate.Year;
            int month = item.ScheduledDate.Month;

            _db.PmSchedules.Remove(item);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Jadwal PM '{item.Title}' berhasil dihapus.";
            return RedirectToAction(nameof(Index), new { year, month });
        }

        [HttpGet]
        public async Task<IActionResult> ExportExcel(int? year, int? month)
        {
            int selYear = year ?? DateTime.Now.Year;
            int selMonth = month ?? DateTime.Now.Month;

            var data = await _db.PmSchedules
                .AsNoTracking()
                .Where(p => p.ScheduledDate.Year == selYear && p.ScheduledDate.Month == selMonth)
                .OrderBy(p => p.ScheduledDate)
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add($"Jadwal PM {selYear}-{selMonth:D2}");

            // Header styling
            worksheet.Cell(1, 1).Value = "No";
            worksheet.Cell(1, 2).Value = "Tanggal PM";
            worksheet.Cell(1, 3).Value = "Judul Kegiatan PM";
            worksheet.Cell(1, 4).Value = "Mesin / Line";
            worksheet.Cell(1, 5).Value = "Kode Status";
            worksheet.Cell(1, 6).Value = "Keterangan Status";
            worksheet.Cell(1, 7).Value = "Teknisi / PIC";
            worksheet.Cell(1, 8).Value = "Catatan";

            var headerRow = worksheet.Row(1);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F4C81");
            headerRow.Style.Font.FontColor = XLColor.White;

            int row = 2;
            foreach (var item in data)
            {
                worksheet.Cell(row, 1).Value = row - 1;
                worksheet.Cell(row, 2).Value = item.ScheduledDate.ToString("yyyy-MM-dd");
                worksheet.Cell(row, 3).Value = item.Title;
                worksheet.Cell(row, 4).Value = item.MachineName ?? "-";
                worksheet.Cell(row, 5).Value = item.Status;

                string statusDesc = item.Status switch
                {
                    "P" => "Planning",
                    "E" => "Execute",
                    "R" => "Revision",
                    "M" => "Missed",
                    _ => item.Status
                };
                worksheet.Cell(row, 6).Value = statusDesc;
                worksheet.Cell(row, 7).Value = item.Technician ?? "-";
                worksheet.Cell(row, 8).Value = item.Notes ?? "-";

                // Cell status highlight styling
                var statusCell = worksheet.Cell(row, 5);
                statusCell.Style.Font.Bold = true;
                if (item.Status == "P") { statusCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB"); statusCell.Style.Font.FontColor = XLColor.FromHtml("#1F2937"); }
                else if (item.Status == "E") { statusCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB"); statusCell.Style.Font.FontColor = XLColor.FromHtml("#10B981"); }
                else if (item.Status == "R") { statusCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB"); statusCell.Style.Font.FontColor = XLColor.FromHtml("#06B6D4"); }
                else if (item.Status == "M") { statusCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FACC15"); statusCell.Style.Font.FontColor = XLColor.FromHtml("#000000"); }

                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var content = stream.ToArray();

            return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Jadwal_PM_{selYear}_{selMonth:D2}.xlsx");
        }
    }
}
