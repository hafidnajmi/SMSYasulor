using System.Collections.Generic;
using System.Threading.Tasks;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public class KpiSummary
    {
        public int TotalSpareparts { get; set; }
        public int LowStockCount { get; set; }
        public decimal OutgoingCostMonth { get; set; }
        public decimal TotalInventoryValue { get; set; }
        public int PendingApprovals { get; set; }
    }

    public class ChartDataPoint
    {
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
    }

    public class CostInsights
    {
        public string HighestCostLine { get; set; } = "-";
        public decimal HighestCostLineAmount { get; set; }
        public string HighestCostMachine { get; set; } = "-";
        public decimal HighestCostMachineAmount { get; set; }
        public string TopCostSparepart { get; set; } = "-";
        public decimal TopCostSparepartAmount { get; set; }
    }

    public interface IDashboardService
    {
        Task<KpiSummary> GetKpiSummaryAsync(int? year = null, int? month = null);
        Task<Dictionary<string, int>> GetStockStatusDistributionAsync();
        Task<List<ChartDataPoint>> GetCostPerLineAsync(int? year = null, int? month = null);
        Task<List<MasterData>> GetTopLowStockAsync(int count = 5);
        Task<List<AuditLog>> GetRecentActivitiesAsync(int count = 5);
        Task<CostInsights> GetCostInsightsAsync(int? year = null, int? month = null);
    }
}
