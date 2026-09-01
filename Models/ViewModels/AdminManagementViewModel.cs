using System;
using System.Collections.Generic;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Models.ViewModels
{
    public class SparepartLineMappingDto
    {
        public int Id { get; set; }
        public string SparepartId { get; set; } = string.Empty;
        public string SparepartName { get; set; } = "-";
        public string LineName { get; set; } = "-";
        public DateTime CreatedAt { get; set; }
        public int IsActive { get; set; }
        public int Approved { get; set; } = 1;
        public string MappingSource { get; set; } = "MANUAL";
    }

    public class BiddingHistoryItemDto
    {
        public int Id { get; set; }
        public string MasterDataId { get; set; } = string.Empty;
        public int BiddingYear { get; set; }
        public string Line { get; set; } = "-";
        public string Bin { get; set; } = "-";
        public string ItemName { get; set; } = "-";
        public string Detail { get; set; } = "-";
        public string BudgetCode { get; set; } = "-";
        public int QtyNeedYear { get; set; }
        public int SafetyStock { get; set; }
        public int CurrentStock { get; set; }
        public int QtyBid => Math.Max(0, QtyNeedYear + SafetyStock - CurrentStock);
        public decimal Price { get; set; }
        public decimal TotalValue => QtyBid * Price;
        public string? SupplierName { get; set; }
        public string? BiddingStage { get; set; }
        public string? Status { get; set; }
    }

    public class AdminManagementViewModel
    {
        public string ActiveTab { get; set; } = "procurement";
        public string ActiveSubTab { get; set; } = "keluar";

        // Procurement Comparison Tab Data
        public List<MasterData> ProcurementItems { get; set; } = new();
        public decimal TotalValuation { get; set; }
        public int TotalMasterItems { get; set; }
        public int CriticalLowStockCount { get; set; }
        public decimal AveragePrice { get; set; }
        public HashSet<string> BiddingMasterDataIds { get; set; } = new();
        public List<Supplier> AvailableSuppliers { get; set; } = new();
        public List<MasterData> AllMasterDataItems { get; set; } = new();

        // Pagination & Filters
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        public int TotalPages { get; set; } = 1;
        public int FilteredTotalItems { get; set; }
        public string? SearchQuery { get; set; }
        public string? CategoryFilter { get; set; }
        public string? StockFilter { get; set; }
        public List<string> AvailableCategories { get; set; } = new();

        // Bidding History Tab Data
        public List<BiddingHistory> BiddingRecords { get; set; } = new();
        public List<BiddingHistoryItemDto> BiddingRecordDtos { get; set; } = new();
        public decimal TotalBiddingValue { get; set; }
        public string TopSupplier { get; set; } = "-";
        public List<int> BiddingYears { get; set; } = new();
        public int? SelectedYear { get; set; }

        // Approval Queue Tab Data
        public List<BarangKeluar> PendingBarangKeluarApprovals { get; set; } = new();
        public List<SparepartLineMapping> LineMappings { get; set; } = new();

        // Line Compatibility Tab Data
        public List<SparepartLineMappingDto> LineCompatibilityList { get; set; } = new();
        public List<string> AvailableProductionLines { get; set; } = new();
    }
}
