using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("pm_schedule_item")]
    public class PmScheduleItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("pm_schedule_id")]
        public int PmScheduleId { get; set; }

        [Required]
        [StringLength(100)]
        [Column("sparepart_id")]
        public string SparepartId { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        [Column("sparepart_name")]
        public string SparepartName { get; set; } = string.Empty;

        [Column("quantity")]
        public double Quantity { get; set; } = 1;

        [StringLength(50)]
        [Column("unit")]
        public string? Unit { get; set; } = "Pcs";

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("PmScheduleId")]
        public virtual PmSchedule? PmSchedule { get; set; }
    }
}
