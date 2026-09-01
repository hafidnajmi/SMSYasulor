using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Controllers
{
    public class MonthlyTrendDto
    {
        public string YearMonth { get; set; } = "";
        public string MonthLabel { get; set; } = "";
        public decimal TotalCost { get; set; }
        public double TotalQty { get; set; }
        public int TransactionCount { get; set; }
        public double GrowthPct { get; set; }
        public bool IsSpike { get; set; }
    }

    public class LineCostDto
    {
        public string Line { get; set; } = "Unknown";
        public int TotalMachine { get; set; }
        public int TransactionCount { get; set; }
        public int UniqueSparepartCount { get; set; }
        public decimal TotalCost { get; set; }
    }

    public class MachineCostDto
    {
        public int MachineId { get; set; }
        public string MachineCode { get; set; } = "-";
        public string MachineName { get; set; } = "-";
        public string MachineType { get; set; } = "-";
        public string Status { get; set; } = "ACTIVE";
        public string Line { get; set; } = "-";
        public double TotalQty { get; set; }
        public decimal TotalCost { get; set; }
        public int TransactionCount { get; set; }
        public int UniqueSparepartCount { get; set; }
    }

    public class CostIntelligenceViewModel
    {
        public string StartDate { get; set; } = DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd");
        public string EndDate { get; set; } = DateTime.Today.ToString("yyyy-MM-dd");
        public string SelectedLine { get; set; } = "All";
        public string ActiveTab { get; set; } = "line";

        public decimal TotalCost { get; set; }
        public double TotalQtyIssued { get; set; }
        public int UniqueSparepartsCount { get; set; }

        public bool HasRecentSpike { get; set; }
        public string SpikeAlertMessage { get; set; } = "";

        public List<string> AvailableLines { get; set; } = new();
        public List<MonthlyTrendDto> MonthlyTrends { get; set; } = new();
        public List<LineCostDto> LineCosts { get; set; } = new();
        public List<MachineCostDto> MachineCosts { get; set; } = new();
    }

    [Authorize]
    public class CostIntelligenceController : Controller
    {
        private readonly UpmsDbContext _db;

        public CostIntelligenceController(UpmsDbContext db)
        {
            _db = db;
        }

        private static bool IsLineMatch(string? rawLine, string selectedLine)
        {
            if (string.IsNullOrWhiteSpace(selectedLine) || selectedLine.Equals("All", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.IsNullOrWhiteSpace(rawLine)) return false;
            var parts = rawLine.Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries);
            return parts.Any(p => p.Trim().Equals(selectedLine.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        public async Task<IActionResult> Index(string? startDate, string? endDate, string? line, string tab = "line")
        {
            var vm = new CostIntelligenceViewModel();

            DateTime start = DateTime.Today.AddDays(-30);
            if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var parsedStart))
            {
                start = parsedStart.Date;
            }
            DateTime end = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var parsedEnd))
            {
                end = parsedEnd.Date;
            }

            vm.StartDate = start.ToString("yyyy-MM-dd");
            vm.EndDate = end.ToString("yyyy-MM-dd");
            vm.SelectedLine = string.IsNullOrWhiteSpace(line) ? "All" : line.Trim();
            vm.ActiveTab = string.Equals(tab, "machine", StringComparison.OrdinalIgnoreCase) ? "machine" : "line";

            // End date inclusive filter (up to end of day 23:59:59)
            DateTime endInclusive = end.AddDays(1).AddTicks(-1);

            // Available lines for dropdown (split comma-separated line codes into individual lines matching Spareparts Catalog)
            var masterLines = await _db.MasterDatas
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line!)
                .Distinct()
                .ToListAsync();

            var bkLines = await _db.BarangKeluars
                .Where(b => !string.IsNullOrEmpty(b.Line))
                .Select(b => b.Line!)
                .Distinct()
                .ToListAsync();

            vm.AvailableLines = masterLines.Concat(bkLines)
                .SelectMany(l => l.Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries))
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(l => l)
                .ToList();

            // Base BarangKeluar query (Approved or null approval_status)
            var bkQuery = _db.BarangKeluars
                .Where(b => b.Tanggal >= start && b.Tanggal <= endInclusive && (b.ApprovalStatus == null || b.ApprovalStatus.ToLower() == "approved"))
                .AsNoTracking();

            // Calculate Global KPIs across the selected date range
            var globalList = await bkQuery.ToListAsync();
            vm.TotalCost = globalList.Sum(b => b.TotalCost ?? (decimal)(b.Qty * (double)(b.UnitPrice ?? 0m)));
            vm.TotalQtyIssued = globalList.Sum(b => b.Qty);
            vm.UniqueSparepartsCount = globalList
                .Where(b => !string.IsNullOrWhiteSpace(b.MasterDataId))
                .Select(b => b.MasterDataId!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count();

            // 12-Month Historical Monthly Expenditure Trend & Spike Detection
            var start12M = DateTime.Today.AddMonths(-11).Date;
            start12M = new DateTime(start12M.Year, start12M.Month, 1);

            var trendBkList = await _db.BarangKeluars
                .Where(b => b.Tanggal >= start12M && (b.ApprovalStatus == null || b.ApprovalStatus.ToLower() == "approved"))
                .AsNoTracking()
                .ToListAsync();

            if (vm.SelectedLine != "All")
            {
                trendBkList = trendBkList.Where(b => IsLineMatch(b.Line, vm.SelectedLine)).ToList();
            }

            var monthlyTrends = new List<MonthlyTrendDto>();
            for (int i = 11; i >= 0; i--)
            {
                var mDate = DateTime.Today.AddMonths(-i);
                int yr = mDate.Year;
                int mo = mDate.Month;

                var mItems = trendBkList.Where(b => b.Tanggal.Year == yr && b.Tanggal.Month == mo).ToList();
                decimal costSum = mItems.Sum(b => b.TotalCost ?? (decimal)(b.Qty * (double)(b.UnitPrice ?? 0m)));
                double qtySum = mItems.Sum(b => b.Qty);
                int txCount = mItems.Count();

                monthlyTrends.Add(new MonthlyTrendDto
                {
                    YearMonth = $"{yr}-{mo:D2}",
                    MonthLabel = mDate.ToString("MMM yyyy"),
                    TotalCost = costSum,
                    TotalQty = qtySum,
                    TransactionCount = txCount
                });
            }

            // Calculate MoM Growth & Spike Detection (> 20% Increase with >= Rp 1.000.000 jump)
            for (int i = 0; i < monthlyTrends.Count; i++)
            {
                if (i > 0)
                {
                    decimal prevCost = monthlyTrends[i - 1].TotalCost;
                    decimal currCost = monthlyTrends[i].TotalCost;

                    if (prevCost > 0)
                    {
                        double growth = (double)((currCost - prevCost) / prevCost) * 100.0;
                        monthlyTrends[i].GrowthPct = Math.Round(growth, 1);

                        if (growth >= 20.0 && (currCost - prevCost) >= 1000000m)
                        {
                            monthlyTrends[i].IsSpike = true;
                        }
                    }
                    else if (currCost >= 2000000m)
                    {
                        monthlyTrends[i].GrowthPct = 100.0;
                        monthlyTrends[i].IsSpike = true;
                    }
                }
            }

            vm.MonthlyTrends = monthlyTrends;

            var recentSpike = monthlyTrends.LastOrDefault(t => t.IsSpike);
            if (recentSpike != null)
            {
                vm.HasRecentSpike = true;
                vm.SpikeAlertMessage = $"Cost Spike Alert: Expenditure in {recentSpike.MonthLabel} increased by +{recentSpike.GrowthPct:N1}% compared to previous month.";
            }

            // 1. Cost per Line Data (Expanded per individual line code)
            var lineExpanded = new List<(string SingleLine, BarangKeluar Bk)>();
            foreach (var bk in globalList)
            {
                var raw = string.IsNullOrWhiteSpace(bk.Line) ? "Unknown" : bk.Line.Trim();
                var splitLines = raw.Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
                                    .Select(p => p.Trim())
                                    .Where(p => !string.IsNullOrWhiteSpace(p))
                                    .Distinct(StringComparer.OrdinalIgnoreCase)
                                    .ToList();
                if (!splitLines.Any())
                {
                    lineExpanded.Add(("Unknown", bk));
                }
                else
                {
                    foreach (var sl in splitLines)
                    {
                        lineExpanded.Add((sl, bk));
                    }
                }
            }

            var lineGroups = lineExpanded
                .GroupBy(x => x.SingleLine, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var machineMasters = await _db.MachineMasters.AsNoTracking().ToListAsync();

            vm.LineCosts = lineGroups.Select(g => {
                string lName = g.Key;
                int machCount = machineMasters.Count(m => IsLineMatch(m.Line, lName));
                var bkItems = g.Select(x => x.Bk).ToList();
                int txCount = bkItems.Count;
                int uniqueSp = bkItems.Where(b => !string.IsNullOrWhiteSpace(b.MasterDataId))
                                      .Select(b => b.MasterDataId!.Trim())
                                      .Distinct(StringComparer.OrdinalIgnoreCase)
                                      .Count();
                decimal costSum = bkItems.Sum(b => b.TotalCost ?? (decimal)(b.Qty * (double)(b.UnitPrice ?? 0m)));

                return new LineCostDto
                {
                    Line = lName,
                    TotalMachine = machCount,
                    TransactionCount = txCount,
                    UniqueSparepartCount = uniqueSp,
                    TotalCost = costSum
                };
            }).OrderByDescending(x => x.TotalCost).ToList();

            // 2. Cost per Machine Data
            var machineBkQuery = globalList.Where(b => b.MachineId.HasValue).ToList();
            if (vm.SelectedLine != "All")
            {
                machineBkQuery = machineBkQuery.Where(b => IsLineMatch(b.Line, vm.SelectedLine)).ToList();
            }

            var machineGroups = machineBkQuery.GroupBy(b => b.MachineId!.Value).ToList();
            var machineDict = machineMasters.ToDictionary(m => m.Id);

            vm.MachineCosts = machineGroups.Select(g => {
                int mId = g.Key;
                machineDict.TryGetValue(mId, out var mObj);

                double sumQty = g.Sum(b => b.Qty);
                decimal sumCost = g.Sum(b => b.TotalCost ?? (decimal)(b.Qty * (double)(b.UnitPrice ?? 0m)));
                int txCnt = g.Count();
                int uniqueSp = g.Where(b => !string.IsNullOrWhiteSpace(b.MasterDataId))
                                .Select(b => b.MasterDataId!.Trim())
                                .Distinct(StringComparer.OrdinalIgnoreCase)
                                .Count();

                return new MachineCostDto
                {
                    MachineId = mId,
                    MachineCode = mObj?.MachineCode ?? $"MACH-{mId}",
                    MachineName = mObj?.MachineName ?? "Unknown Machine",
                    MachineType = mObj?.MachineType ?? "-",
                    Status = (mObj?.Status ?? "active").ToUpper(),
                    Line = mObj?.Line ?? g.FirstOrDefault()?.Line ?? "-",
                    TotalQty = sumQty,
                    TotalCost = sumCost,
                    TransactionCount = txCnt,
                    UniqueSparepartCount = uniqueSp
                };
            }).OrderByDescending(x => x.TotalCost).ToList();

            return View(vm);
        }

        [HttpGet]
        public async Task<IActionResult> GetLineDrilldownJson(string lineName, string? startDate, string? endDate)
        {
            if (string.IsNullOrWhiteSpace(lineName)) return Json(new List<object>());

            DateTime start = DateTime.Today.AddDays(-30);
            if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var parsedStart)) start = parsedStart.Date;
            DateTime end = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var parsedEnd)) end = parsedEnd.Date;
            DateTime endInclusive = end.AddDays(1).AddTicks(-1);

            var items = (await _db.BarangKeluars
                .Where(b => b.Tanggal >= start && b.Tanggal <= endInclusive && (b.ApprovalStatus == null || b.ApprovalStatus.ToLower() == "approved"))
                .AsNoTracking()
                .ToListAsync())
                .Where(b => IsLineMatch(b.Line, lineName))
                .ToList();

            var groups = items.GroupBy(b => string.IsNullOrWhiteSpace(b.MasterDataId) ? b.ItemName ?? "Unknown" : b.MasterDataId)
                .Select(g => {
                    var first = g.First();
                    double totalQty = g.Sum(b => b.Qty);
                    int freq = g.Count();
                    decimal totalCost = g.Sum(b => b.TotalCost ?? (decimal)(b.Qty * (double)(b.UnitPrice ?? 0m)));
                    decimal avgPrice = totalQty > 0 ? totalCost / (decimal)totalQty : (first.UnitPrice ?? 0m);

                    return new
                    {
                        masterDataId = first.MasterDataId ?? "-",
                        itemName = first.ItemName ?? "-",
                        bin = first.Bin ?? "-",
                        qtyTotal = totalQty,
                        frequencyCount = freq,
                        unitPriceAvg = avgPrice,
                        totalCost = totalCost
                    };
                })
                .OrderByDescending(x => x.totalCost)
                .ToList();

            return Json(groups);
        }

        [HttpGet]
        public async Task<IActionResult> GetMachineDrilldownJson(int machineId, string? startDate, string? endDate)
        {
            DateTime start = DateTime.Today.AddDays(-30);
            if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var parsedStart)) start = parsedStart.Date;
            DateTime end = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var parsedEnd)) end = parsedEnd.Date;
            DateTime endInclusive = end.AddDays(1).AddTicks(-1);

            var machine = await _db.MachineMasters.FindAsync(machineId);

            var items = await _db.BarangKeluars
                .Where(b => b.Tanggal >= start && b.Tanggal <= endInclusive && (b.ApprovalStatus == null || b.ApprovalStatus.ToLower() == "approved"))
                .Where(b => b.MachineId == machineId)
                .AsNoTracking()
                .ToListAsync();

            var groups = items.GroupBy(b => new { PartId = b.MasterDataId ?? b.ItemName, MaintType = b.MaintenanceType ?? "Corrective" })
                .Select(g => {
                    var first = g.First();
                    double totalQty = g.Sum(b => b.Qty);
                    int freq = g.Count();
                    decimal totalCost = g.Sum(b => b.TotalCost ?? (decimal)(b.Qty * (double)(b.UnitPrice ?? 0m)));

                    return new
                    {
                        masterDataId = first.MasterDataId ?? "-",
                        itemName = first.ItemName ?? "-",
                        bin = first.Bin ?? "-",
                        qtyTotal = totalQty,
                        frequencyCount = freq,
                        totalCost = totalCost,
                        maintenanceType = g.Key.MaintType
                    };
                })
                .OrderByDescending(x => x.totalCost)
                .ToList();

            return Json(new
            {
                machineCode = machine?.MachineCode ?? $"MACH-{machineId}",
                machineName = machine?.MachineName ?? "Unknown Machine",
                line = machine?.Line ?? "-",
                items = groups
            });
        }

        [HttpGet]
        public async Task<IActionResult> ExportToExcel(string? startDate, string? endDate, string? line, string tab = "line")
        {
            DateTime start = DateTime.Today.AddDays(-30);
            if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var parsedStart)) start = parsedStart.Date;
            DateTime end = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var parsedEnd)) end = parsedEnd.Date;
            DateTime endInclusive = end.AddDays(1).AddTicks(-1);

            string selLine = string.IsNullOrWhiteSpace(line) ? "All" : line.Trim();

            var bkList = await _db.BarangKeluars
                .Where(b => b.Tanggal >= start && b.Tanggal <= endInclusive && (b.ApprovalStatus == null || b.ApprovalStatus.ToLower() == "approved"))
                .AsNoTracking()
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("LINE,MACHINE CODE,MACHINE NAME,ITEM NAME,PART ID,QTY,UNIT PRICE,TOTAL COST,DATE");

            foreach (var b in bkList)
            {
                if (selLine != "All" && !IsLineMatch(b.Line, selLine)) continue;

                decimal cost = b.TotalCost ?? (decimal)(b.Qty * (double)(b.UnitPrice ?? 0m));
                sb.AppendLine($"\"{b.Line ?? ""}\",\"{b.Bin ?? ""}\",\"{b.RemName ?? ""}\",\"{b.ItemName ?? ""}\",\"{b.MasterDataId ?? ""}\",{b.Qty},{b.UnitPrice ?? 0m},{cost:F2},\"{b.Tanggal:yyyy-MM-dd}\"");
            }

            byte[] buffer = Encoding.UTF8.GetBytes(sb.ToString());
            return File(buffer, "text/csv", $"Cost_Intelligence_{tab}_{start:yyyyMMdd}_to_{end:yyyyMMdd}.csv");
        }
    }
}
