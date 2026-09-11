using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("pm_standard_part")]
    public class PmStandardPart
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        [Column("line")]
        public string Line { get; set; } = string.Empty;

        [StringLength(200)]
        [Column("machine_name")]
        public string? MachineName { get; set; }

        [Required]
        [StringLength(100)]
        [Column("sparepart_id")]
        public string SparepartId { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        [Column("sparepart_name")]
        public string SparepartName { get; set; } = string.Empty;

        [Column("default_quantity")]
        public double DefaultQuantity { get; set; } = 1;

        [StringLength(50)]
        [Column("unit")]
        public string? Unit { get; set; } = "Pcs";

        [StringLength(50)]
        [Column("frequency")]
        public string? Frequency { get; set; } = "Monthly";

        [Column("duration_min")]
        public int? DurationMin { get; set; } = 30;

        [StringLength(100)]
        [Column("target_months")]
        public string? TargetMonths { get; set; } = "1,2,3,4,5,6,7,8,9,10,11,12";

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
