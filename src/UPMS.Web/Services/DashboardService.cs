using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly UpmsDbContext _db;

        public DashboardService(UpmsDbContext db)
        {
            _db = db;
        }

        public async Task<KpiSummary> GetKpiSummaryAsync(int? year = null, int? month = null)
        {
            var now = DateTime.Now;
            int totalParts = await _db.MasterDatas.CountAsync(m => !m.IsDeleted);
            int lowStock = await _db.MasterDatas.CountAsync(m => !m.IsDeleted && (m.CurrentStock ?? 0) <= (m.SafetyStock ?? 0));
            int pending = await _db.BarangKeluars.CountAsync(b => b.ApprovalStatus == "Pending");

            var costQuery = _db.BarangKeluars
                .Where(b => b.ApprovalStatus != "Rejected")
                .AsNoTracking();

            if (year.HasValue && year.Value > 0)
            {
                costQuery = costQuery.Where(b => b.Tanggal.Year == year.Value);
            }

            if (month.HasValue && month.Value > 0)
            {
                costQuery = costQuery.Where(b => b.Tanggal.Month == month.Value);
            }
            else if (!year.HasValue)
            {
                costQuery = costQuery.Where(b => b.Tanggal.Year == now.Year && b.Tanggal.Month == now.Month);
            }

            decimal monthlyCost = await costQuery.SumAsync(b => b.TotalCost ?? 0m);

            decimal totalInvVal = await _db.MasterDatas
                .Where(m => !m.IsDeleted)
                .SumAsync(m => (m.CurrentStock ?? 0) * (m.CurrentUnitPrice ?? 0m));

            return new KpiSummary
            {
                TotalSpareparts = totalParts,
                LowStockCount = lowStock,
                OutgoingCostMonth = monthlyCost,
                TotalInventoryValue = totalInvVal,
                PendingApprovals = pending
            };
        }

        public async Task<Dictionary<string, int>> GetStockStatusDistributionAsync()
        {
            var activeItems = await _db.MasterDatas
                .Where(m => !m.IsDeleted)
                .Select(m => new { m.CurrentStock, m.SafetyStock })
                .AsNoTracking()
                .ToListAsync();

            int normal = 0;
            int nearSafety = 0;
            int belowSafety = 0;

            foreach (var item in activeItems)
            {
                int curr = item.CurrentStock ?? 0;
                int safe = item.SafetyStock ?? 0;

                if (safe > 0 && curr < safe)
                {
                    belowSafety++;
                }
                else if (safe > 0 && curr == safe)
                {
                    nearSafety++;
                }
                else
                {
                    normal++;
                }
            }

            return new Dictionary<string, int>
            {
                { "Normal Stock", normal },
                { "Near Safety Stock", nearSafety },
                { "Below Safety Stock", belowSafety }
            };
        }

        public async Task<List<ChartDataPoint>> GetCostPerLineAsync(int? year = null, int? month = null)
        {
            var rawMasterLines = await _db.MasterDatas
                .Where(m => !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line!)
                .Distinct()
                .ToListAsync();

            var rawTransactionLines = await _db.BarangKeluars
                .Where(b => !string.IsNullOrEmpty(b.Line))
                .Select(b => b.Line!)
                .Distinct()
                .ToListAsync();

            var allLines = rawMasterLines.Concat(rawTransactionLines)
                .SelectMany(l => l.Split(new[] { ',', '/', ';' }, StringSplitOptions.RemoveEmptyEntries))
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l) && l.Length <= 8)
                .Distinct()
                .OrderBy(l => l)
                .ToList();

            var query = _db.BarangKeluars
                .Where(b => (b.ApprovalStatus == null || b.ApprovalStatus == "Approved") && b.Line != null)
                .AsNoTracking();

            if (year.HasValue && year.Value > 0)
            {
                query = query.Where(b => b.Tanggal.Year == year.Value);
            }
            if (month.HasValue && month.Value > 0)
            {
                query = query.Where(b => b.Tanggal.Month == month.Value);
            }

            var transactionItems = await query
                .Select(b => new { b.Line, Cost = b.TotalCost ?? 0m })
                .ToListAsync();

            var costMap = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in transactionItems)
            {
                if (string.IsNullOrEmpty(item.Line)) continue;

                var splitLines = item.Line.Split(new[] { ',', '/', ';' }, StringSplitOptions.RemoveEmptyEntries);
                decimal perLineCost = item.Cost / (splitLines.Length > 0 ? splitLines.Length : 1);

                foreach (var rawLine in splitLines)
                {
                    string cleanLine = rawLine.Trim();
                    if (costMap.ContainsKey(cleanLine))
                    {
                        costMap[cleanLine] += perLineCost;
                    }
                    else
                    {
                        costMap[cleanLine] = perLineCost;
                    }
                }
            }

            var result = new List<ChartDataPoint>();
            foreach (var line in allLines)
            {
                decimal cost = costMap.ContainsKey(line) ? costMap[line] : 0m;
                result.Add(new ChartDataPoint { Label = line, Value = cost });
            }

            return result;
        }

        public async Task<List<MasterData>> GetTopLowStockAsync(int count = 5)
        {
            return await _db.MasterDatas
                .Where(m => !m.IsDeleted && (m.CurrentStock ?? 0) <= (m.SafetyStock ?? 0))
                .OrderBy(m => (m.CurrentStock ?? 0) - (m.SafetyStock ?? 0))
                .Take(count)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<AuditLog>> GetRecentActivitiesAsync(int count = 5)
        {
            return await _db.AuditLogs
                .OrderByDescending(a => a.ChangedAt)
                .Take(count)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<CostInsights> GetCostInsightsAsync(int? year = null, int? month = null)
        {
            var now = DateTime.Now;
            var query = _db.BarangKeluars
                .Where(b => b.ApprovalStatus != "Rejected")
                .AsNoTracking();

            if (year.HasValue && year.Value > 0)
            {
                query = query.Where(b => b.Tanggal.Year == year.Value);
            }

            if (month.HasValue && month.Value > 0)
            {
                query = query.Where(b => b.Tanggal.Month == month.Value);
            }

            var topCostLineGroup = await query
                .Where(b => b.Line != null)
                .GroupBy(b => b.Line)
                .Select(g => new { Line = g.Key!, TotalCost = g.Sum(b => b.TotalCost ?? 0m) })
                .OrderByDescending(g => g.TotalCost)
                .FirstOrDefaultAsync();

            var topCostPartGroup = await query
                .GroupBy(b => b.ItemName)
                .Select(g => new { Item = g.Key, TotalCost = g.Sum(b => b.TotalCost ?? 0m) })
                .OrderByDescending(g => g.TotalCost)
                .FirstOrDefaultAsync();

            return new CostInsights
            {
                HighestCostLine = topCostLineGroup?.Line ?? "-",
                HighestCostLineAmount = topCostLineGroup?.TotalCost ?? 0m,
                TopCostSparepart = topCostPartGroup?.Item ?? "-",
                TopCostSparepartAmount = topCostPartGroup?.TotalCost ?? 0m
            };
        }
    }
}
