using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public class SparepartService : ISparepartService
    {
        private readonly UpmsDbContext _db;

        public SparepartService(UpmsDbContext db)
        {
            _db = db;
        }

        public int CalculateSafetyStock(double qtyNeedYear, decimal ltMonths, string frequency)
        {
            decimal safetyFactor = string.Equals(frequency, "FAST", StringComparison.OrdinalIgnoreCase) ? 1.0m : 0.5m;
            decimal monthlyNeed = (decimal)qtyNeedYear / 12.0m;
            decimal result = monthlyNeed * ltMonths * safetyFactor;
            return (int)Math.Round(result, MidpointRounding.AwayFromZero);
        }

        public async Task<PagedResult<MasterData>> GetPagedAsync(string? search, string? upArea, string? category, string? frequency, string? line, string? bin = null, string? stockStatus = null, int page = 1, int pageSize = 50)
        {
            var query = _db.MasterDatas.Where(m => !m.IsDeleted).AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLower();
                query = query.Where(m =>
                    m.Id.ToLower().Contains(term) ||
                    m.Item.ToLower().Contains(term) ||
                    (m.Bin != null && m.Bin.ToLower().Contains(term)) ||
                    (m.Machine != null && m.Machine.ToLower().Contains(term)) ||
                    (m.Brand != null && m.Brand.ToLower().Contains(term)) ||
                    (m.Detail != null && m.Detail.ToLower().Contains(term))
                );
            }

            if (!string.IsNullOrWhiteSpace(upArea))
            {
                query = query.Where(m => m.UpArea == upArea);
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(m => m.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(frequency))
            {
                query = query.Where(m => m.Frequency == frequency);
            }

            if (!string.IsNullOrWhiteSpace(line))
            {
                query = query.Where(m => m.Line != null && m.Line.Contains(line));
            }

            if (!string.IsNullOrWhiteSpace(bin))
            {
                query = query.Where(m => m.Bin == bin);
            }

            if (!string.IsNullOrWhiteSpace(stockStatus))
            {
                string status = stockStatus.Trim().ToLower();
                if (status == "below")
                {
                    query = query.Where(m => (m.SafetyStock ?? 0) > 0 && (m.CurrentStock ?? 0) < (m.SafetyStock ?? 0));
                }
                else if (status == "near")
                {
                    query = query.Where(m => (m.SafetyStock ?? 0) > 0 && (m.CurrentStock ?? 0) == (m.SafetyStock ?? 0));
                }
                else if (status == "normal")
                {
                    query = query.Where(m => (m.SafetyStock ?? 0) == 0 || (m.CurrentStock ?? 0) > (m.SafetyStock ?? 0));
                }
            }

            int totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(m => m.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<MasterData>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }

        public async Task<MasterData?> GetByIdAsync(string id)
        {
            return await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
        }

        public async Task<MasterData?> GetByBinAsync(string bin)
        {
            if (string.IsNullOrWhiteSpace(bin)) return null;
            return await _db.MasterDatas.FirstOrDefaultAsync(m => m.Bin == bin && !m.IsDeleted);
        }

        public async Task<List<MasterData>> GetLowStockItemsAsync(int top = 5)
        {
            return await _db.MasterDatas
                .Where(m => !m.IsDeleted && (m.SafetyStock ?? 0) > 0 && (m.CurrentStock ?? 0) < (m.SafetyStock ?? 0))
                .OrderBy(m => (m.CurrentStock ?? 0) - (m.SafetyStock ?? 0))
                .Take(top)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<MasterDataKpiSummary> GetKpiSummaryAsync()
        {
            var activeItems = await _db.MasterDatas
                .Where(m => !m.IsDeleted)
                .Select(m => new { Stock = m.CurrentStock ?? 0, Safety = m.SafetyStock ?? 0 })
                .AsNoTracking()
                .ToListAsync();

            int below = activeItems.Count(x => x.Safety > 0 && x.Stock < x.Safety);
            int near = activeItems.Count(x => x.Safety > 0 && x.Stock == x.Safety);
            int normal = activeItems.Count(x => x.Safety == 0 || x.Stock > x.Safety);

            return new MasterDataKpiSummary
            {
                BelowSafetyStock = below,
                NearSafetyStock = near,
                NormalStock = normal,
                TotalSpareparts = activeItems.Count
            };
        }

        public async Task<string> GetNextUpfIdAsync()
        {
            string candidateId;
            do
            {
                candidateId = await _db.GenerateNextUpfIdAsync("seq_upf_master");
            } while (await _db.MasterDatas.AnyAsync(m => m.Id == candidateId && !m.IsDeleted));
            return candidateId;
        }

        public async Task<string> CreateAsync(MasterData item, string username)
        {
            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = await GetNextUpfIdAsync();
            }
            else
            {
                item.Id = item.Id.Trim();
                var existingItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == item.Id && !m.IsDeleted);
                if (existingItem != null)
                {
                    throw new InvalidOperationException($"Part Number (ID) '{item.Id}' sudah terdaftar pada sparepart '{existingItem.Item}'. Silakan gunakan Part Number yang unik.");
                }
            }

            item.IsDeleted = false;
            item.LastUpdatedBy = string.IsNullOrWhiteSpace(username) ? "system" : username;
            item.LastPriceUpdate = DateTime.UtcNow;
            _db.MasterDatas.Add(item);

            var auditLog = new AuditLog
            {
                TableName = "Master_Data",
                RecordId = item.Id,
                Action = "INSERT",
                NewData = JsonSerializer.Serialize(item),
                ChangedBy = string.IsNullOrWhiteSpace(username) ? "system" : username,
                ChangedAt = DateTime.UtcNow
            };
            _db.AuditLogs.Add(auditLog);

            await _db.SaveChangesAsync();
            return item.Id;
        }

        private async Task ExecuteUpdateIfTableExistsAsync(string tableName, string columnName, string newId, string oldId)
        {
            var connection = _db.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            bool tableExists = false;
            using (var checkCmd = connection.CreateCommand())
            {
                checkCmd.CommandText = "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE lower(table_name) = lower(@tbl));";
                var param = checkCmd.CreateParameter();
                param.ParameterName = "tbl";
                param.Value = tableName;
                checkCmd.Parameters.Add(param);

                var result = await checkCmd.ExecuteScalarAsync();
                if (result != null && bool.TryParse(result.ToString(), out bool exists))
                {
                    tableExists = exists;
                }
            }

            if (tableExists)
            {
                await _db.Database.ExecuteSqlRawAsync($"UPDATE \"{tableName}\" SET \"{columnName}\" = {{0}} WHERE \"{columnName}\" = {{1}}", newId, oldId);
            }
        }

        public async Task<bool> UpdateAsync(MasterData item, string username, string? originalId = null)
        {
            string targetId = string.IsNullOrWhiteSpace(originalId) ? (item.Id ?? "").Trim() : originalId.Trim();
            var existing = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == targetId && !m.IsDeleted);
            if (existing == null) return false;

            string oldDataJson = JsonSerializer.Serialize(existing);

            // Handle Part Number (ID) rename/update if changed
            if (!string.IsNullOrWhiteSpace(item.Id) && !string.Equals(targetId, item.Id.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                string newId = item.Id.Trim();
                var duplicate = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == newId && m.Id != targetId && !m.IsDeleted);
                if (duplicate != null)
                {
                    throw new InvalidOperationException($"Part Number (ID) '{newId}' sudah terdaftar pada sparepart '{duplicate.Item}'. Gagal memperbarui Part Number ganda.");
                }

                // Execute SQL cascade update across tables referencing MasterData ID safely
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    await ExecuteUpdateIfTableExistsAsync("Barang_Masuk", "part_number", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("Barang_Keluar", "master_data_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("sparepart_line_mapping", "sparepart_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("SPAREPART_PRICE_HISTORY", "master_data_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("Supplier_Offer", "master_data_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("Bidding_History", "master_data_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("Email_Supplier_Log", "master_data_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("pm_schedule_item", "sparepart_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("pm_standard_part", "sparepart_id", newId, targetId);
                    await ExecuteUpdateIfTableExistsAsync("Audit_Log", "record_id", newId, targetId);

                    await _db.Database.ExecuteSqlRawAsync("UPDATE \"Master_Data\" SET \"id\" = {0} WHERE \"id\" = {1}", newId, targetId);

                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }

                // Re-fetch existing with new ID after transaction
                existing = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == newId && !m.IsDeleted);
                if (existing == null) return false;
            }

            existing.Item = item.Item;
            existing.Detail = item.Detail;
            existing.Brand = item.Brand;
            existing.Machine = item.Machine;
            existing.UpArea = item.UpArea;
            existing.Bin = item.Bin;
            existing.Line = item.Line;
            existing.Category = item.Category;
            existing.Frequency = item.Frequency;
            existing.CurrentStock = item.CurrentStock;
            existing.SafetyStock = item.SafetyStock;
            existing.QtyNeedYear = item.QtyNeedYear;
            existing.TbmPerMonth = item.TbmPerMonth;
            existing.LtPerMonth = item.LtPerMonth;
            existing.BudgetCode = item.BudgetCode;
            existing.AlertSelected = item.AlertSelected;
            existing.LastUpdatedBy = string.IsNullOrWhiteSpace(username) ? "system" : username;
            existing.LastPriceUpdate = DateTime.UtcNow;

            if (item.Image != null)
            {
                existing.Image = item.Image;
            }

            var auditLog = new AuditLog
            {
                TableName = "Master_Data",
                RecordId = existing.Id,
                Action = "UPDATE",
                OldData = oldDataJson,
                NewData = JsonSerializer.Serialize(existing),
                ChangedBy = string.IsNullOrWhiteSpace(username) ? "system" : username,
                ChangedAt = DateTime.UtcNow
            };
            _db.AuditLogs.Add(auditLog);

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SoftDeleteAsync(string id, string username)
        {
            var existing = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
            if (existing == null) return false;

            string oldDataJson = JsonSerializer.Serialize(existing);
            existing.IsDeleted = true;

            var auditLog = new AuditLog
            {
                TableName = "Master_Data",
                RecordId = id,
                Action = "DELETE",
                OldData = oldDataJson,
                NewData = JsonSerializer.Serialize(new { IsDeleted = true }),
                ChangedBy = username,
                ChangedAt = DateTime.UtcNow
            };
            _db.AuditLogs.Add(auditLog);

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<List<string>> GetCategoriesAsync()
        {
            return await _db.MasterDatas
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.Category))
                .Select(m => m.Category!)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();
        }

        public async Task<List<string>> GetBinsAsync()
        {
            return await _db.MasterDatas
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.Bin))
                .Select(m => m.Bin!)
                .Distinct()
                .OrderBy(b => b)
                .ToListAsync();
        }

        public async Task<List<string>> GetLinesAsync()
        {
            var rawLines = await _db.MasterDatas
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.Line))
                .Select(m => m.Line!)
                .Distinct()
                .ToListAsync();

            return rawLines
                .SelectMany(l => l.Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries))
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(l => l)
                .ToList();
        }

        public async Task<List<string>> GetUpAreasAsync()
        {
            return await _db.MasterDatas
                .Where(m => !m.IsDeleted && !string.IsNullOrEmpty(m.UpArea))
                .Select(m => m.UpArea!)
                .Distinct()
                .OrderBy(a => a)
                .ToListAsync();
        }
    }
}
