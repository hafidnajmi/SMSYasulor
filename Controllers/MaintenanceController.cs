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

        public async Task<IActionResult> Index(
            int? year, 
            int? month, 
            string[]? line, 
            string[]? machine, 
            string? status, 
            string[]? technician,
            string? search, 
            string? view)
        {
            if (!await UPMS.Web.Helpers.RbacHelper.HasPermissionAsync(_db, User.Identity?.Name, u => u.CanManagePm))
            {
                TempData["Error"] = "Akses Ditolak: Anda tidak memiliki wewenang untuk membuka Manage PM.";
                return RedirectToAction("Index", "Dashboard");
            }
            int selectedYear = year ?? DateTime.Now.Year;
            int selectedMonth = month ?? DateTime.Now.Month;

            if (!await _db.PmSchedules.AnyAsync())
            {
                await UPMS.Web.Data.DbSeeder.SeedPmSchedulesAsync(_db);
            }

            ViewBag.SelectedYear = selectedYear;
            ViewBag.SelectedMonth = selectedMonth;
            ViewBag.SelectedStatus = status ?? "";
            ViewBag.SearchQuery = search ?? "";
            ViewBag.CurrentView = string.Equals(view, "list", StringComparison.OrdinalIgnoreCase) ? "list" : "calendar";

            // 1. Extract all lines from MasterData & MachineMaster & CleanLines
            var cleanLines = new List<string>
            {
                "B4", "B5", "B10", "B11", "B15", "B16", "B17", "B18", "B19",
                "B20", "B21", "B22", "B24",
                "J3", "J4", "J5",
                "T1", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T12",
                "S6", "S7", "S8", "S9", "S10", "S14", "S15", "S16", "S18", "S19", "S20"
            };

            var rawMasterLines = await _db.MasterDatas
                .AsNoTracking()
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line!)
                .ToListAsync();

            var rawMachineLines = await _db.MachineMasters
                .AsNoTracking()
                .Where(m => !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line!)
                .ToListAsync();

            var lineSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var cl in cleanLines) lineSet.Add(cl);

            foreach (var r in rawMasterLines.Concat(rawMachineLines))
            {
                if (string.IsNullOrWhiteSpace(r)) continue;
                var parts = r.Split(new[] { ',', ';', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    var trimmed = part.Trim();
                    if (!string.IsNullOrEmpty(trimmed)) lineSet.Add(trimmed);
                }
            }

            var allLines = lineSet.OrderBy(l => l).ToList();
            ViewBag.AllLines = allLines;

            // 2. Technicians list (single source of truth from PicHelper for Barang Keluar & Maintenance)
            ViewBag.Technicians = await UPMS.Web.Helpers.PicHelper.GetPicsBarangKeluarAsync(_db);

            // 3. Machine list for dropdowns
            var machines = await _db.MachineMasters
                .AsNoTracking()
                .OrderBy(m => m.MachineName)
                .ToListAsync();
            ViewBag.Machines = machines;

            // 4. Parse selected Lines, Machines, and Technicians
            var selectedLines = line?.SelectMany(l => l.Split(',', StringSplitOptions.RemoveEmptyEntries))
                                     .Select(l => l.Trim())
                                     .Where(l => !string.IsNullOrEmpty(l))
                                     .Distinct(StringComparer.OrdinalIgnoreCase)
                                     .ToList() ?? new List<string>();

            var selectedMachines = machine?.SelectMany(m => m.Split(',', StringSplitOptions.RemoveEmptyEntries))
                                           .Select(m => m.Trim())
                                           .Where(m => !string.IsNullOrEmpty(m))
                                           .Distinct(StringComparer.OrdinalIgnoreCase)
                                           .ToList() ?? new List<string>();

            var selectedTechnicians = technician?.SelectMany(t => t.Split(',', StringSplitOptions.RemoveEmptyEntries))
                                                 .Select(t => t.Trim())
                                                 .Where(t => !string.IsNullOrEmpty(t))
                                                 .Distinct(StringComparer.OrdinalIgnoreCase)
                                                 .ToList() ?? new List<string>();

            ViewBag.SelectedLines = selectedLines;
            ViewBag.SelectedMachines = selectedMachines;
            ViewBag.SelectedTechnicians = selectedTechnicians;

            // Fetch records for the selected year and apply filters in memory
            var rawYearEvents = await _db.PmSchedules
                .Where(p => p.ScheduledDate.Year == selectedYear)
                .OrderBy(p => p.ScheduledDate)
                .ToListAsync();

            // Auto-populate missing MachineCode, MachineId, and UpArea if missing
            var unlinkedEvents = rawYearEvents.Where(p => string.IsNullOrWhiteSpace(p.UpArea) || (!string.IsNullOrEmpty(p.MachineName) && (p.MachineId == null || string.IsNullOrEmpty(p.MachineCode)))).ToList();
            if (unlinkedEvents.Any())
            {
                var allMasterMachines = await _db.MachineMasters.AsNoTracking().ToListAsync();
                bool dbNeedsSave = false;
                foreach (var pm in unlinkedEvents)
                {
                    if (string.IsNullOrWhiteSpace(pm.UpArea))
                    {
                        pm.UpArea = GetAreaFromLine(pm.Title);
                        dbNeedsSave = true;
                    }
                    if (!string.IsNullOrEmpty(pm.MachineName) && (pm.MachineId == null || string.IsNullOrEmpty(pm.MachineCode)))
                    {
                        var names = pm.MachineName.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                        var matched = allMasterMachines.Where(m => names.Any(n => n.Equals(m.MachineName, StringComparison.OrdinalIgnoreCase) || n.Equals(m.MachineCode, StringComparison.OrdinalIgnoreCase))).ToList();
                        if (matched.Any())
                        {
                            if (string.IsNullOrEmpty(pm.MachineCode))
                            {
                                pm.MachineCode = string.Join(", ", matched.Select(m => m.MachineCode).Distinct());
                                dbNeedsSave = true;
                            }
                            if (pm.MachineId == null && matched.Count == 1)
                            {
                                pm.MachineId = matched.First().Id;
                                dbNeedsSave = true;
                            }
                        }
                    }
                }
                if (dbNeedsSave)
                {
                    await _db.SaveChangesAsync();
                }
            }

            var yearFiltered = rawYearEvents.AsEnumerable();

            if (selectedLines.Any())
            {
                yearFiltered = yearFiltered.Where(p => selectedLines.Any(l =>
                    (!string.IsNullOrEmpty(p.Title) && p.Title.Contains(l, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineName) && p.MachineName.Contains(l, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineCode) && p.MachineCode.Contains(l, StringComparison.OrdinalIgnoreCase))));
            }

            if (selectedMachines.Any())
            {
                yearFiltered = yearFiltered.Where(p => selectedMachines.Any(m =>
                    (!string.IsNullOrEmpty(p.MachineName) && p.MachineName.Contains(m, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineCode) && p.MachineCode.Contains(m, StringComparison.OrdinalIgnoreCase))));
            }

            if (selectedTechnicians.Any())
            {
                yearFiltered = yearFiltered.Where(p => p.Technician != null && selectedTechnicians.Any(t => p.Technician.Contains(t, StringComparison.OrdinalIgnoreCase)));
            }

            var yearEventList = yearFiltered.ToList();

            // Calculate 12-month performance for UP1 and UP2 charts (JAN to DEC)
            var yearEventsUP1 = yearEventList.Where(p => IsUp1Event(p, machines)).ToList();
            var yearEventsUP2 = yearEventList.Where(p => !IsUp1Event(p, machines)).ToList();

            var monthlyPerfUP1 = CalculateMonthlyPerformance(yearEventsUP1, selectedYear);
            var monthlyPerfUP2 = CalculateMonthlyPerformance(yearEventsUP2, selectedYear);

            ViewBag.MonthlyPerformanceUP1Json = System.Text.Json.JsonSerializer.Serialize(monthlyPerfUP1);
            ViewBag.MonthlyPerformanceUP2Json = System.Text.Json.JsonSerializer.Serialize(monthlyPerfUP2);

            // Filter for active selected month view
            var monthFiltered = yearEventList.Where(p => p.ScheduledDate.Month == selectedMonth).AsEnumerable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var s = status.Trim().ToUpper();
                monthFiltered = monthFiltered.Where(p =>
                    s == "P" ? (p.Status.Equals("P", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("planning", StringComparison.OrdinalIgnoreCase)) :
                    s == "E" ? (p.Status.Equals("E", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("execute", StringComparison.OrdinalIgnoreCase)) :
                    s == "R" ? (p.Status.Equals("R", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("revision", StringComparison.OrdinalIgnoreCase)) :
                    s == "M" ? (p.Status.Equals("M", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("missed", StringComparison.OrdinalIgnoreCase)) :
                    p.Status.Equals(s, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                monthFiltered = monthFiltered.Where(p =>
                    (!string.IsNullOrEmpty(p.Title) && p.Title.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineName) && p.MachineName.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineCode) && p.MachineCode.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.Technician) && p.Technician.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.Notes) && p.Notes.Contains(term, StringComparison.OrdinalIgnoreCase)));
            }

            var monthEvents = monthFiltered.ToList();
            var pmList = monthEvents.OrderBy(p => p.ScheduledDate).ThenBy(p => p.Title).ToList();

            ViewBag.MonthEvents = monthEvents;

            // Fetch sparepart item counts per schedule
            var scheduleIds = monthEvents.Select(p => p.Id).ToList();
            var itemCounts = await _db.PmScheduleItems
                .AsNoTracking()
                .Where(i => scheduleIds.Contains(i.PmScheduleId))
                .GroupBy(i => i.PmScheduleId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());
            ViewBag.SparepartItemCounts = itemCounts;

            // Fetch master sparepart options for dropdown select
            var masterSparepartOptions = await _db.MasterDatas
                .AsNoTracking()
                .Where(m => !m.IsDeleted)
                .OrderBy(m => m.Item)
                .Select(m => new
                {
                    id = m.Id,
                    item = m.Item,
                    detail = m.Detail ?? "",
                    bin = m.Bin ?? "",
                    displayText = $"[{m.Id}] {m.Item}" + (!string.IsNullOrEmpty(m.Detail) ? $" ({m.Detail})" : "") + (!string.IsNullOrEmpty(m.Bin) ? $" - Bin: {m.Bin}" : "")
                })
                .ToListAsync();
            ViewBag.MasterSparepartList = masterSparepartOptions;

            // Summary stats for KPI cards
            ViewBag.TotalCount = monthEvents.Count;
            ViewBag.PlanningCount = monthEvents.Count(e => e.Status.ToUpper() == "P" || e.Status.ToLower() == "planning");
            ViewBag.ExecuteCount = monthEvents.Count(e => e.Status.ToUpper() == "E" || e.Status.ToLower() == "execute");
            ViewBag.RevisionCount = monthEvents.Count(e => e.Status.ToUpper() == "R" || e.Status.ToLower() == "revision");
            ViewBag.MissedCount = monthEvents.Count(e => e.Status.ToUpper() == "M" || e.Status.ToLower() == "missed");
            ViewBag.CanEditPm = await CanUserEditPmAsync();

            if (string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(Request.Query["ajax"], "true", StringComparison.OrdinalIgnoreCase))
            {
                return PartialView("_PmContentPartial", pmList);
            }

            return View(pmList);
        }

        private async Task<bool> CanUserEditPmAsync()
        {
            var curUser = User.Identity?.Name;
            if (string.IsNullOrEmpty(curUser)) return false;
            var userEntity = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username.ToLower() == curUser.ToLower());
            if (userEntity == null) return false;
            return (userEntity.Role?.ToLower() == "admin") || string.Equals(curUser, "admin", StringComparison.OrdinalIgnoreCase) || (userEntity.CanManagePmEdit == 1);
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

        [HttpGet]
        public async Task<IActionResult> GetSparepartsByLineAndMachine(string? line, string? machine, int? month)
        {
            var lines = (line ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(l => l.Trim()).ToList();
            var machines = (machine ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(m => m.Trim()).ToList();

            if (!lines.Any() && !machines.Any())
            {
                return Json(new List<object>());
            }

            // 1. Check Master Standard Template Table (PmStandardParts)
            var allTemplates = await _db.PmStandardParts
                .AsNoTracking()
                .OrderBy(p => p.Id)
                .ToListAsync();

            var templateItems = allTemplates.Where(p =>
            {
                bool lineMatch = !lines.Any();
                if (lines.Any() && !string.IsNullOrEmpty(p.Line))
                {
                    var pLines = p.Line.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim());
                    lineMatch = lines.Any(l => pLines.Any(pl => pl.Equals(l, StringComparison.OrdinalIgnoreCase)));
                }

                bool machineMatch = true;
                if (machines.Any())
                {
                    if (!string.IsNullOrWhiteSpace(p.MachineName))
                    {
                        var pMachines = p.MachineName.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim());
                        machineMatch = machines.Any(m => pMachines.Any(pm => pm.Equals(m, StringComparison.OrdinalIgnoreCase)));
                    }
                    else
                    {
                        machineMatch = false;
                    }
                }

                return lineMatch && machineMatch;
            }).ToList();

            // Filter by active month from TargetMonths if a month is specified
            if (month.HasValue && month.Value >= 1 && month.Value <= 12)
            {
                var monthStr = month.Value.ToString();
                templateItems = templateItems.Where(p =>
                {
                    if (string.IsNullOrWhiteSpace(p.TargetMonths)) return true; // no restriction = always active
                    var activeMonths = p.TargetMonths.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(m => m.Trim());
                    return activeMonths.Contains(monthStr);
                }).ToList();
            }

            if (!templateItems.Any())
            {
                // Strict behavior: If line/machine is selected but no PM standard template part is configured for it in Preventive Maintenance Plan, return empty list!
                return Json(new List<object>());
            }

            var spIds = templateItems.Select(t => t.SparepartId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var spNames = templateItems.Select(t => t.SparepartName).Where(name => !string.IsNullOrEmpty(name)).Distinct().ToList();

            var masterList = await _db.MasterDatas.AsNoTracking()
                .Where(m => !m.IsDeleted && (spIds.Contains(m.Id) || spNames.Contains(m.Item)))
                .ToListAsync();

            var masterById = masterList.Where(m => !string.IsNullOrEmpty(m.Id))
                .ToLookup(m => m.Id!, StringComparer.OrdinalIgnoreCase);
            var masterByName = masterList.Where(m => !string.IsNullOrEmpty(m.Item))
                .ToLookup(m => m.Item!, StringComparer.OrdinalIgnoreCase);

            var binById = masterList.Where(m => !string.IsNullOrEmpty(m.Id) && !string.IsNullOrEmpty(m.Bin) && m.Bin != "-")
                .ToLookup(m => m.Id, m => m.Bin, StringComparer.OrdinalIgnoreCase);
            var binByName = masterList.Where(m => !string.IsNullOrEmpty(m.Item) && !string.IsNullOrEmpty(m.Bin) && m.Bin != "-")
                .ToLookup(m => m.Item, m => m.Bin, StringComparer.OrdinalIgnoreCase);

            int targetMonth = month ?? DateTime.Now.Month;
            int targetYear = DateTime.Now.Year;

            var bkList = await _db.BarangKeluars.AsNoTracking()
                .Where(b => b.MaintenanceType != null &&
                            b.MaintenanceType.ToUpper().Contains("PM") &&
                            b.Tanggal.Year == targetYear &&
                            b.Tanggal.Month == targetMonth)
                .ToListAsync();

            var rawResult = templateItems.Select(t =>
            {
                var mById = masterById[t.SparepartId].FirstOrDefault();
                var mByName = masterByName[t.SparepartName].FirstOrDefault();
                var masterItem = mById ?? mByName;

                string partId = !string.IsNullOrEmpty(t.SparepartId) ? t.SparepartId : (masterItem?.Id ?? "");
                string itemName = masterItem != null && !string.IsNullOrEmpty(masterItem.Item)
                    ? masterItem.Item
                    : (!string.IsNullOrEmpty(t.SparepartName) ? t.SparepartName : partId);

                string binVal = masterItem != null && !string.IsNullOrEmpty(masterItem.Bin) && masterItem.Bin != "-"
                    ? masterItem.Bin
                    : (binById[t.SparepartId].FirstOrDefault() ?? binByName[t.SparepartName].FirstOrDefault());

                if (string.IsNullOrEmpty(binVal) && !string.IsNullOrEmpty(t.Notes))
                {
                    var matchBin = System.Text.RegularExpressions.Regex.Match(t.Notes, @"Bin:\s*([^\s;,]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (matchBin.Success) binVal = matchBin.Groups[1].Value;
                    else if (!t.Notes.StartsWith("[")) binVal = t.Notes;
                }

                binVal = string.IsNullOrEmpty(binVal) ? "-" : binVal;

                bool isIssued = bkList.Any(b =>
                    (!string.IsNullOrEmpty(partId) && b.MasterDataId != null && b.MasterDataId.Equals(partId, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(itemName) && b.ItemName != null && b.ItemName.Equals(itemName, StringComparison.OrdinalIgnoreCase))
                );

                return new
                {
                    id = partId,
                    item = itemName,
                    detail = "-",
                    bin = binVal,
                    line = t.Line,
                    machine = t.MachineName ?? "-",
                    stock = 0,
                    unitPrice = 0.0,
                    quantity = t.DefaultQuantity > 0 ? t.DefaultQuantity : 1,
                    unit = t.Unit ?? "Pcs",
                    notes = binVal != "-" ? $"Bin: {binVal}" : (t.Notes ?? ""),
                    frequency = t.Frequency ?? "Monthly",
                    durationMin = t.DurationMin ?? 30,
                    status = isIssued ? "Completed" : "Pending",
                    isCompleted = isIssued
                };
            });

            // Deduplicate items by Part ID / Item Name to ensure unique standard part rows in modal
            var templatedResult = rawResult
                .GroupBy(x => !string.IsNullOrWhiteSpace(x.id) ? x.id.Trim().ToUpper() : x.item.Trim().ToUpper())
                .Select(g =>
                {
                    var first = g.First();
                    bool anyCompleted = g.Any(x => x.isCompleted);
                    return new
                    {
                        id = first.id,
                        item = first.item,
                        detail = first.detail,
                        bin = first.bin,
                        line = first.line,
                        machine = first.machine,
                        stock = first.stock,
                        unitPrice = first.unitPrice,
                        quantity = first.quantity,
                        unit = first.unit,
                        notes = first.notes,
                        frequency = first.frequency,
                        durationMin = first.durationMin,
                        status = anyCompleted ? "Completed" : "Pending",
                        isCompleted = anyCompleted
                    };
                })
                .ToList();

            return Json(templatedResult);
        }

        [HttpGet]
        public async Task<IActionResult> GetActualSparepartsByLineAndDate(string? line, string? date)
        {
            if (string.IsNullOrWhiteSpace(date) || !DateTime.TryParse(date, out var targetDate))
            {
                return Json(new List<object>());
            }

            var lines = (line ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries)
                                     .Select(l => l.Trim())
                                     .Where(l => !string.IsNullOrEmpty(l))
                                     .ToList();

            var targetDay = targetDate.Date;

            var actualList = await _db.BarangKeluars
                .AsNoTracking()
                .Where(b => (b.ApprovalStatus == null || b.ApprovalStatus == "Approved") &&
                            b.MaintenanceType != null && b.MaintenanceType.ToUpper() == "PM" &&
                            b.Tanggal.Date == targetDay)
                .OrderByDescending(b => b.Tanggal)
                .ToListAsync();

            if (lines.Any())
            {
                actualList = actualList.Where(b =>
                {
                    if (string.IsNullOrWhiteSpace(b.Line)) return false;
                    var bLines = b.Line.Split(new[] { ',', ';', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim());
                    return lines.Any(l => bLines.Any(bl => bl.Equals(l, StringComparison.OrdinalIgnoreCase)));
                }).ToList();
            }

            var result = actualList.Select(b => new
            {
                id = b.Id,
                partNumber = !string.IsNullOrWhiteSpace(b.PartNumber) ? b.PartNumber : (!string.IsNullOrWhiteSpace(b.MasterDataId) ? b.MasterDataId : "-"),
                itemName = !string.IsNullOrWhiteSpace(b.ItemName) ? b.ItemName : "-",
                bin = !string.IsNullOrWhiteSpace(b.Bin) ? b.Bin : "-",
                qty = b.Qty,
                pic = !string.IsNullOrWhiteSpace(b.Pic) ? b.Pic : "-",
                tanggal = b.Tanggal.ToString("dd/MM/yyyy HH:mm"),
                status = !string.IsNullOrWhiteSpace(b.ApprovalStatus) ? b.ApprovalStatus : "Approved",
                line = b.Line ?? "-"
            }).ToList();

            return Json(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetStandardTemplateParts(string? line, string? machine)
        {
            var query = _db.PmStandardParts.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(line))
            {
                query = query.Where(p => p.Line.ToLower() == line.Trim().ToLower());
            }
            if (!string.IsNullOrWhiteSpace(machine))
            {
                query = query.Where(p => p.MachineName != null && p.MachineName.ToLower() == machine.Trim().ToLower());
            }

            var list = await query.OrderBy(p => p.Line).ThenBy(p => p.Id).ToListAsync();

            var spIds = list.Select(p => p.SparepartId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var spNames = list.Select(p => p.SparepartName).Where(name => !string.IsNullOrEmpty(name)).Distinct().ToList();

            var masterList = await _db.MasterDatas.AsNoTracking()
                .Where(m => !m.IsDeleted && (spIds.Contains(m.Id) || spNames.Contains(m.Item)))
                .ToListAsync();

            var binById = masterList.Where(m => !string.IsNullOrEmpty(m.Id) && !string.IsNullOrEmpty(m.Bin) && m.Bin != "-")
                .ToLookup(m => m.Id, m => m.Bin, StringComparer.OrdinalIgnoreCase);
            var binByName = masterList.Where(m => !string.IsNullOrEmpty(m.Item) && !string.IsNullOrEmpty(m.Bin) && m.Bin != "-")
                .ToLookup(m => m.Item, m => m.Bin, StringComparer.OrdinalIgnoreCase);

            var resultList = list.Select(p => {
                string binVal = binById[p.SparepartId].FirstOrDefault()
                             ?? binByName[p.SparepartName].FirstOrDefault();

                if (string.IsNullOrEmpty(binVal) && !string.IsNullOrEmpty(p.Notes))
                {
                    var matchBin = System.Text.RegularExpressions.Regex.Match(p.Notes, @"Bin:\s*([^\s;,]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (matchBin.Success) binVal = matchBin.Groups[1].Value;
                    else if (!p.Notes.StartsWith("[")) binVal = p.Notes;
                }

                return new {
                    id = p.Id,
                    line = p.Line,
                    machineName = p.MachineName,
                    sparepartId = p.SparepartId,
                    sparepartName = p.SparepartName,
                    bin = string.IsNullOrEmpty(binVal) ? "-" : binVal,
                    defaultQuantity = p.DefaultQuantity,
                    unit = p.Unit,
                    frequency = p.Frequency,
                    durationMin = p.DurationMin,
                    targetMonths = p.TargetMonths,
                    notes = p.Notes
                };
            });

            return Json(resultList);
        }

        [HttpGet]
        public async Task<IActionResult> PmPlan(string? line, string? machine)
        {
            var cleanLines = new List<string>
            {
                "B4", "B5", "B10", "B11", "B15", "B16", "B17", "B18", "B19",
                "B20", "B21", "B22", "B24",
                "J3", "J4", "J5",
                "T1", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T12",
                "S6", "S7", "S8", "S9", "S10", "S14", "S15", "S16", "S18", "S19", "S20"
            };

            var rawMasterLines = await _db.MasterDatas.AsNoTracking()
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line!).ToListAsync();
            var rawMachineLines = await _db.MachineMasters.AsNoTracking()
                .Where(m => !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line!).ToListAsync();

            var lineSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var cl in cleanLines) lineSet.Add(cl);
            foreach (var r in rawMasterLines.Concat(rawMachineLines))
            {
                if (string.IsNullOrWhiteSpace(r)) continue;
                foreach (var part in r.Split(new[] { ',', ';', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    var trimmed = part.Trim();
                    if (!string.IsNullOrEmpty(trimmed)) lineSet.Add(trimmed);
                }
            }
            var allLines = lineSet.OrderBy(l => l).ToList();

            var machines = await _db.MachineMasters.AsNoTracking().OrderBy(m => m.MachineName).ToListAsync();
            var masterSparepartOptions = await _db.MasterDatas.AsNoTracking()
                .Where(m => !m.IsDeleted)
                .OrderBy(m => m.Item)
                .ToListAsync();

            ViewBag.AllLines = allLines;
            ViewBag.Machines = machines;
            ViewBag.MasterSparepartList = masterSparepartOptions;
            ViewBag.SelectedLine = line ?? "";
            ViewBag.SelectedMachine = machine ?? "";
            ViewBag.CanEditPm = await CanUserEditPmAsync();

            return View();
        }


        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SaveStandardPart(PmStandardPart model)
        {
            if (!await CanUserEditPmAsync())
            {
                return Json(new { success = false, message = "Anda tidak memiliki izin edit PM Plan (Mode View/Read-Only)." });
            }

            if (string.IsNullOrWhiteSpace(model.Line) || string.IsNullOrWhiteSpace(model.SparepartId))
            {
                return Json(new { success = false, message = "Line dan Sparepart wajib diisi." });
            }

            model.Line = model.Line.Trim();
            model.SparepartId = model.SparepartId.Trim();

            if (string.IsNullOrWhiteSpace(model.SparepartName))
            {
                var sp = await _db.MasterDatas.AsNoTracking().FirstOrDefaultAsync(m => m.Id == model.SparepartId);
                model.SparepartName = sp != null ? sp.Item : model.SparepartId;
            }

            if (model.Id > 0)
            {
                var existing = await _db.PmStandardParts.FindAsync(model.Id);
                if (existing != null)
                {
                    existing.Line = model.Line;
                    existing.MachineName = model.MachineName;
                    existing.SparepartId = model.SparepartId;
                    existing.SparepartName = model.SparepartName;
                    existing.DefaultQuantity = model.DefaultQuantity > 0 ? model.DefaultQuantity : 1;
                    existing.Unit = model.Unit ?? "Pcs";
                    existing.Frequency = model.Frequency ?? "Monthly";
                    existing.DurationMin = model.DurationMin ?? 30;
                    existing.TargetMonths = model.TargetMonths ?? "1,2,3,4,5,6,7,8,9,10,11,12";
                    existing.Notes = model.Notes;
                    await _db.SaveChangesAsync();
                    return Json(new { success = true, message = "Master Standard Sparepart PM berhasil diperbarui." });
                }
            }

            model.CreatedAt = DateTime.Now;
            model.DefaultQuantity = model.DefaultQuantity > 0 ? model.DefaultQuantity : 1;
            model.Unit = model.Unit ?? "Pcs";
            model.Frequency = model.Frequency ?? "Monthly";
            model.DurationMin = model.DurationMin ?? 30;
            model.TargetMonths = model.TargetMonths ?? "1,2,3,4,5,6,7,8,9,10,11,12";

            _db.PmStandardParts.Add(model);
            await _db.SaveChangesAsync();

            return Json(new { success = true, message = "Master Standard Sparepart PM berhasil ditambahkan." });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteStandardPart(int id)
        {
            if (!await CanUserEditPmAsync())
            {
                return Json(new { success = false, message = "Anda tidak memiliki izin hapus PM Plan (Mode View/Read-Only)." });
            }

            var existing = await _db.PmStandardParts.FindAsync(id);
            if (existing == null)
            {
                return Json(new { success = false, message = "Item standar tidak ditemukan." });
            }

            string spId = existing.SparepartId;
            string spName = existing.SparepartName;
            string spLine = existing.Line;

            _db.PmStandardParts.Remove(existing);

            // Synchronize: Remove corresponding items from pending PM schedules (status 'P') for this line
            var pendingScheduleIds = await _db.PmSchedules
                .Where(s => s.Status.ToUpper() == "P" && (s.Title.Contains(spLine) || (s.UpArea != null && s.UpArea.Contains(spLine))))
                .Select(s => s.Id)
                .ToListAsync();

            if (pendingScheduleIds.Any())
            {
                var orphanItems = await _db.PmScheduleItems
                    .Where(i => pendingScheduleIds.Contains(i.PmScheduleId) &&
                                (i.SparepartId == spId || i.SparepartName == spName))
                    .ToListAsync();
                if (orphanItems.Any())
                {
                    _db.PmScheduleItems.RemoveRange(orphanItems);
                }
            }

            await _db.SaveChangesAsync();

            return Json(new { success = true, message = "Item standar sparepart berhasil dihapus." });
        }

        [HttpGet]
        public async Task<IActionResult> GetPmSpareparts(int id)
        {
            var pmSchedule = await _db.PmSchedules.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);

            var rawItems = await _db.PmScheduleItems
                .AsNoTracking()
                .Where(i => i.PmScheduleId == id)
                .OrderBy(i => i.Id)
                .ToListAsync();

            if (pmSchedule != null && rawItems.Any() && string.Equals(pmSchedule.Status, "P", StringComparison.OrdinalIgnoreCase))
            {
                string title = pmSchedule.Title ?? "";
                var allTemplates = await _db.PmStandardParts.AsNoTracking().ToListAsync();

                // Find templates for this schedule's line
                var matchingTemplates = allTemplates.Where(t =>
                    !string.IsNullOrEmpty(t.Line) &&
                    (title.Contains(t.Line, StringComparison.OrdinalIgnoreCase) ||
                     (pmSchedule.UpArea != null && pmSchedule.UpArea.Contains(t.Line, StringComparison.OrdinalIgnoreCase)))
                ).ToList();

                // Filter out rawItems that were removed from PmStandardParts for this line
                rawItems = rawItems.Where(i => matchingTemplates.Any(t =>
                    string.Equals(t.SparepartId, i.SparepartId, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(t.SparepartName, i.SparepartName, StringComparison.OrdinalIgnoreCase)
                )).ToList();
            }

            var spIds = rawItems.Select(i => i.SparepartId).Where(sp => !string.IsNullOrEmpty(sp)).Distinct().ToList();
            var spNames = rawItems.Select(i => i.SparepartName).Where(name => !string.IsNullOrEmpty(name)).Distinct().ToList();

            var masterList = await _db.MasterDatas.AsNoTracking()
                .Where(m => !m.IsDeleted && (spIds.Contains(m.Id) || spNames.Contains(m.Item)))
                .ToListAsync();

            var binById = masterList.Where(m => !string.IsNullOrEmpty(m.Id) && !string.IsNullOrEmpty(m.Bin) && m.Bin != "-")
                .ToLookup(m => m.Id, m => m.Bin, StringComparer.OrdinalIgnoreCase);
            var binByName = masterList.Where(m => !string.IsNullOrEmpty(m.Item) && !string.IsNullOrEmpty(m.Bin) && m.Bin != "-")
                .ToLookup(m => m.Item, m => m.Bin, StringComparer.OrdinalIgnoreCase);

            List<BarangKeluar> bkList = new List<BarangKeluar>();
            if (pmSchedule != null)
            {
                int targetYear = pmSchedule.ScheduledDate.Year;
                int targetMonth = pmSchedule.ScheduledDate.Month;
                bkList = await _db.BarangKeluars.AsNoTracking()
                    .Where(b => b.MaintenanceType != null &&
                                b.MaintenanceType.ToUpper().Contains("PM") &&
                                b.Tanggal.Year == targetYear &&
                                b.Tanggal.Month == targetMonth)
                    .ToListAsync();
            }

            var items = rawItems.Select(i => {
                string binVal = binById[i.SparepartId].FirstOrDefault()
                             ?? binByName[i.SparepartName].FirstOrDefault();

                if (string.IsNullOrEmpty(binVal) && !string.IsNullOrEmpty(i.Notes))
                {
                    var matchBin = System.Text.RegularExpressions.Regex.Match(i.Notes, @"Bin:\s*([^\s;,]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (matchBin.Success) binVal = matchBin.Groups[1].Value;
                    else if (!i.Notes.StartsWith("[")) binVal = i.Notes;
                }

                bool isIssued = bkList.Any(b =>
                    (!string.IsNullOrEmpty(i.SparepartId) && b.MasterDataId != null && b.MasterDataId.Equals(i.SparepartId, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(i.SparepartName) && b.ItemName != null && b.ItemName.Equals(i.SparepartName, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(i.SparepartId) && b.ItemName != null && b.ItemName.Equals(i.SparepartId, StringComparison.OrdinalIgnoreCase))
                );

                return new
                {
                    id = i.Id,
                    sparepartId = i.SparepartId,
                    sparepartName = i.SparepartName,
                    bin = string.IsNullOrEmpty(binVal) ? "-" : binVal,
                    quantity = i.Quantity,
                    unit = i.Unit ?? "Pcs",
                    notes = i.Notes ?? (string.IsNullOrEmpty(binVal) ? "" : $"Bin: {binVal}"),
                    status = isIssued ? "Completed" : "Pending",
                    isCompleted = isIssued
                };
            }).ToList();

            return Json(items);
        }

        private async Task SavePmScheduleItemsAsync(int pmScheduleId, string[]? itemSparepartIds, string[]? itemSparepartNames, double[]? itemQuantities, string[]? itemUnits, string[]? itemNotes)
        {
            if (itemSparepartIds == null || itemSparepartIds.Length == 0) return;

            var itemsToAdd = new List<PmScheduleItem>();
            for (int i = 0; i < itemSparepartIds.Length; i++)
            {
                var spId = itemSparepartIds[i]?.Trim();
                if (string.IsNullOrWhiteSpace(spId)) continue;

                var name = (itemSparepartNames != null && i < itemSparepartNames.Length) ? itemSparepartNames[i] : spId;
                var qty = (itemQuantities != null && i < itemQuantities.Length && itemQuantities[i] > 0) ? itemQuantities[i] : 1;
                var unit = (itemUnits != null && i < itemUnits.Length) ? itemUnits[i] : "Pcs";
                var notes = (itemNotes != null && i < itemNotes.Length) ? itemNotes[i] : null;

                itemsToAdd.Add(new PmScheduleItem
                {
                    PmScheduleId = pmScheduleId,
                    SparepartId = spId,
                    SparepartName = name,
                    Quantity = qty,
                    Unit = unit,
                    Notes = notes,
                    CreatedAt = DateTime.Now
                });
            }

            if (itemsToAdd.Any())
            {
                _db.PmScheduleItems.AddRange(itemsToAdd);
                await _db.SaveChangesAsync();
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(
            PmSchedule model, 
            string[]? selectedLines, 
            string[]? selectedMachines, 
            string[]? selectedTechnicians,
            string[]? itemSparepartIds,
            string[]? itemSparepartNames,
            double[]? itemQuantities,
            string[]? itemUnits,
            string[]? itemNotes)
        {
            if (!await CanUserEditPmAsync())
            {
                if (string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(Request.Query["ajax"], "true", StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new { success = false, message = "Anda tidak memiliki izin edit PM (Mode View/Read-Only)." });
                }
                TempData["Error"] = "Anda tidak memiliki izin edit PM (Mode View/Read-Only).";
                return RedirectToAction(nameof(Index));
            }

            if (selectedLines != null && selectedLines.Any(l => !string.IsNullOrWhiteSpace(l)))
            {
                model.Title = string.Join(", ", selectedLines.Where(l => !string.IsNullOrWhiteSpace(l)).Distinct());
            }

            if (selectedMachines != null && selectedMachines.Any(m => !string.IsNullOrWhiteSpace(m)))
            {
                model.MachineName = string.Join(", ", selectedMachines.Where(m => !string.IsNullOrWhiteSpace(m)).Distinct());
            }

            if (selectedTechnicians != null && selectedTechnicians.Any(t => !string.IsNullOrWhiteSpace(t)))
            {
                model.Technician = string.Join(", ", selectedTechnicians.Where(t => !string.IsNullOrWhiteSpace(t)).Distinct());
            }

            if (string.IsNullOrWhiteSpace(model.Title))
            {
                TempData["Error"] = "Line PM wajib dipilih.";
                return RedirectToAction(nameof(Index), new { year = model.ScheduledDate.Year, month = model.ScheduledDate.Month });
            }

            if (string.IsNullOrWhiteSpace(model.UpArea))
            {
                model.UpArea = GetAreaFromLine(model.Title);
            }

            if (!string.IsNullOrEmpty(model.MachineName))
            {
                var names = model.MachineName.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                var allMasterMachines = await _db.MachineMasters.AsNoTracking().ToListAsync();
                var matched = allMasterMachines
                    .Where(m => names.Any(n => n.Equals(m.MachineName, StringComparison.OrdinalIgnoreCase) || n.Equals(m.MachineCode, StringComparison.OrdinalIgnoreCase)))
                    .ToList();
                if (matched.Any())
                {
                    model.MachineCode = string.Join(", ", matched.Select(m => m.MachineCode).Distinct());
                    if (matched.Count == 1)
                    {
                        model.MachineId = matched.First().Id;
                    }
                }
            }

            model.Status = (model.Status ?? "P").Trim().ToUpper();
            if (!new[] { "P", "E", "R", "M" }.Contains(model.Status))
            {
                model.Status = "P";
            }

            // Real-time current time attachment for scheduled_date
            var nowTime = DateTime.Now;
            model.ScheduledDate = model.ScheduledDate.Date.Add(nowTime.TimeOfDay);

            model.CreatedAt = nowTime;
            model.CreatedBy = User.Identity?.Name ?? "System";

            _db.PmSchedules.Add(model);
            await _db.SaveChangesAsync();

            // Save attached sparepart checklist items
            await SavePmScheduleItemsAsync(model.Id, itemSparepartIds, itemSparepartNames, itemQuantities, itemUnits, itemNotes);

            if (string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(Request.Query["ajax"], "true", StringComparison.OrdinalIgnoreCase))
            {
                return Json(new { success = true, message = $"Jadwal PM untuk Line '{model.Title}' berhasil ditambahkan." });
            }

            TempData["Success"] = $"Jadwal PM untuk Line '{model.Title}' berhasil ditambahkan.";
            return RedirectToAction(nameof(Index), new { year = model.ScheduledDate.Year, month = model.ScheduledDate.Month });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateStatus(int id, string status, string? notes)
        {
            if (!await CanUserEditPmAsync())
            {
                return Json(new { success = false, message = "Anda tidak memiliki izin edit status PM (Mode View/Read-Only)." });
            }

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
        public async Task<IActionResult> UpdateDate(int id, DateTime newDate)
        {
            var item = await _db.PmSchedules.FindAsync(id);
            if (item == null)
            {
                return Json(new { success = false, message = "Jadwal PM tidak ditemukan." });
            }

            var nowTime = DateTime.Now;
            item.ScheduledDate = newDate.Date.Add(nowTime.TimeOfDay);
            item.UpdatedAt = nowTime;
            item.UpdatedBy = User.Identity?.Name ?? "System";

            await _db.SaveChangesAsync();
            return Json(new { success = true, message = $"Jadwal PM '{item.Title}' berhasil dipindahkan ke {newDate:yyyy-MM-dd}." });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DuplicateDate(int id, DateTime newDate)
        {
            var item = await _db.PmSchedules.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (item == null)
            {
                return Json(new { success = false, message = "Jadwal PM asal tidak ditemukan." });
            }

            var nowTime = DateTime.Now;
            var duplicate = new PmSchedule
            {
                Title = item.Title,
                MachineId = item.MachineId,
                MachineCode = item.MachineCode,
                MachineName = item.MachineName,
                ScheduledDate = newDate.Date.Add(nowTime.TimeOfDay),
                Status = item.Status,
                Technician = item.Technician,
                UpArea = item.UpArea ?? GetAreaFromLine(item.Title),
                Notes = item.Notes,
                CreatedAt = nowTime,
                CreatedBy = User.Identity?.Name ?? "System"
            };

            _db.PmSchedules.Add(duplicate);
            await _db.SaveChangesAsync();

            return Json(new { success = true, message = $"Jadwal PM '{duplicate.Title}' berhasil diduplikasi ke {newDate:yyyy-MM-dd}." });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(
            PmSchedule model, 
            string[]? selectedLines, 
            string[]? selectedMachines, 
            string[]? selectedTechnicians,
            string[]? itemSparepartIds,
            string[]? itemSparepartNames,
            double[]? itemQuantities,
            string[]? itemUnits,
            string[]? itemNotes)
        {
            if (!await CanUserEditPmAsync())
            {
                if (string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(Request.Query["ajax"], "true", StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new { success = false, message = "Anda tidak memiliki izin edit PM (Mode View/Read-Only)." });
                }
                TempData["Error"] = "Anda tidak memiliki izin edit PM (Mode View/Read-Only).";
                return RedirectToAction(nameof(Index));
            }

            var item = await _db.PmSchedules.FindAsync(model.Id);
            if (item == null)
            {
                TempData["Error"] = "Jadwal PM tidak ditemukan.";
                return RedirectToAction(nameof(Index));
            }

            if (selectedLines != null && selectedLines.Any(l => !string.IsNullOrWhiteSpace(l)))
            {
                item.Title = string.Join(", ", selectedLines.Where(l => !string.IsNullOrWhiteSpace(l)).Distinct());
            }
            else if (!string.IsNullOrWhiteSpace(model.Title))
            {
                item.Title = model.Title;
            }

            if (!string.IsNullOrWhiteSpace(model.UpArea))
            {
                item.UpArea = model.UpArea;
            }
            else
            {
                item.UpArea = GetAreaFromLine(item.Title);
            }

            if (selectedMachines != null && selectedMachines.Any(m => !string.IsNullOrWhiteSpace(m)))
            {
                item.MachineName = string.Join(", ", selectedMachines.Where(m => !string.IsNullOrWhiteSpace(m)).Distinct());
            }
            else if (!string.IsNullOrWhiteSpace(model.MachineName))
            {
                item.MachineName = model.MachineName;
            }

            if (selectedTechnicians != null && selectedTechnicians.Any(t => !string.IsNullOrWhiteSpace(t)))
            {
                item.Technician = string.Join(", ", selectedTechnicians.Where(t => !string.IsNullOrWhiteSpace(t)).Distinct());
            }
            else if (!string.IsNullOrWhiteSpace(model.Technician))
            {
                item.Technician = model.Technician;
            }

            var nowTime = DateTime.Now;
            item.ScheduledDate = model.ScheduledDate.Date.Add(nowTime.TimeOfDay);
            item.Status = (model.Status ?? "P").Trim().ToUpper();
            if (!new[] { "P", "E", "R", "M" }.Contains(item.Status))
            {
                item.Status = "P";
            }

            if (!string.IsNullOrEmpty(item.MachineName))
            {
                var names = item.MachineName.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                var allMasterMachines = await _db.MachineMasters.AsNoTracking().ToListAsync();
                var matched = allMasterMachines
                    .Where(m => names.Any(n => n.Equals(m.MachineName, StringComparison.OrdinalIgnoreCase) || n.Equals(m.MachineCode, StringComparison.OrdinalIgnoreCase)))
                    .ToList();
                if (matched.Any())
                {
                    item.MachineCode = string.Join(", ", matched.Select(m => m.MachineCode).Distinct());
                    item.MachineId = matched.Count == 1 ? matched.First().Id : (int?)null;
                }
            }

            item.Notes = model.Notes;
            item.UpdatedAt = nowTime;
            item.UpdatedBy = User.Identity?.Name ?? "System";

            await _db.SaveChangesAsync();

            // Clear old sparepart items and replace with updated checklist items
            var existingItems = await _db.PmScheduleItems.Where(i => i.PmScheduleId == item.Id).ToListAsync();
            if (existingItems.Any())
            {
                _db.PmScheduleItems.RemoveRange(existingItems);
                await _db.SaveChangesAsync();
            }

            await SavePmScheduleItemsAsync(item.Id, itemSparepartIds, itemSparepartNames, itemQuantities, itemUnits, itemNotes);

            if (string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(Request.Query["ajax"], "true", StringComparison.OrdinalIgnoreCase))
            {
                return Json(new { success = true, message = $"Jadwal PM Line '{item.Title}' berhasil diperbarui." });
            }

            TempData["Success"] = $"Jadwal PM Line '{item.Title}' berhasil diperbarui.";
            return RedirectToAction(nameof(Index), new { year = item.ScheduledDate.Year, month = item.ScheduledDate.Month });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CopyMonthPlan(int sourceYear, int sourceMonth)
        {
            if (!await CanUserEditPmAsync())
            {
                return Json(new { success = false, message = "Anda tidak memiliki izin menyalin plan PM (Mode View/Read-Only)." });
            }

            int targetYear = sourceYear;
            int targetMonth = sourceMonth + 1;
            if (targetMonth > 12)
            {
                targetMonth = 1;
                targetYear++;
            }

            var sourceSchedules = await _db.PmSchedules
                .AsNoTracking()
                .Where(p => p.ScheduledDate.Year == sourceYear && p.ScheduledDate.Month == sourceMonth)
                .ToListAsync();

            if (!sourceSchedules.Any())
            {
                return Json(new { success = false, message = $"Tidak ada jadwal PM ditemukan pada bulan {sourceMonth}/{sourceYear} untuk disalin." });
            }

            var sourceIds = sourceSchedules.Select(s => s.Id).ToList();
            var sourceItems = await _db.PmScheduleItems
                .AsNoTracking()
                .Where(i => sourceIds.Contains(i.PmScheduleId))
                .ToListAsync();

            int daysInTargetMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            int copiedScheduleCount = 0;
            int copiedItemCount = 0;
            var nowTime = DateTime.Now;

            foreach (var src in sourceSchedules)
            {
                int targetDay = Math.Min(src.ScheduledDate.Day, daysInTargetMonth);
                DateTime targetDate = new DateTime(targetYear, targetMonth, targetDay).Add(nowTime.TimeOfDay);

                var newSchedule = new PmSchedule
                {
                    Title = src.Title,
                    MachineId = src.MachineId,
                    MachineCode = src.MachineCode,
                    MachineName = src.MachineName,
                    ScheduledDate = targetDate,
                    Status = "P", // Always reset copied schedule status to Planning
                    Technician = src.Technician,
                    UpArea = src.UpArea ?? GetAreaFromLine(src.Title),
                    Notes = src.Notes,
                    CreatedAt = DateTime.Now,
                    CreatedBy = User.Identity?.Name ?? "System Copy"
                };

                _db.PmSchedules.Add(newSchedule);
                await _db.SaveChangesAsync(); // generate newSchedule.Id
                copiedScheduleCount++;

                var matchingItems = sourceItems.Where(i => i.PmScheduleId == src.Id).ToList();
                foreach (var mi in matchingItems)
                {
                    _db.PmScheduleItems.Add(new PmScheduleItem
                    {
                        PmScheduleId = newSchedule.Id,
                        SparepartId = mi.SparepartId,
                        SparepartName = mi.SparepartName,
                        Quantity = mi.Quantity,
                        Unit = mi.Unit ?? "Pcs",
                        Notes = mi.Notes,
                        CreatedAt = DateTime.Now
                    });
                    copiedItemCount++;
                }
            }

            if (copiedItemCount > 0)
            {
                await _db.SaveChangesAsync();
            }

            string sourceMonthName = new DateTime(sourceYear, sourceMonth, 1).ToString("MMMM yyyy", new System.Globalization.CultureInfo("id-ID"));
            string targetMonthName = new DateTime(targetYear, targetMonth, 1).ToString("MMMM yyyy", new System.Globalization.CultureInfo("id-ID"));

            return Json(new
            {
                success = true,
                message = $"Berhasil menyalin {copiedScheduleCount} jadwal PM (dengan {copiedItemCount} kebutuhan sparepart) dari {sourceMonthName} ke {targetMonthName}.",
                targetYear,
                targetMonth
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id, string? view = null)
        {
            if (!await CanUserEditPmAsync())
            {
                if (string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(Request.Query["ajax"], "true", StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new { success = false, message = "Anda tidak memiliki izin hapus PM (Mode View/Read-Only)." });
                }
                TempData["Error"] = "Anda tidak memiliki izin hapus PM (Mode View/Read-Only).";
                return RedirectToAction(nameof(Index), new { view });
            }

            var item = await _db.PmSchedules.FindAsync(id);
            if (item == null)
            {
                TempData["Error"] = "Jadwal PM tidak ditemukan.";
                return RedirectToAction(nameof(Index), new { view });
            }

            int year = item.ScheduledDate.Year;
            int month = item.ScheduledDate.Month;

            _db.PmSchedules.Remove(item);
            await _db.SaveChangesAsync();

            if (string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(Request.Query["ajax"], "true", StringComparison.OrdinalIgnoreCase))
            {
                return Json(new { success = true, message = $"Jadwal PM '{item.Title}' berhasil dihapus." });
            }

            TempData["Success"] = $"Jadwal PM '{item.Title}' berhasil dihapus.";
            return RedirectToAction(nameof(Index), new { year, month, view });
        }

        [HttpGet]
        public async Task<IActionResult> ExportExcel(int? year, int? month, string[]? line, string[]? machine, string? status, string[]? technician, string? search)
        {
            int selYear = year ?? DateTime.Now.Year;
            int selMonth = month ?? DateTime.Now.Month;

            var selectedLines = line?.SelectMany(l => l.Split(',', StringSplitOptions.RemoveEmptyEntries))
                                     .Select(l => l.Trim())
                                     .Where(l => !string.IsNullOrEmpty(l))
                                     .Distinct(StringComparer.OrdinalIgnoreCase)
                                     .ToList() ?? new List<string>();

            var selectedMachines = machine?.SelectMany(m => m.Split(',', StringSplitOptions.RemoveEmptyEntries))
                                           .Select(m => m.Trim())
                                           .Where(m => !string.IsNullOrEmpty(m))
                                           .Distinct(StringComparer.OrdinalIgnoreCase)
                                           .ToList() ?? new List<string>();

            var selectedTechnicians = technician?.SelectMany(t => t.Split(',', StringSplitOptions.RemoveEmptyEntries))
                                                 .Select(t => t.Trim())
                                                 .Where(t => !string.IsNullOrEmpty(t))
                                                 .Distinct(StringComparer.OrdinalIgnoreCase)
                                                 .ToList() ?? new List<string>();

            var rawData = await _db.PmSchedules
                .AsNoTracking()
                .Where(p => p.ScheduledDate.Year == selYear && p.ScheduledDate.Month == selMonth)
                .OrderBy(p => p.ScheduledDate)
                .ToListAsync();

            var filtered = rawData.AsEnumerable();

            if (selectedLines.Any())
            {
                filtered = filtered.Where(p => selectedLines.Any(l =>
                    (!string.IsNullOrEmpty(p.Title) && p.Title.Contains(l, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineName) && p.MachineName.Contains(l, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineCode) && p.MachineCode.Contains(l, StringComparison.OrdinalIgnoreCase))));
            }

            if (selectedMachines.Any())
            {
                filtered = filtered.Where(p => selectedMachines.Any(m =>
                    (!string.IsNullOrEmpty(p.MachineName) && p.MachineName.Contains(m, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineCode) && p.MachineCode.Contains(m, StringComparison.OrdinalIgnoreCase))));
            }

            if (selectedTechnicians.Any())
            {
                filtered = filtered.Where(p => p.Technician != null && selectedTechnicians.Any(t => p.Technician.Contains(t, StringComparison.OrdinalIgnoreCase)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var s = status.Trim().ToUpper();
                filtered = filtered.Where(p =>
                    s == "P" ? (p.Status.Equals("P", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("planning", StringComparison.OrdinalIgnoreCase)) :
                    s == "E" ? (p.Status.Equals("E", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("execute", StringComparison.OrdinalIgnoreCase)) :
                    s == "R" ? (p.Status.Equals("R", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("revision", StringComparison.OrdinalIgnoreCase)) :
                    s == "M" ? (p.Status.Equals("M", StringComparison.OrdinalIgnoreCase) || p.Status.Equals("missed", StringComparison.OrdinalIgnoreCase)) :
                    p.Status.Equals(s, StringComparison.OrdinalIgnoreCase));
            }


            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                filtered = filtered.Where(p =>
                    (!string.IsNullOrEmpty(p.Title) && p.Title.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineName) && p.MachineName.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.MachineCode) && p.MachineCode.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.Technician) && p.Technician.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(p.Notes) && p.Notes.Contains(term, StringComparison.OrdinalIgnoreCase)));
            }

            var data = filtered.ToList();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add($"Jadwal PM {selYear}-{selMonth:D2}");

            // Header styling
            worksheet.Cell(1, 1).Value = "No";
            worksheet.Cell(1, 2).Value = "Tanggal PM";
            worksheet.Cell(1, 3).Value = "Line PM";
            worksheet.Cell(1, 4).Value = "Mesin PM";
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

        private static readonly HashSet<string> Up1Lines = new(StringComparer.OrdinalIgnoreCase)
        {
            "B10", "B15", "B16", "B5", "GENERAL",
            "J3", "J4", "J5",
            "T1", "T12", "T3", "T4", "T5", "T6", "T7", "T8", "T9",
            "VACANT", "WASHER"
        };

        public static string GetAreaFromLine(string? line)
        {
            if (string.IsNullOrWhiteSpace(line)) return "UP1";
            var parts = line.Split(new[] { ',', ';', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var p in parts)
            {
                var trimmed = p.Trim();
                if (Up1Lines.Contains(trimmed)) return "UP1";
            }
            foreach (var p in parts)
            {
                var trimmed = p.Trim().ToUpper();
                if (trimmed.StartsWith("J") || trimmed.StartsWith("T")) return "UP1";
            }
            return "UP2";
        }

        private static bool IsUp1Event(PmSchedule p, List<MachineMaster> masterMachines)
        {
            // 0. Direct up_area column check from pm_schedule DB table
            if (!string.IsNullOrWhiteSpace(p.UpArea))
            {
                return p.UpArea.Equals("UP1", StringComparison.OrdinalIgnoreCase);
            }

            // 1. Direct FK MachineId check against MachineMaster database table
            if (p.MachineId.HasValue)
            {
                var m = masterMachines.FirstOrDefault(x => x.Id == p.MachineId.Value);
                if (m != null)
                {
                    if (!string.IsNullOrWhiteSpace(m.Area))
                    {
                        return m.Area.Equals("UP1", StringComparison.OrdinalIgnoreCase);
                    }
                    if (!string.IsNullOrWhiteSpace(m.Line))
                    {
                        return GetAreaFromLine(m.Line).Equals("UP1", StringComparison.OrdinalIgnoreCase);
                    }
                }
            }

            // 2. MachineCode / MachineName matching against MachineMaster database table
            if (!string.IsNullOrWhiteSpace(p.MachineCode) || !string.IsNullOrWhiteSpace(p.MachineName))
            {
                var names = $"{p.MachineCode},{p.MachineName}".Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                var matchedMachine = masterMachines.FirstOrDefault(m =>
                    names.Any(n => n.Equals(m.MachineCode, StringComparison.OrdinalIgnoreCase) || n.Equals(m.MachineName, StringComparison.OrdinalIgnoreCase)));

                if (matchedMachine != null)
                {
                    if (!string.IsNullOrWhiteSpace(matchedMachine.Area))
                    {
                        return matchedMachine.Area.Equals("UP1", StringComparison.OrdinalIgnoreCase);
                    }
                    if (!string.IsNullOrWhiteSpace(matchedMachine.Line))
                    {
                        return GetAreaFromLine(matchedMachine.Line).Equals("UP1", StringComparison.OrdinalIgnoreCase);
                    }
                }
            }

            // 3. Fallback: Title (Line name) check using Master Machine Up1Lines reference mapping
            if (!string.IsNullOrWhiteSpace(p.Title))
            {
                return GetAreaFromLine(p.Title).Equals("UP1", StringComparison.OrdinalIgnoreCase);
            }

            return GetAreaFromLine($"{p.MachineName} {p.MachineCode}").Equals("UP1", StringComparison.OrdinalIgnoreCase);
        }

        private static List<object> CalculateMonthlyPerformance(List<PmSchedule> events, int selectedYear)
        {
            var result = new List<object>();
            for (int m = 1; m <= 12; m++)
            {
                var mItems = events.Where(p => p.ScheduledDate.Month == m).ToList();
                int pCnt = mItems.Count(e => e.Status.Equals("P", StringComparison.OrdinalIgnoreCase) || e.Status.Equals("planning", StringComparison.OrdinalIgnoreCase));
                int eCnt = mItems.Count(e => e.Status.Equals("E", StringComparison.OrdinalIgnoreCase) || e.Status.Equals("execute", StringComparison.OrdinalIgnoreCase));
                int rCnt = mItems.Count(e => e.Status.Equals("R", StringComparison.OrdinalIgnoreCase) || e.Status.Equals("revision", StringComparison.OrdinalIgnoreCase));
                int mCnt = mItems.Count(e => e.Status.Equals("M", StringComparison.OrdinalIgnoreCase) || e.Status.Equals("missed", StringComparison.OrdinalIgnoreCase));

                int totalPlanned = mItems.Count;
                int realization = eCnt;
                int denom = totalPlanned;
                double? compliancePct = denom > 0 ? Math.Round((double)eCnt / denom * 100.0, 1) : null;

                result.Add(new
                {
                    Month = m,
                    MonthName = new DateTime(selectedYear, m, 1).ToString("MMMM", new System.Globalization.CultureInfo("en-US")).ToUpper(),
                    ShortMonthName = new DateTime(selectedYear, m, 1).ToString("MMM", new System.Globalization.CultureInfo("en-US")).ToUpper(),
                    Planning = totalPlanned, // Total planned PMs for this month
                    Execute = eCnt,
                    Revision = rCnt,
                    Missed = mCnt,
                    TotalPlanned = totalPlanned,
                    Realization = realization,
                    CompliancePct = compliancePct
                });
            }
            return result;
        }
    }
}
