using System.Collections.Generic;
using System.Threading.Tasks;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (TotalCount + PageSize - 1) / PageSize;
    }

    public class MasterDataKpiSummary
    {
        public int BelowSafetyStock { get; set; }
        public int NearSafetyStock { get; set; }
        public int NormalStock { get; set; }
        public int TotalSpareparts { get; set; }
    }

    public interface ISparepartService
    {
        Task<PagedResult<MasterData>> GetPagedAsync(string? search, string? upArea, string? category, string? frequency, string? line, string? bin = null, string? stockStatus = null, int page = 1, int pageSize = 50);
        Task<MasterData?> GetByIdAsync(string id);
        Task<MasterData?> GetByBinAsync(string bin);
        Task<List<MasterData>> GetLowStockItemsAsync(int top = 5);
        Task<MasterDataKpiSummary> GetKpiSummaryAsync();
        Task<string> CreateAsync(MasterData item, string username);
        Task<bool> UpdateAsync(MasterData item, string username);
        Task<bool> SoftDeleteAsync(string id, string username);
        int CalculateSafetyStock(double qtyNeedYear, decimal ltMonths, string frequency);
        Task<List<string>> GetCategoriesAsync();
        Task<List<string>> GetBinsAsync();
        Task<List<string>> GetLinesAsync();
        Task<List<string>> GetUpAreasAsync();
    }
}
