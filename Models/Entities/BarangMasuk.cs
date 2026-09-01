using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Barang_Masuk")]
    public class BarangMasuk
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("tanggal")]
        public DateTime Tanggal { get; set; } = DateTime.Today;

        [StringLength(50)]
        [Column("bin")]
        public string? Bin { get; set; }

        [Required]
        [StringLength(200)]
        [Column("item_name")]
        public string ItemName { get; set; } = string.Empty;

        [Column("qty")]
        public int Qty { get; set; }

        [StringLength(100)]
        [Column("pic")]
        public string? Pic { get; set; }

        [StringLength(200)]
        [Column("supplier")]
        public string? Supplier { get; set; }

        [StringLength(100)]
        [Column("part_number")]
        public string? PartNumber { get; set; }

        [StringLength(100)]
        [Column("po_number")]
        public string? PoNumber { get; set; }

        [Column("unit_price")]
        public decimal? UnitPrice { get; set; }

        [Column("remarks")]
        public string? Remarks { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
