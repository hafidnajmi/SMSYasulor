using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Master_Data")]
    public class MasterData
    {
        [Key]
        [StringLength(50)]
        [Column("id")]
        public string Id { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        [Column("item")]
        public string Item { get; set; } = string.Empty;

        [StringLength(500)]
        [Column("detail")]
        public string? Detail { get; set; }

        [StringLength(100)]
        [Column("brand")]
        public string? Brand { get; set; }

        [StringLength(200)]
        [Column("machine")]
        public string? Machine { get; set; }

        [StringLength(50)]
        [Column("up_area")]
        public string? UpArea { get; set; }

        [StringLength(50)]
        [Column("bin")]
        public string? Bin { get; set; }

        [StringLength(100)]
        [Column("line")]
        public string? Line { get; set; }

        [StringLength(50)]
        [Column("category")]
        public string? Category { get; set; }

        [StringLength(50)]
        [Column("frequency")]
        public string? Frequency { get; set; }

        [Column("current_stock")]
        public int? CurrentStock { get; set; }

        [Column("safety_stock")]
        public int? SafetyStock { get; set; }

        [Column("qty_need_year")]
        public double? QtyNeedYear { get; set; }

        [Column("tbm_per_month")]
        public double? TbmPerMonth { get; set; }

        [Column("lt_per_month")]
        public double? LtPerMonth { get; set; }

        [StringLength(100)]
        [Column("budget_code")]
        public string? BudgetCode { get; set; }

        [Column("image")]
        public string? Image { get; set; }

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [Column("alert_selected")]
        public bool AlertSelected { get; set; } = false;

        [Column("current_unit_price", TypeName = "decimal(18, 2)")]
        public decimal? CurrentUnitPrice { get; set; }

        [StringLength(10)]
        [Column("currency")]
        public string? Currency { get; set; } = "IDR";

        [Column("last_price_update")]
        public DateTime? LastPriceUpdate { get; set; }

        [StringLength(100)]
        [Column("last_updated_by")]
        public string? LastUpdatedBy { get; set; }
    }
}
