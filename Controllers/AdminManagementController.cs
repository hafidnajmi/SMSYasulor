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
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class AdminManagementController : Controller
    {
        private readonly UpmsDbContext _db;
        private readonly IInventoryService _inventoryService;

        public AdminManagementController(UpmsDbContext db, IInventoryService inventoryService)
        {
            _db = db;
            _inventoryService = inventoryService;
        }

        private async Task<bool> HasAdminMgmtPermissionAsync()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username)) return false;
            var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Username.ToLower() == username.ToLower());
            if (u == null) return false;
            if (string.Equals(u.Username, "admin", StringComparison.OrdinalIgnoreCase)) return true;
            if (u.Role?.ToLower() == "admin") return true;
            return u.CanAdminMgmt == 1;
        }

        public async Task<IActionResult> Index(
            string tab = "procurement",
            string subtab = "keluar",
            int page = 1,
            int pageSize = 50,
            string? search = null,
            string? category = null,
            string? stock = null,
            int? year = null)
        {
            if (!await HasAdminMgmtPermissionAsync())
            {
                return RedirectToAction("Index", "Home");
            }
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 10, 200);

            var vm = new AdminManagementViewModel
            {
                ActiveTab = string.IsNullOrWhiteSpace(tab) ? "procurement" : tab.ToLower(),
                ActiveSubTab = string.IsNullOrWhiteSpace(subtab) ? "keluar" : subtab.ToLower(),
                SelectedYear = year,
                Page = page,
                PageSize = pageSize,
                SearchQuery = search,
                CategoryFilter = category,
                StockFilter = stock
            };

            // Global Master Data Query
            var masterQuery = _db.MasterDatas.Where(m => !m.IsDeleted).AsNoTracking();
            vm.AllMasterDataItems = await masterQuery.OrderBy(m => m.Item).ToListAsync();

            // 1. Summary KPIs across ALL items (fast SQL aggregates)
            vm.TotalMasterItems = await masterQuery.CountAsync();
            vm.TotalValuation = await masterQuery.SumAsync(m => (m.CurrentStock ?? 0) * (m.CurrentUnitPrice ?? 0m));
            vm.CriticalLowStockCount = await masterQuery.CountAsync(m => (m.CurrentStock ?? 0) <= (m.SafetyStock ?? 0));
            vm.AveragePrice = vm.TotalMasterItems > 0 ? await masterQuery.AverageAsync(m => m.CurrentUnitPrice ?? 0m) : 0m;

            vm.AvailableCategories = await masterQuery
                .Select(m => m.Category)
                .Where(c => !string.IsNullOrEmpty(c))
                .Distinct()
                .OrderBy(c => c!)
                .ToListAsync();

            vm.AvailableSuppliers = await _db.Suppliers
                .OrderBy(s => s.Name)
                .AsNoTracking()
                .ToListAsync();

            // 2. Apply Filters
            var filteredQuery = masterQuery;
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                filteredQuery = filteredQuery.Where(m =>
                    m.Id.ToLower().Contains(s) ||
                    m.Item.ToLower().Contains(s) ||
                    (m.Bin != null && m.Bin.ToLower().Contains(s)) ||
                    (m.UpArea != null && m.UpArea.ToLower().Contains(s)) ||
                    (m.Brand != null && m.Brand.ToLower().Contains(s))
                );
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                filteredQuery = filteredQuery.Where(m => m.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(stock))
            {
                if (stock.ToUpper() == "CRITICAL")
                {
                    filteredQuery = filteredQuery.Where(m => (m.CurrentStock ?? 0) <= (m.SafetyStock ?? 0));
                }
                else if (stock.ToUpper() == "NORMAL")
                {
                    filteredQuery = filteredQuery.Where(m => (m.CurrentStock ?? 0) > (m.SafetyStock ?? 0));
                }
            }

            vm.FilteredTotalItems = await filteredQuery.CountAsync();
            vm.TotalPages = Math.Max(1, (int)Math.Ceiling(vm.FilteredTotalItems / (double)pageSize));
            if (vm.Page > vm.TotalPages) vm.Page = vm.TotalPages;

            // Fetch ONLY 50 items for current page (Ultra Fast & Smooth)
            vm.ProcurementItems = await filteredQuery
                .OrderBy(m => m.Id)
                .Skip((vm.Page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Auto-default to Cheapest Supplier Offer unless manually pinned (IsSelected == true)
            var procIds = vm.ProcurementItems.Select(p => p.Id).ToList();
            if (procIds.Any())
            {
                var allOffers = await _db.SupplierOffers
                    .Where(o => procIds.Contains(o.MasterDataId) && o.Price > 0)
                    .AsNoTracking()
                    .ToListAsync();

                var offerGroups = allOffers.GroupBy(o => o.MasterDataId, StringComparer.OrdinalIgnoreCase);
                foreach (var item in vm.ProcurementItems)
                {
                    var offers = offerGroups.FirstOrDefault(g => g.Key.Equals(item.Id, StringComparison.OrdinalIgnoreCase))?.ToList();
                    if (offers != null && offers.Any())
                    {
                        var pinned = offers.FirstOrDefault(o => o.IsSelected);
                        if (pinned != null)
                        {
                            item.CurrentUnitPrice = pinned.Price;
                            item.Brand = pinned.SupplierName;
                        }
                        else
                        {
                            var cheapest = offers.OrderBy(o => o.Price).First();
                            item.CurrentUnitPrice = cheapest.Price;
                            item.Brand = cheapest.SupplierName;
                        }
                    }
                }
            }

            try
            {
                var biddingIds = await _db.BiddingHistories
                    .Where(b => !string.IsNullOrWhiteSpace(b.MasterDataId))
                    .Select(b => b.MasterDataId.Trim())
                    .Distinct()
                    .ToListAsync();

                vm.BiddingMasterDataIds = new HashSet<string>(biddingIds, StringComparer.OrdinalIgnoreCase);

                // 3. Bidding History Data
                var biddingQuery = _db.BiddingHistories.AsNoTracking();
                vm.BiddingYears = await biddingQuery.Select(b => b.BiddingYear).Where(y => y > 0).Distinct().OrderByDescending(y => y).ToListAsync();
                if (year.HasValue && year.Value > 0)
                {
                    biddingQuery = biddingQuery.Where(b => b.BiddingYear == year.Value);
                }
                vm.BiddingRecords = await biddingQuery.ToListAsync();
                var bidPartIds = vm.BiddingRecords.Select(b => b.MasterDataId).Distinct().ToList();
                var masterDict = await _db.MasterDatas
                    .Where(m => bidPartIds.Contains(m.Id))
                    .ToDictionaryAsync(m => m.Id);

                vm.BiddingRecordDtos = vm.BiddingRecords.Select(bid => {
                    masterDict.TryGetValue(bid.MasterDataId, out var m);
                    return new BiddingHistoryItemDto
                    {
                        Id = bid.Id,
                        MasterDataId = bid.MasterDataId,
                        BiddingYear = bid.BiddingYear,
                        Line = m?.Line ?? "-",
                        Bin = m?.Bin ?? "-",
                        ItemName = m?.Item ?? bid.MasterDataId,
                        Detail = m?.Detail ?? "-",
                        BudgetCode = m?.BudgetCode ?? "-",
                        QtyNeedYear = (int)(m?.QtyNeedYear ?? 0),
                        SafetyStock = (int)(m?.SafetyStock ?? 0),
                        CurrentStock = (int)(m?.CurrentStock ?? 0),
                        Price = (decimal)bid.Price,
                        SupplierName = bid.SupplierName ?? "-",
                        BiddingStage = bid.BiddingStage ?? "-",
                        Status = bid.Status ?? "Completed"
                    };
                }).ToList();

                vm.TotalBiddingValue = vm.BiddingRecordDtos.Sum(b => b.TotalValue > 0 ? b.TotalValue : b.Price);
                var topSup = vm.BiddingRecords
                    .Where(b => !string.IsNullOrEmpty(b.SupplierName))
                    .GroupBy(b => b.SupplierName)
                    .OrderByDescending(g => g.Count())
                    .FirstOrDefault();
                vm.TopSupplier = topSup?.Key ?? "-";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminManagementController] Bidding data query warning: {ex.Message}");
            }

            try
            {
                // 4. Approval Queue Data
                vm.PendingBarangKeluarApprovals = await _db.BarangKeluars
                    .AsNoTracking()
                    .Where(b => b.ApprovalStatus != null && b.ApprovalStatus.ToLower() == "pending")
                    .OrderByDescending(b => b.Tanggal)
                    .ToListAsync();

                // 5. Line Compatibility Center Data
                var lineMappingsRaw = await _db.SparepartLineMappings.AsNoTracking().ToListAsync();
                var partIdsInMappings = lineMappingsRaw.Select(m => m.SparepartId).Distinct().ToList();
                var partNamesMap = await _db.MasterDatas
                    .Where(m => partIdsInMappings.Contains(m.Id))
                    .ToDictionaryAsync(m => m.Id, m => m.Item);

                vm.LineMappings = lineMappingsRaw.OrderByDescending(m => m.CreatedAt).ToList();
                vm.LineCompatibilityList = lineMappingsRaw.Select(m => new SparepartLineMappingDto
                {
                    Id = m.Id,
                    SparepartId = m.SparepartId,
                    SparepartName = partNamesMap.TryGetValue(m.SparepartId, out var name) ? name : "-",
                    LineName = m.MappingSource ?? "MANUAL",
                    CreatedAt = m.CreatedAt,
                    IsActive = m.IsActive,
                    Approved = m.Approved,
                    MappingSource = m.MappingSource ?? "MANUAL"
                }).OrderByDescending(m => m.CreatedAt).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminManagementController] Line mapping data query warning: {ex.Message}");
            }

            var linesFromMaster = await _db.MasterDatas.Select(m => m.Line).Where(l => !string.IsNullOrEmpty(l)).Distinct().ToListAsync();
            var linesFromKeluar = await _db.BarangKeluars.Select(b => b.Line).Where(l => !string.IsNullOrEmpty(l)).Distinct().ToListAsync();
            vm.AvailableProductionLines = linesFromMaster.Concat(linesFromKeluar).Where(l => !string.IsNullOrEmpty(l)).Select(l => l!).Distinct().OrderBy(l => l).ToList();

            return View("Index", vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ApproveMapping(int id)
        {
            var map = await _db.SparepartLineMappings.FindAsync(id);
            if (map != null)
            {
                map.Approved = 1;
                map.IsActive = 1;
                map.UpdatedAt = DateTime.Now;
                await _db.SaveChangesAsync();
                TempData["Success"] = $"✓ Compatibility mapping #{id} approved successfully.";
            }
            return RedirectToAction("Index", new { tab = "approvals" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RejectMapping(int id)
        {
            var map = await _db.SparepartLineMappings.FindAsync(id);
            if (map != null)
            {
                _db.SparepartLineMappings.Remove(map);
                await _db.SaveChangesAsync();
                TempData["Success"] = $"✓ Compatibility mapping #{id} rejected and removed.";
            }
            return RedirectToAction("Index", new { tab = "approvals", subtab = "compat" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditMapping(int id, string lineName)
        {
            var map = await _db.SparepartLineMappings.FindAsync(id);
            if (map != null)
            {
                map.MappingSource = string.IsNullOrWhiteSpace(lineName) ? "MANUAL" : lineName.Trim();
                map.UpdatedAt = DateTime.Now;
                await _db.SaveChangesAsync();
                TempData["Success"] = $"✓ Compatibility mapping #{id} updated to line '{map.MappingSource}'.";
            }
            return RedirectToAction("Index", new { tab = "approvals", subtab = "compat" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddLineMapping(string sparepartId, string lineName)
        {
            if (string.IsNullOrWhiteSpace(sparepartId))
            {
                TempData["Error"] = "Please select or type a valid Sparepart ID.";
                return RedirectToAction("Index", new { tab = "linecompat" });
            }

            var mapping = new SparepartLineMapping
            {
                SparepartId = sparepartId.Trim(),
                MappingSource = string.IsNullOrWhiteSpace(lineName) ? "MANUAL" : lineName.Trim(),
                CreatedAt = DateTime.Now,
                IsActive = 1
            };

            _db.SparepartLineMappings.Add(mapping);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"✓ Added line compatibility mapping for Part #{sparepartId}.";
            return RedirectToAction("Index", new { tab = "linecompat" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteLineMapping(int id)
        {
            var map = await _db.SparepartLineMappings.FindAsync(id);
            if (map != null)
            {
                _db.SparepartLineMappings.Remove(map);
                await _db.SaveChangesAsync();
                TempData["Success"] = $"Line mapping #{id} deleted successfully.";
            }
            return RedirectToAction("Index", new { tab = "linecompat" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdatePriceAndSupplier(string masterDataId, decimal newPrice, string? supplierName)
        {
            var item = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == masterDataId);
            if (item != null)
            {
                var oldPrice = item.CurrentUnitPrice ?? 0m;
                item.CurrentUnitPrice = newPrice;
                string cleanSup = string.IsNullOrWhiteSpace(supplierName) ? (item.Brand ?? "-") : supplierName.Trim();
                
                if (!string.IsNullOrWhiteSpace(supplierName))
                {
                    item.Brand = cleanSup;

                    bool exists = await _db.Suppliers.AnyAsync(s => s.Name.ToLower() == cleanSup.ToLower());
                    if (!exists)
                    {
                        _db.Suppliers.Add(new Supplier { Name = cleanSup });
                    }

                    var existingOffer = await _db.SupplierOffers.FirstOrDefaultAsync(so => 
                        so.MasterDataId == masterDataId && 
                        so.SupplierName != null && 
                        so.SupplierName.ToLower() == cleanSup.ToLower());

                    if (existingOffer != null)
                    {
                        existingOffer.Price = newPrice;
                        existingOffer.UpdatedAt = DateTime.Now;
                        existingOffer.UpdatedBy = User.Identity?.Name ?? "admin";
                    }
                    else
                    {
                        _db.SupplierOffers.Add(new SupplierOffer
                        {
                            MasterDataId = masterDataId,
                            Bin = item.Bin,
                            SupplierName = cleanSup,
                            Price = newPrice,
                            IsSelected = false,
                            UpdatedAt = DateTime.Now,
                            UpdatedBy = User.Identity?.Name ?? "admin"
                        });
                    }
                }
                item.LastPriceUpdate = DateTime.Now;
                item.LastUpdatedBy = User.Identity?.Name ?? "admin";

                _db.SparepartPriceHistories.Add(new SparepartPriceHistory
                {
                    MasterDataId = masterDataId,
                    SupplierName = cleanSup,
                    OldPrice = oldPrice,
                    NewPrice = newPrice,
                    Currency = "IDR",
                    Reason = "Admin Procurement Price Update",
                    EffectiveDate = DateTime.Today,
                    UpdatedBy = User.Identity?.Name ?? "admin",
                    UpdatedAt = DateTime.Now
                });

                await _db.SaveChangesAsync();
                TempData["Success"] = $"✓ Price & supplier updated for {item.Item} ({masterDataId}) to Rp {newPrice:N0}.";
            }
            else
            {
                TempData["Error"] = $"Master data item #{masterDataId} not found.";
            }

            return RedirectToAction("Index", new { tab = "procurement" });
        }

        [HttpGet]
        public async Task<IActionResult> GetPriceHistory(string masterDataId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(masterDataId)) return Json(new { success = false, message = "Invalid Part Number" });

                var masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == masterDataId);
                if (masterItem == null) return Json(new { success = false, message = "Part Number not found" });

                var historiesRaw = await _db.SparepartPriceHistories
                    .Where(h => h.MasterDataId == masterDataId)
                    .OrderByDescending(h => h.EffectiveDate)
                    .ThenByDescending(h => h.UpdatedAt)
                    .ToListAsync();

                var histories = historiesRaw.Select(h => {
                    DateTime dt = (h.UpdatedAt != default && h.UpdatedAt.TimeOfDay != TimeSpan.Zero)
                        ? h.UpdatedAt
                        : (h.EffectiveDate.TimeOfDay != TimeSpan.Zero ? h.EffectiveDate : h.UpdatedAt);
                    return new
                    {
                        h.Id,
                        h.MasterDataId,
                        SupplierName = string.IsNullOrWhiteSpace(h.SupplierName) ? (masterItem.Brand ?? "-") : h.SupplierName,
                        h.OldPrice,
                        h.NewPrice,
                        Reason = string.IsNullOrWhiteSpace(h.Reason) ? "Price Update" : h.Reason,
                        EffectiveDate = dt != default && dt.TimeOfDay != TimeSpan.Zero ? dt.ToString("yyyy-MM-dd HH:mm:ss") : (h.EffectiveDate.ToString("yyyy-MM-dd ") + DateTime.Now.ToString("HH:mm:ss")),
                        UpdatedBy = string.IsNullOrWhiteSpace(h.UpdatedBy) ? "admin" : h.UpdatedBy
                    };
                }).ToList();

                var currentOffersRaw = await _db.SupplierOffers
                    .Where(o => o.MasterDataId == masterDataId)
                    .OrderByDescending(o => o.UpdatedAt)
                    .ToListAsync();

                var currentOffers = currentOffersRaw.Select(o => {
                    DateTime dt = (o.UpdatedAt != default && o.UpdatedAt.TimeOfDay != TimeSpan.Zero) ? o.UpdatedAt : DateTime.Now;
                    return new
                    {
                        o.Id,
                        o.MasterDataId,
                        SupplierName = o.SupplierName ?? "-",
                        OldPrice = 0m,
                        NewPrice = o.Price,
                        Reason = o.IsSelected ? "Selected Winning Offer" : "Procurement Supplier Offer",
                        EffectiveDate = dt.ToString("yyyy-MM-dd HH:mm:ss"),
                        UpdatedBy = o.UpdatedBy ?? "system"
                    };
                }).ToList();

                return Json(new
                {
                    success = true,
                    partNumber = masterItem.Id,
                    itemName = masterItem.Item,
                    currentPrice = masterItem.CurrentUnitPrice ?? 0m,
                    currentSupplier = masterItem.Brand ?? "-",
                    histories,
                    offers = currentOffers
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetPriceHistory Error] {ex.Message}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetSupplierOffersJson(string masterDataId)
        {
            if (string.IsNullOrWhiteSpace(masterDataId)) return Json(new List<object>());

            try
            {
                await _db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Supplier_Offer"" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
                await _db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Supplier_Offer"" ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);");
            }
            catch { }

            var offers = await _db.SupplierOffers
                .Where(o => o.MasterDataId == masterDataId)
                .OrderByDescending(o => o.IsSelected)
                .ThenByDescending(o => o.UpdatedAt)
                .AsNoTracking()
                .ToListAsync();

            var item = await _db.MasterDatas.AsNoTracking().FirstOrDefaultAsync(m => m.Id == masterDataId);

            if (!offers.Any() && item != null && ((item.CurrentUnitPrice ?? 0) > 0 || !string.IsNullOrWhiteSpace(item.Brand)))
            {
                var seeded = new SupplierOffer
                {
                    MasterDataId = masterDataId,
                    Bin = item.Bin,
                    SupplierName = string.IsNullOrWhiteSpace(item.Brand) ? "General Supplier" : item.Brand,
                    Price = item.CurrentUnitPrice ?? 0m,
                    IsSelected = true,
                    UpdatedAt = item.LastPriceUpdate ?? DateTime.Now,
                    UpdatedBy = item.LastUpdatedBy ?? "system"
                };
                _db.SupplierOffers.Add(seeded);
                await _db.SaveChangesAsync();
                offers.Add(seeded);
            }

            var result = offers.Select(o => new
            {
                id = o.Id,
                masterDataId = o.MasterDataId,
                supplierName = o.SupplierName ?? "-",
                price = o.Price,
                isSelected = o.IsSelected,
                updatedAt = o.UpdatedAt.ToString("dd MMM yyyy, HH:mm"),
                updatedBy = o.UpdatedBy ?? "admin"
            });

            return Json(result);
        }

        [HttpPost]
        public async Task<IActionResult> SaveSupplierOfferAjax(string masterDataId, string supplierName, decimal price, bool setAsPrimary = true)
        {
            if (string.IsNullOrWhiteSpace(masterDataId) || string.IsNullOrWhiteSpace(supplierName) || price <= 0)
            {
                return Json(new { success = false, message = "Nama Supplier dan Harga Harus Valid." });
            }

            string cleanSup = supplierName.Trim();

            bool supExists = await _db.Suppliers.AnyAsync(s => s.Name.ToLower() == cleanSup.ToLower());
            if (!supExists)
            {
                _db.Suppliers.Add(new Supplier { Name = cleanSup });
            }

            var masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == masterDataId);
            if (masterItem == null) return Json(new { success = false, message = "Sparepart item tidak ditemukan." });

            var existingOffer = await _db.SupplierOffers
                .FirstOrDefaultAsync(o => o.MasterDataId == masterDataId && o.SupplierName!.ToLower() == cleanSup.ToLower());

            if (existingOffer != null)
            {
                existingOffer.Price = price;
                existingOffer.UpdatedAt = DateTime.Now;
                existingOffer.UpdatedBy = User.Identity?.Name ?? "admin";
                if (setAsPrimary) existingOffer.IsSelected = true;
            }
            else
            {
                existingOffer = new SupplierOffer
                {
                    MasterDataId = masterDataId,
                    Bin = masterItem.Bin,
                    SupplierName = cleanSup,
                    Price = price,
                    IsSelected = setAsPrimary,
                    UpdatedAt = DateTime.Now,
                    UpdatedBy = User.Identity?.Name ?? "admin"
                };
                _db.SupplierOffers.Add(existingOffer);
            }

            if (setAsPrimary)
            {
                var otherOffers = await _db.SupplierOffers
                    .Where(o => o.MasterDataId == masterDataId && o.Id != existingOffer.Id)
                    .ToListAsync();
                foreach (var oth in otherOffers)
                {
                    oth.IsSelected = false;
                }

                var oldPrice = masterItem.CurrentUnitPrice ?? 0m;
                masterItem.CurrentUnitPrice = price;
                masterItem.Brand = cleanSup;
                masterItem.LastPriceUpdate = DateTime.Now;
                masterItem.LastUpdatedBy = User.Identity?.Name ?? "admin";

                _db.SparepartPriceHistories.Add(new SparepartPriceHistory
                {
                    MasterDataId = masterDataId,
                    OldPrice = oldPrice,
                    NewPrice = price,
                    Currency = "IDR",
                    Reason = $"Supplier Offer Update ({cleanSup})",
                    EffectiveDate = DateTime.Today,
                    UpdatedBy = User.Identity?.Name ?? "admin",
                    UpdatedAt = DateTime.Now
                });
            }

            await _db.SaveChangesAsync();
            return Json(new { success = true, message = $"Penawaran {cleanSup} Rp {price:N0} berhasil disimpan." });
        }

        [HttpPost]
        public async Task<IActionResult> SetPrimarySupplierOfferAjax(int offerId)
        {
            var offer = await _db.SupplierOffers.FindAsync(offerId);
            if (offer == null) return Json(new { success = false, message = "Penawaran tidak ditemukan." });

            var allOffers = await _db.SupplierOffers
                .Where(o => o.MasterDataId == offer.MasterDataId)
                .ToListAsync();

            foreach (var o in allOffers)
            {
                o.IsSelected = (o.Id == offerId);
            }

            var masterItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Id == offer.MasterDataId);
            if (masterItem != null)
            {
                var oldPrice = masterItem.CurrentUnitPrice ?? 0m;
                masterItem.CurrentUnitPrice = offer.Price;
                masterItem.Brand = offer.SupplierName;
                masterItem.LastPriceUpdate = DateTime.Now;
                masterItem.LastUpdatedBy = User.Identity?.Name ?? "admin";

                _db.SparepartPriceHistories.Add(new SparepartPriceHistory
                {
                    MasterDataId = offer.MasterDataId,
                    OldPrice = oldPrice,
                    NewPrice = offer.Price,
                    Currency = "IDR",
                    Reason = $"Set Primary Supplier ({offer.SupplierName})",
                    EffectiveDate = DateTime.Today,
                    UpdatedBy = User.Identity?.Name ?? "admin",
                    UpdatedAt = DateTime.Now
                });
            }

            await _db.SaveChangesAsync();
            return Json(new { success = true, message = $"Supplier {offer.SupplierName} ditetapkan sebagai supplier utama." });
        }

        [HttpPost]
        public async Task<IActionResult> DeleteSupplierOfferAjax(int offerId)
        {
            var offer = await _db.SupplierOffers.FindAsync(offerId);
            if (offer != null)
            {
                _db.SupplierOffers.Remove(offer);
                await _db.SaveChangesAsync();
                return Json(new { success = true, message = "Penawaran supplier berhasil dihapus." });
            }
            return Json(new { success = false, message = "Penawaran tidak ditemukan." });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ApproveKeluar(int id)
        {
            bool success = await _inventoryService.ApproveBarangKeluarAsync(id, User.Identity?.Name ?? "admin");
            if (success)
            {
                TempData["Success"] = $"Transaction #{id} approved successfully and stock updated.";
            }
            else
            {
                TempData["Error"] = $"Failed to approve transaction #{id}.";
            }
            return RedirectToAction("Index", new { tab = "approvals" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RejectKeluar(int id)
        {
            bool success = await _inventoryService.RejectBarangKeluarAsync(id, User.Identity?.Name ?? "admin");
            if (success)
            {
                TempData["Success"] = $"Transaction #{id} rejected.";
            }
            else
            {
                TempData["Error"] = $"Failed to reject transaction #{id}.";
            }
            return RedirectToAction("Index", new { tab = "approvals" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateBidding(BiddingHistory model, string? itemName, string? bin)
        {
            if (string.IsNullOrWhiteSpace(model.MasterDataId))
            {
                if (!string.IsNullOrWhiteSpace(bin))
                {
                    var partByBin = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Bin == bin);
                    if (partByBin != null) model.MasterDataId = partByBin.Id;
                }
                if (string.IsNullOrWhiteSpace(model.MasterDataId) && !string.IsNullOrWhiteSpace(itemName))
                {
                    var partByItem = await _db.MasterDatas.FirstOrDefaultAsync(m => m.Item.ToLower() == itemName.ToLower());
                    if (partByItem != null) model.MasterDataId = partByItem.Id;
                }
                if (string.IsNullOrWhiteSpace(model.MasterDataId))
                {
                    model.MasterDataId = "PART-" + DateTime.Now.ToString("yyyyMMddHHmmss");
                }
            }

            if (model.BiddingYear <= 0)
            {
                model.BiddingYear = DateTime.Now.Year;
            }

            if (string.IsNullOrWhiteSpace(model.Status))
            {
                model.Status = "Completed";
            }

            if (!string.IsNullOrWhiteSpace(model.SupplierName))
            {
                string cleanSup = model.SupplierName.Trim();
                bool exists = await _db.Suppliers.AnyAsync(s => s.Name.ToLower() == cleanSup.ToLower());
                if (!exists)
                {
                    _db.Suppliers.Add(new Supplier { Name = cleanSup });
                }
            }

            _db.BiddingHistories.Add(model);
            await _db.SaveChangesAsync();
            TempData["Success"] = $"✓ Bidding record for {model.MasterDataId} ({model.BiddingYear}) created successfully.";
            return RedirectToAction("Index", new { tab = "bidding" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditBidding(BiddingHistory model, string? itemName, string? line, string? bin, string? detail, string? budgetCode, double? qtyNeedYear, double? safetyStock, double? currentStock)
        {
            var existing = await _db.BiddingHistories.FindAsync(model.Id);
            if (existing != null)
            {
                existing.MasterDataId = model.MasterDataId;
                existing.SupplierName = model.SupplierName;
                existing.BiddingYear = model.BiddingYear;
                existing.BiddingStage = model.BiddingStage;
                existing.Price = model.Price;
                existing.Status = model.Status ?? "Completed";

                if (!string.IsNullOrWhiteSpace(model.SupplierName))
                {
                    string cleanSup = model.SupplierName.Trim();
                    bool exists = await _db.Suppliers.AnyAsync(s => s.Name.ToLower() == cleanSup.ToLower());
                    if (!exists)
                    {
                        _db.Suppliers.Add(new Supplier { Name = cleanSup });
                    }
                }

                if (!string.IsNullOrWhiteSpace(model.MasterDataId))
                {
                    var master = await _db.MasterDatas.FindAsync(model.MasterDataId);
                    if (master != null)
                    {
                        if (!string.IsNullOrWhiteSpace(itemName)) master.Item = itemName;
                        if (!string.IsNullOrWhiteSpace(line)) master.Line = line;
                        if (!string.IsNullOrWhiteSpace(bin)) master.Bin = bin;
                        if (!string.IsNullOrWhiteSpace(detail)) master.Detail = detail;
                        if (!string.IsNullOrWhiteSpace(budgetCode)) master.BudgetCode = budgetCode;
                        if (qtyNeedYear.HasValue) master.QtyNeedYear = (int)qtyNeedYear.Value;
                        if (safetyStock.HasValue) master.SafetyStock = (int)safetyStock.Value;
                        if (currentStock.HasValue) master.CurrentStock = (int)currentStock.Value;
                        if (model.Price > 0) master.CurrentUnitPrice = (decimal)model.Price;
                        if (!string.IsNullOrWhiteSpace(model.SupplierName)) master.Brand = model.SupplierName;
                    }
                }

                await _db.SaveChangesAsync();
                TempData["Success"] = $"✓ Bidding record #{model.Id} updated successfully.";
            }
            else
            {
                TempData["Error"] = $"Bidding record #{model.Id} not found.";
            }
            return RedirectToAction("Index", new { tab = "bidding" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteBidding(int id)
        {
            var existing = await _db.BiddingHistories.FindAsync(id);
            if (existing != null)
            {
                _db.BiddingHistories.Remove(existing);
                await _db.SaveChangesAsync();
                TempData["Success"] = $"Bidding record #{id} deleted successfully.";
            }
            return RedirectToAction("Index", new { tab = "bidding" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CopyBiddingYear(int fromYear, int toYear, bool overwrite = false)
        {
            if (fromYear <= 0 || toYear <= 0 || fromYear == toYear)
            {
                TempData["Error"] = "Tahun asal dan tahun tujuan harus valid dan tidak boleh sama.";
                return RedirectToAction("Index", new { tab = "bidding" });
            }

            var sourceRecords = await _db.BiddingHistories
                .AsNoTracking()
                .Where(b => b.BiddingYear == fromYear)
                .ToListAsync();

            if (!sourceRecords.Any())
            {
                TempData["Error"] = $"Tidak ada data bidding untuk tahun {fromYear}.";
                return RedirectToAction("Index", new { tab = "bidding" });
            }

            int insertedCount = 0;
            foreach (var src in sourceRecords)
            {
                var existing = await _db.BiddingHistories
                    .FirstOrDefaultAsync(b => b.BiddingYear == toYear && b.MasterDataId == src.MasterDataId);

                if (existing != null)
                {
                    if (overwrite)
                    {
                        existing.BiddingStage = src.BiddingStage;
                        existing.SupplierName = src.SupplierName;
                        existing.Price = src.Price;
                        existing.Status = src.Status;
                        insertedCount++;
                    }
                }
                else
                {
                    _db.BiddingHistories.Add(new BiddingHistory
                    {
                        MasterDataId = src.MasterDataId,
                        BiddingYear = toYear,
                        BiddingStage = src.BiddingStage,
                        SupplierName = src.SupplierName,
                        Price = src.Price,
                        Status = src.Status ?? "Completed"
                    });
                    insertedCount++;
                }
            }

            await _db.SaveChangesAsync();
            TempData["Success"] = $"✓ Berhasil menyalin/memperbarui {insertedCount} data bidding dari tahun {fromYear} ke tahun {toYear}.";
            return RedirectToAction("Index", new { tab = "bidding", year = toYear });
        }
    }
}
