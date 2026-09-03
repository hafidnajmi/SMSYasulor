using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Barang_Keluar")]
    public class BarangKeluar
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
        [Column("rem_name")]
        public string? RemName { get; set; }

        [StringLength(50)]
        [Column("master_data_id")]
        public string? MasterDataId { get; set; }

        [StringLength(100)]
        [Column("line")]
        public string? Line { get; set; }

        [Column("machine_id")]
        public int? MachineId { get; set; }

        [StringLength(50)]
        [Column("maintenance_type")]
        public string? MaintenanceType { get; set; }

        [StringLength(100)]
        [Column("failure_reason")]
        public string? FailureReason { get; set; }

        [StringLength(500)]
        [Column("action_note")]
        public string? ActionNote { get; set; }

        [Column("Unit_Price", TypeName = "decimal(18, 2)")]
        public decimal? UnitPrice { get; set; }

        [Column("Total_Cost", TypeName = "decimal(18, 2)")]
        public decimal? TotalCost { get; set; }

        [StringLength(50)]
        [Column("approval_status")]
        public string? ApprovalStatus { get; set; } = "Approved";

        [StringLength(100)]
        [Column("approved_by")]
        public string? ApprovedBy { get; set; }

        [Column("approved_at")]
        public DateTime? ApprovedAt { get; set; }

        [StringLength(100)]
        [Column("pic")]
        public string? Pic { get; set; }

        [Column("user_id")]
        public int? UserId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
