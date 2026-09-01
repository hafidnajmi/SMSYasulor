using System.Collections.Generic;
using System.Threading.Tasks;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public interface IInventoryService
    {
        Task<int> CreateBarangMasukAsync(BarangMasuk item, string username);
        Task<int> CreateBarangMasukBatchAsync(List<BarangMasuk> items, string username);
        Task<bool> DeleteBarangMasukAsync(int id, string username);
        Task<PagedResult<BarangMasuk>> GetBarangMasukHistoryAsync(int? year, string? search, int page = 1, int pageSize = 50);

        Task<int> CreateBarangKeluarAsync(BarangKeluar item, User user);
        Task<bool> ApproveBarangKeluarAsync(int id, string adminUsername);
        Task<bool> RejectBarangKeluarAsync(int id, string adminUsername);
        Task<List<BarangKeluar>> GetPendingApprovalsAsync();
        Task<PagedResult<BarangKeluar>> GetBarangKeluarHistoryAsync(int? year, string? search, int page = 1, int pageSize = 50);
    }
}
