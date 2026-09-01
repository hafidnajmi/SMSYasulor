using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("SPAREPART_PRICE_HISTORY")]
    public class SparepartPriceHistory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        [Column("master_data_id")]
        public string MasterDataId { get; set; } = string.Empty;

        [StringLength(200)]
        [Column("supplier_name")]
        public string? SupplierName { get; set; }

        [Column("old_price", TypeName = "decimal(18, 2)")]
        public decimal OldPrice { get; set; }

        [Column("new_price", TypeName = "decimal(18, 2)")]
        public decimal NewPrice { get; set; }

        [StringLength(10)]
        [Column("currency")]
        public string? Currency { get; set; } = "IDR";

        [StringLength(200)]
        [Column("reason")]
        public string? Reason { get; set; }

        [Column("effective_date")]
        public DateTime EffectiveDate { get; set; } = DateTime.Today;

        [StringLength(100)]
        [Column("updated_by")]
        public string? UpdatedBy { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
