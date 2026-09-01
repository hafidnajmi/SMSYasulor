using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;
using UPMS.Web.Models.ViewModels;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class LineCompatibilityController : Controller
    {
        private readonly UpmsDbContext _db;

        public LineCompatibilityController(UpmsDbContext db)
        {
            _db = db;
        }

        // ── Helper: get area from line code (mirrors Python get_line_area) ──────
        private static string GetLineArea(string lineCode)
        {
            var up2Lines = new HashSet<string> { "B11", "B17", "B18", "B19", "B20", "B21", "B22", "B24", "S6", "S7", "S8", "S9", "S10", "S14", "S15", "S16", "S18", "S19", "S20" };
            if (up2Lines.Contains(lineCode)) return "UP2";
            if (lineCode.StartsWith("S")) return "UP2";
            return "UP1";
        }

        private static bool IsLineMatch(string? rawLine, string targetLine)
        {
            if (string.IsNullOrWhiteSpace(rawLine) || string.IsNullOrWhiteSpace(targetLine)) return false;
            if (rawLine.Equals(targetLine, StringComparison.OrdinalIgnoreCase)) return true;
            var parts = rawLine.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            return parts.Any(p => p.Equals(targetLine, StringComparison.OrdinalIgnoreCase));
        }

        // ============================================================
        // GET /LineCompatibility  (default: subTab = "line")
        // ============================================================
        public async Task<IActionResult> Index(
            string subTab = "line",
            string? selectedLine = null,
            string? selectedPartId = null,
            string? lineSearch = null,
            string? spSearch = null,
            string? detailSearch = null,
            string lineSort = "line_code",
            int partsPage = 1,
            string kpiTab = "parts")
        {
            var vm = new LineCompatibilityViewModel
            {
                SubTab = string.IsNullOrWhiteSpace(subTab) ? "line" : subTab.ToLower(),
                LineSearch = lineSearch ?? "",
                SpSearch = spSearch ?? "",
                DetailSearch = detailSearch ?? "",
                LineSort = lineSort,
                PartsPage = partsPage,
                KpiTab = kpiTab
            };

            // ── Load master parts, line mappings, and machines ──
            var allMasterParts   = await _db.MasterDatas.AsNoTracking().Where(m => !m.IsDeleted).ToListAsync();
            var lineMappings     = await _db.SparepartLineMappings.AsNoTracking().ToListAsync();
            var allMachines      = await _db.MachineMasters.AsNoTracking().ToListAsync();

            // ── Load all production lines from Master_Data + Barang_Keluar + Machine_Master ──
            var linesFromMaster  = allMasterParts.Where(m => m.Line != null && m.Line != "").Select(m => m.Line!).Distinct().ToList();
            var linesFromKeluar  = await _db.BarangKeluars.Where(b => b.Line != null && b.Line != "").Select(b => b.Line!).Distinct().ToListAsync();
            var linesFromMachine = allMachines.Where(m => m.Line != null && m.Line != "").Select(m => m.Line!).Distinct().ToList();
            
            var rawLines = linesFromMaster.Concat(linesFromKeluar).Concat(linesFromMachine);
            var allLines = rawLines
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .SelectMany(s => s.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
                .Distinct()
                .OrderBy(l => l)
                .ToList();

            // ── Build lines health summary ────────────────────────────────────────
            var lineHealthList = new List<LineHealthDto>();
            foreach (var line in allLines)
            {
                // filter by lineSearch
                if (!string.IsNullOrEmpty(vm.LineSearch) && !line.ToLower().Contains(vm.LineSearch.ToLower()))
                    continue;

                var partIdsFromMapping = lineMappings.Where(m => IsLineMatch(m.MappingSource, line) && m.IsActive == 1).Select(m => m.SparepartId);
                var partIdsFromMaster  = allMasterParts.Where(m => IsLineMatch(m.Line, line)).Select(m => m.Id);
                var compatiblePartsCount = partIdsFromMapping.Concat(partIdsFromMaster).Distinct().Count();

                var pendingReview    = lineMappings.Count(m => IsLineMatch(m.MappingSource, line) && m.Approved == 0);
                var totalMachines    = allMachines.Count(m => IsLineMatch(m.Line, line));
                var area             = GetLineArea(line);

                // Health status calculation
                string healthStatus = "Healthy";
                if (pendingReview > 0) healthStatus = "Warning";

                lineHealthList.Add(new LineHealthDto
                {
                    LineCode = line,
                    Area = area,
                    CompatibleParts = compatiblePartsCount,
                    PendingReview = pendingReview,
                    TotalMachines = totalMachines,
                    HealthStatus = healthStatus,
                    LastActivity = lineMappings.Where(m => IsLineMatch(m.MappingSource, line)).OrderByDescending(m => m.LastUsedAt ?? m.CreatedAt).Select(m => m.LastUsedAt ?? m.CreatedAt).FirstOrDefault()
                });
            }

            // Sort
            lineHealthList = lineSort switch
            {
                "cost"        => lineHealthList.OrderByDescending(l => l.CompatibleParts).ToList(),
                "health"      => lineHealthList.OrderBy(l => l.HealthStatus == "Critical" ? 0 : l.HealthStatus == "Warning" ? 1 : 2).ToList(),
                "machines"    => lineHealthList.OrderByDescending(l => l.TotalMachines).ToList(),
                "parts"       => lineHealthList.OrderByDescending(l => l.CompatibleParts).ToList(),
                _             => lineHealthList.OrderBy(l => l.LineCode).ToList()
            };

            vm.LinesHealth = lineHealthList;

            // ── Default selected line ──────────────────────────────────────────────
            if (string.IsNullOrEmpty(selectedLine) && lineHealthList.Any())
                selectedLine = lineHealthList.First().LineCode;
            vm.SelectedLine = selectedLine;

            // ── Load spareparts compatible with selected line ──────────────────────
            if (!string.IsNullOrEmpty(selectedLine))
            {
                var partIdsForLine  = lineMappings.Where(m => IsLineMatch(m.MappingSource, selectedLine)).Select(m => m.SparepartId).ToList();
                var directPartIds   = allMasterParts.Where(m => IsLineMatch(m.Line, selectedLine)).Select(m => m.Id).ToList();
                var combinedPartIds = partIdsForLine.Concat(directPartIds).Distinct().ToList();

                var allParts = allMasterParts.Where(m => combinedPartIds.Contains(m.Id)).ToList();

                // Apply detailSearch (search by Part #, Item Name, Machine, Bin, Category)
                if (!string.IsNullOrWhiteSpace(detailSearch))
                {
                    var q = detailSearch.Trim().ToLower();
                    allParts = allParts.Where(p =>
                        (p.Id?.ToLower().Contains(q) ?? false) ||
                        (p.Item?.ToLower().Contains(q) ?? false) ||
                        (p.Machine?.ToLower().Contains(q) ?? false) ||
                        (p.Bin?.ToLower().Contains(q) ?? false) ||
                        (p.Category?.ToLower().Contains(q) ?? false)
                    ).ToList();
                }

                vm.SelectedLineData = lineHealthList.FirstOrDefault(l => l.LineCode == selectedLine);

                // Always populate MachinesInLine for seamless client-side tab switching
                vm.MachinesInLine = allMachines.Where(m => IsLineMatch(m.Line, selectedLine)).ToList();
                if (!string.IsNullOrWhiteSpace(detailSearch) && kpiTab == "machines")
                {
                    var q = detailSearch.Trim().ToLower();
                    vm.MachinesInLine = vm.MachinesInLine.Where(m =>
                        (m.MachineCode?.ToLower().Contains(q) ?? false) ||
                        (m.MachineName?.ToLower().Contains(q) ?? false) ||
                        (m.MachineType?.ToLower().Contains(q) ?? false)
                    ).ToList();
                }
                else if (kpiTab == "pending")
                {
                    // handled below in pending tab
                }
                else
                {
                    // Parts list with paging (15 items per page to fill expanded container)
                    int pSize = 15;
                    int pTotal = Math.Max(1, (int)Math.Ceiling(allParts.Count / (double)pSize));
                    partsPage = Math.Max(1, Math.Min(partsPage, pTotal));
                    vm.PartsPage = partsPage;
                    vm.PartsTotalPages = pTotal;
                    vm.PartsTotalCount = allParts.Count;

                    vm.CompatibleParts = allParts
                        .Skip((partsPage - 1) * pSize)
                        .Take(pSize)
                        .Select(p =>
                        {
                            var mapping = lineMappings.FirstOrDefault(m => m.SparepartId == p.Id && IsLineMatch(m.MappingSource, selectedLine));
                            return new CompatiblePartDto
                            {
                                Id = p.Id,
                                Item = p.Item,
                                Machine = string.IsNullOrWhiteSpace(p.Machine) ? "-" : p.Machine,
                                Bin = p.Bin ?? "-",
                                Category = p.Category ?? "-",
                                LeadTime = p.LtPerMonth ?? 0,
                                CurrentStock = p.CurrentStock ?? 0,
                                CurrentPrice = p.CurrentUnitPrice ?? 0,
                                MappingSource = mapping?.MappingSource ?? selectedLine,
                                StatusDisplay = (mapping?.Approved == 1 || mapping == null) ? "Approved" : "Pending",
                                CompatibleSince = mapping?.CreatedAt
                            };
                        }).ToList();
                }
            }

            // ── MACHINE COMPATIBILITY TAB ─────────────────────────────────────────
            if (vm.SubTab == "machine")
            {
                var allSpareparts = await _db.MasterDatas.AsNoTracking().Where(m => !m.IsDeleted).ToListAsync();
                if (!string.IsNullOrEmpty(spSearch))
                    allSpareparts = allSpareparts.Where(p =>
                        (p.Id?.ToLower().Contains(spSearch.ToLower()) ?? false) ||
                        (p.Item?.ToLower().Contains(spSearch.ToLower()) ?? false) ||
                        (p.Bin?.ToLower().Contains(spSearch.ToLower()) ?? false)).ToList();

                vm.AllSpareparts = allSpareparts.Take(50).ToList();

                if (!string.IsNullOrEmpty(selectedPartId))
                {
                    vm.SelectedPartId = selectedPartId;
                    vm.SelectedPart = allSpareparts.FirstOrDefault(p => p.Id == selectedPartId);

                    // Machines compatible with this part via sparepart_line_mapping
                    var mappingsForPart = lineMappings.Where(m => m.SparepartId == selectedPartId && m.IsActive == 1).ToList();
                    var machineLines    = mappingsForPart.SelectMany(m => (m.MappingSource ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)).Distinct().ToList();
                    vm.MachinesForPart  = allMachines.Where(m => machineLines.Any(l => IsLineMatch(m.Line, l))).Select(m => new MachineCompatibilityDto
                    {
                        MachineId   = m.Id,
                        MachineCode = m.MachineCode,
                        MachineName = m.MachineName,
                        Line        = m.Line ?? "-",
                        MachineType = m.MachineType ?? "-",
                        Approved    = mappingsForPart.FirstOrDefault(mp => IsLineMatch(mp.MappingSource, m.Line))?.Approved == 1,
                        Source      = mappingsForPart.FirstOrDefault(mp => IsLineMatch(mp.MappingSource, m.Line))?.MappingSource ?? "MANUAL",
                        CreatedAt   = mappingsForPart.FirstOrDefault(mp => IsLineMatch(mp.MappingSource, m.Line))?.CreatedAt ?? DateTime.Now,
                        UsageCount  = mappingsForPart.FirstOrDefault(mp => IsLineMatch(mp.MappingSource, m.Line))?.UsageCount ?? 0
                    }).ToList();
                }
                else if (allSpareparts.Any())
                {
                    vm.SelectedPartId = allSpareparts.First().Id;
                    vm.SelectedPart   = allSpareparts.First();
                }
            }

            // ── PENDING REVIEW TAB ────────────────────────────────────────────────
            if (vm.SubTab == "pending")
            {
                var pendingMappings = lineMappings.Where(m => m.Approved == 0).ToList();
                var partIdsInPending = pendingMappings.Select(m => m.SparepartId).Distinct().ToList();
                var partsMap = await _db.MasterDatas.Where(p => partIdsInPending.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Item);

                vm.PendingReviews = pendingMappings.SelectMany(m =>
                {
                    var splitLines = (m.MappingSource ?? "AUTO").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                    if (!splitLines.Any()) splitLines = new[] { m.MappingSource ?? "AUTO" };
                    return splitLines.Select(singleLine => new PendingReviewDto
                    {
                        Id = m.Id,
                        PartNumber = m.SparepartId,
                        PartName   = partsMap.TryGetValue(m.SparepartId, out var n) ? n : "-",
                        Line       = singleLine,
                        Source     = singleLine,
                        Reason     = $"Checkout usage detected on line {singleLine}",
                        DateCreated = m.CreatedAt,
                        Status     = "Pending Review"
                    });
                }).OrderByDescending(m => m.DateCreated).ToList();
            }

            // ── STATISTICS TAB ────────────────────────────────────────────────────
            if (vm.SubTab == "statistics")
            {
                vm.Stats = new CompatibilityStatsDto
                {
                    TotalLines       = allLines.Count,
                    TotalMachines    = allMachines.Count,
                    TotalSpareparts  = lineMappings.Select(m => m.SparepartId).Distinct().Count(),
                    PendingMapping   = lineMappings.Count(m => m.Approved == 0),
                    ManualMapping    = lineMappings.Count(m => m.MappingSource == "MANUAL"),
                    AutoMapping      = lineMappings.Count(m => m.MappingSource != "MANUAL"),
                    TopLines         = lineHealthList.OrderByDescending(l => l.CompatibleParts).Take(5).Select(l => new TopLineDto { LineCode = l.LineCode, Count = l.CompatibleParts }).ToList(),
                    TopSpareparts    = lineMappings.GroupBy(m => m.SparepartId).OrderByDescending(g => g.Count()).Take(5)
                        .Select(g => new TopSpDto { SparepartId = g.Key, Count = g.Count() }).ToList(),
                    GrowthMonthly    = lineMappings.GroupBy(m => m.CreatedAt.ToString("yyyy-MM")).OrderBy(g => g.Key).TakeLast(6)
                        .Select(g => new GrowthDto { Label = g.Key, Value = g.Count() }).ToList()
                };
            }

            return View(vm);
        }

        // ── Add Line Mapping ──────────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddLineMapping(string sparepartId, string lineName)
        {
            if (string.IsNullOrWhiteSpace(sparepartId) || string.IsNullOrWhiteSpace(lineName))
            {
                TempData["Error"] = "Part Number and Production Line are required.";
                return RedirectToAction("Index", new { subTab = "line" });
            }

            // Check if already exists
            var exists = await _db.SparepartLineMappings.AnyAsync(m => m.SparepartId == sparepartId && m.MappingSource == lineName && m.IsActive == 1);
            if (exists)
            {
                TempData["Error"] = $"Mapping for {sparepartId} on line {lineName} already exists.";
                return RedirectToAction("Index", new { subTab = "line", selectedLine = lineName });
            }

            var mapping = new SparepartLineMapping
            {
                SparepartId   = sparepartId.Trim(),
                MappingSource = lineName.Trim(),
                CreatedAt     = DateTime.Now,
                IsActive      = 1,
                Approved      = 1
            };
            _db.SparepartLineMappings.Add(mapping);
            await _db.SaveChangesAsync();
            TempData["Success"] = $"✓ Registered compatibility: Part {sparepartId} → Line {lineName}";
            return RedirectToAction("Index", new { subTab = "line", selectedLine = lineName });
        }

        // ── Deactivate / Delete Line Mapping ─────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeactivateLineMapping(int id, string returnLine = "")
        {
            var map = await _db.SparepartLineMappings.FindAsync(id);
            if (map != null)
            {
                _db.SparepartLineMappings.Remove(map);
                await _db.SaveChangesAsync();
                TempData["Success"] = $"Line mapping #{id} removed.";
            }
            return RedirectToAction("Index", new { subTab = "line", selectedLine = returnLine });
        }

        // ── Approve / Reject Pending ──────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ApprovePending(int id)
        {
            var map = await _db.SparepartLineMappings.FindAsync(id);
            if (map != null) { map.Approved = 1; await _db.SaveChangesAsync(); TempData["Success"] = "Compatibility approved."; }
            return RedirectToAction("Index", new { subTab = "pending" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RejectPending(int id)
        {
            var map = await _db.SparepartLineMappings.FindAsync(id);
            if (map != null) { _db.SparepartLineMappings.Remove(map); await _db.SaveChangesAsync(); TempData["Success"] = "Compatibility rejected and removed."; }
            return RedirectToAction("Index", new { subTab = "pending" });
        }
    }
}
