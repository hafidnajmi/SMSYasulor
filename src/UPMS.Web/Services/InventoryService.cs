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
    public class InventoryService : IInventoryService
    {
        private readonly UpmsDbContext _db;

        public InventoryService(UpmsDbContext db)
        {
            _db = db;
        }

        public async Task<int> CreateBarangMasukAsync(BarangMasuk item, string username)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                item.CreatedAt = DateTime.Now;
                _db.BarangMasuks.Add(item);
                await _db.SaveChangesAsync();

                await ProcessBarangMasukProcurementSyncAsync(item, username);

                var audit = new AuditLog
                {
                    TableName = "Barang_Masuk",
                    RecordId = item.Id.ToString(),
                    Action = "INSERT",
                    NewData = JsonSerializer.Serialize(item),
                    ChangedBy = username,
                    ChangedAt = DateTime.Now
                };
                _db.AuditLogs.Add(audit);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return item.Id;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<int> CreateBarangMasukBatchAsync(List<BarangMasuk> items, string username)
        {
            if (items == null || !items.Any()) return 0;

            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                int count = 0;
                foreach (var item in items)
                {
                    item.CreatedAt = DateTime.Now;
                    _db.BarangMasuks.Add(item);
                    await _db.SaveChangesAsync();

                    await ProcessBarangMasukProcurementSyncAsync(item, username);

                    var audit = new AuditLog
                    {
                        TableName = "Barang_Masuk",
                        RecordId = item.Id.ToString(),
                        Action = "INSERT_BATCH",
                        NewData = JsonSerializer.Serialize(item),
                        ChangedBy = username,
                        ChangedAt = DateTime.Now
                    };
                    _db.AuditLogs.Add(audit);

                    count++;
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return count;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task ProcessBarangMasukProcurementSyncAsync(BarangMasuk item, string username)
        {
            MasterData? masterItem = null;
            if (!string.IsNullOrWhiteSpace(item.PartNumber))
            {
                masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == item.PartNumber && !m.IsDeleted);
            }
            if (masterItem == null && !string.IsNullOrWhiteSpace(item.Bin))
            {
                masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Bin == item.Bin && !m.IsDeleted);
            }
            if (masterItem == null && !string.IsNullOrWhiteSpace(item.ItemName))
            {
                masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Item.ToLower() == item.ItemName.Trim().ToLower() && !m.IsDeleted);
            }

            if (masterItem == null) return;

            masterItem.CurrentStock = (masterItem.CurrentStock ?? 0) + item.Qty;

            decimal unitPrice = item.UnitPrice ?? 0m;
            decimal oldPrice = masterItem.CurrentUnitPrice ?? 0m;

            if (unitPrice > 0)
            {
                masterItem.CurrentUnitPrice = unitPrice;
                masterItem.LastPriceUpdate = item.Tanggal;
                masterItem.LastUpdatedBy = username;
            }

            string? supplierName = item.Supplier?.Trim();
            if (!string.IsNullOrWhiteSpace(supplierName))
            {
                masterItem.Brand = supplierName;

                bool supExists = await _db.Suppliers.AnyAsync(s => s.Name.ToLower() == supplierName.ToLower());
                if (!supExists)
                {
                    _db.Suppliers.Add(new Supplier { Name = supplierName });
                }

                var existingOffer = await _db.SupplierOffers.FirstOrDefaultAsync(so => 
                    so.MasterDataId == masterItem.Id && 
                    so.SupplierName != null && 
                    so.SupplierName.ToLower() == supplierName.ToLower());

                if (existingOffer != null)
                {
                    if (unitPrice > 0) existingOffer.Price = unitPrice;
                    existingOffer.UpdatedAt = item.Tanggal;
                    existingOffer.UpdatedBy = username;
                }
                else
                {
                    _db.SupplierOffers.Add(new SupplierOffer
                    {
                        MasterDataId = masterItem.Id,
                        Bin = masterItem.Bin,
                        SupplierName = supplierName,
                        Price = unitPrice > 0 ? unitPrice : oldPrice,
                        IsSelected = false,
                        UpdatedAt = item.Tanggal,
                        UpdatedBy = username
                    });
                }
            }

            if (unitPrice > 0 || !string.IsNullOrWhiteSpace(supplierName))
            {
                _db.SparepartPriceHistories.Add(new SparepartPriceHistory
                {
                    MasterDataId = masterItem.Id,
                    SupplierName = supplierName,
                    OldPrice = oldPrice,
                    NewPrice = unitPrice > 0 ? unitPrice : oldPrice,
                    Currency = "IDR",
                    Reason = $"Barang Masuk (PO: {item.PoNumber ?? "-"})",
                    EffectiveDate = item.Tanggal,
                    UpdatedBy = username,
                    UpdatedAt = DateTime.Now
                });
            }
        }

        public async Task<bool> DeleteBarangMasukAsync(int id, string username)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var entry = await _db.BarangMasuks.FirstOrDefaultAsync(b => b.Id == id);
                if (entry == null) return false;

                if (!string.IsNullOrWhiteSpace(entry.Bin))
                {
                    var masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Bin == entry.Bin && !m.IsDeleted);
                    if (masterItem != null)
                    {
                        masterItem.CurrentStock = Math.Max(0, (masterItem.CurrentStock ?? 0) - entry.Qty);
                    }
                }

                _db.BarangMasuks.Remove(entry);

                var audit = new AuditLog
                {
                    TableName = "Barang_Masuk",
                    RecordId = id.ToString(),
                    Action = "DELETE",
                    OldData = JsonSerializer.Serialize(entry),
                    ChangedBy = username,
                    ChangedAt = DateTime.Now
                };
                _db.AuditLogs.Add(audit);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResult<BarangMasuk>> GetBarangMasukHistoryAsync(int? year, string? search, int page = 1, int pageSize = 50)
        {
            var query = _db.BarangMasuks.AsNoTracking();

            if (year.HasValue && year.Value > 0)
            {
                query = query.Where(b => b.Tanggal.Year == year.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLower();
                query = query.Where(b =>
                    b.ItemName.ToLower().Contains(term) ||
                    (b.Bin != null && b.Bin.ToLower().Contains(term)) ||
                    (b.Pic != null && b.Pic.ToLower().Contains(term)) ||
                    (b.Supplier != null && b.Supplier.ToLower().Contains(term))
                );
            }

            int totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(b => b.Tanggal)
                .ThenByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<BarangMasuk>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }

        public async Task<int> CreateBarangKeluarAsync(BarangKeluar item, User user)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                item.UserId = user.Id;
                item.CreatedAt = DateTime.Now;

                MasterData? masterItem = null;
                if (!string.IsNullOrWhiteSpace(item.MasterDataId))
                {
                    masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == item.MasterDataId && !m.IsDeleted);
                }
                else if (!string.IsNullOrWhiteSpace(item.Bin))
                {
                    masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Bin == item.Bin && !m.IsDeleted);
                }

                if (masterItem != null)
                {
                    item.MasterDataId = masterItem.Id;
                    item.UnitPrice = masterItem.CurrentUnitPrice ?? 0m;
                    item.TotalCost = item.Qty * (item.UnitPrice ?? 0m);
                }

                bool requiresApproval = user.RequireApprovalKeluar && (user.Role != "admin");

                if (requiresApproval)
                {
                    item.ApprovalStatus = "Pending";
                }
                else
                {
                    item.ApprovalStatus = "Approved";
                    item.ApprovedBy = user.Username;
                    item.ApprovedAt = DateTime.Now;

                    if (masterItem != null)
                    {
                        masterItem.CurrentStock = Math.Max(0, (masterItem.CurrentStock ?? 0) - item.Qty);
                    }
                }

                _db.BarangKeluars.Add(item);
                await _db.SaveChangesAsync();

                if (!string.IsNullOrWhiteSpace(item.MasterDataId))
                {
                    bool exists = await _db.SparepartLineMappings.AnyAsync(m => m.SparepartId == item.MasterDataId);
                    if (!exists)
                    {
                        _db.SparepartLineMappings.Add(new SparepartLineMapping
                        {
                            SparepartId = item.MasterDataId,
                            CreatedAt = DateTime.Now
                        });
                    }
                }

                var audit = new AuditLog
                {
                    TableName = "Barang_Keluar",
                    RecordId = item.Id.ToString(),
                    Action = "INSERT",
                    NewData = JsonSerializer.Serialize(item),
                    ChangedBy = user.Username,
                    ChangedAt = DateTime.Now
                };
                _db.AuditLogs.Add(audit);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return item.Id;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ApproveBarangKeluarAsync(int id, string adminUsername)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var entry = await _db.BarangKeluars.FirstOrDefaultAsync(b => b.Id == id && b.ApprovalStatus == "Pending");
                if (entry == null) return false;

                entry.ApprovalStatus = "Approved";
                entry.ApprovedBy = adminUsername;
                entry.ApprovedAt = DateTime.Now;

                if (!string.IsNullOrWhiteSpace(entry.MasterDataId))
                {
                    var masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == entry.MasterDataId && !m.IsDeleted);
                    if (masterItem != null)
                    {
                        masterItem.CurrentStock = Math.Max(0, (masterItem.CurrentStock ?? 0) - entry.Qty);
                    }
                }

                var audit = new AuditLog
                {
                    TableName = "Barang_Keluar",
                    RecordId = id.ToString(),
                    Action = "APPROVE",
                    NewData = JsonSerializer.Serialize(entry),
                    ChangedBy = adminUsername,
                    ChangedAt = DateTime.Now
                };
                _db.AuditLogs.Add(audit);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> RejectBarangKeluarAsync(int id, string adminUsername)
        {
            var entry = await _db.BarangKeluars.FirstOrDefaultAsync(b => b.Id == id && b.ApprovalStatus == "Pending");
            if (entry == null) return false;

            entry.ApprovalStatus = "Rejected";
            entry.ApprovedBy = adminUsername;
            entry.ApprovedAt = DateTime.Now;

            var audit = new AuditLog
            {
                TableName = "Barang_Keluar",
                RecordId = id.ToString(),
                Action = "REJECT",
                NewData = JsonSerializer.Serialize(entry),
                ChangedBy = adminUsername,
                ChangedAt = DateTime.Now
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<List<BarangKeluar>> GetPendingApprovalsAsync()
        {
            return await _db.BarangKeluars
                .Where(b => b.ApprovalStatus == "Pending")
                .OrderByDescending(b => b.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<PagedResult<BarangKeluar>> GetBarangKeluarHistoryAsync(int? year, string? search, int page = 1, int pageSize = 50)
        {
            var query = _db.BarangKeluars
                .Where(b => b.ApprovalStatus == null || b.ApprovalStatus == "Approved")
                .AsNoTracking();

            if (year.HasValue && year.Value > 0)
            {
                query = query.Where(b => b.Tanggal.Year == year.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLower();
                query = query.Where(b =>
                    b.ItemName.ToLower().Contains(term) ||
                    (b.Bin != null && b.Bin.ToLower().Contains(term)) ||
                    (b.Pic != null && b.Pic.ToLower().Contains(term)) ||
                    (b.Line != null && b.Line.ToLower().Contains(term)) ||
                    (b.RemName != null && b.RemName.ToLower().Contains(term))
                );
            }

            int totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(b => b.Tanggal)
                .ThenByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<BarangKeluar>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }
    }
}
