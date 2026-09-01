using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Supplier_Offer")]
    public class SupplierOffer
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        [Column("master_data_id")]
        public string MasterDataId { get; set; } = string.Empty;

        [StringLength(50)]
        [Column("bin")]
        public string? Bin { get; set; }

        [StringLength(200)]
        [Column("supplier_name")]
        public string? SupplierName { get; set; }

        [Column("supplier_id")]
        public int? SupplierId { get; set; }

        [Column("price", TypeName = "decimal(18, 2)")]
        public decimal Price { get; set; }

        [Column("is_selected")]
        public bool IsSelected { get; set; } = false;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [StringLength(100)]
        [Column("updated_by")]
        public string? UpdatedBy { get; set; }
    }
}
