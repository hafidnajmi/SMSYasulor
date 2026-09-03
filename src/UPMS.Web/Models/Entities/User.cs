using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Users")]
    public class User
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        [Column("username")]
        public string Username { get; set; } = string.Empty;

        [Required]
        [StringLength(64)]
        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [StringLength(200)]
        [Column("full_name")]
        public string? FullName { get; set; }

        [Required]
        [StringLength(20)]
        [Column("role")]
        public string Role { get; set; } = "user";

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("last_login")]
        public DateTime? LastLogin { get; set; }

        [Column("can_spareparts_catalog")]
        public int CanMasterData { get; set; } = 0;

        [Column("can_admin_portal")]
        public int CanAdminMgmt { get; set; } = 0;

        [NotMapped]
        public int CanBidding { get => CanAdminMgmt; set => CanAdminMgmt = value; }

        [Column("can_settings_users")]
        public int CanSettings { get; set; } = 0;

        [Column("can_barang_masuk")]
        public int CanBarangMasuk { get; set; } = 0;

        [Column("can_transaction_logs")]
        public int CanRiwayat { get; set; } = 0;

        [NotMapped]
        public int CanElectricalParts { get; set; } = 0;

        [Column("can_master_supplier")]
        public int CanSupplierData { get; set; } = 0;

        [Column("can_email_settings")]
        public int CanEmailSettings { get; set; } = 0;

        [Column("can_barang_keluar")]
        public int CanBarangKeluar { get; set; } = 0;

        [Column("can_line_compatibility")]
        public int CanLineMapping { get; set; } = 0;

        [Column("can_master_machine")]
        public int CanMasterMachine { get; set; } = 0;

        [NotMapped]
        public int CanSparepartMachine { get => CanMasterMachine; set => CanMasterMachine = value; }

        [Column("can_cost_intelligence")]
        public int CanCostIntelligence { get; set; } = 0;

        [Column("require_approval_keluar")]
        public bool RequireApprovalKeluar { get; set; } = false;
    }
}
