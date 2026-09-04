using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("pm_schedule")]
    public class PmSchedule
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("machine_id")]
        public int? MachineId { get; set; }

        [StringLength(100)]
        [Column("machine_code")]
        public string? MachineCode { get; set; }

        [StringLength(200)]
        [Column("machine_name")]
        public string? MachineName { get; set; }

        [Required]
        [Column("scheduled_date")]
        public DateTime ScheduledDate { get; set; }

        /// <summary>
        /// Status P (Planning), E (Execute), R (Revision), M (Missed)
        /// </summary>
        [Required]
        [StringLength(20)]
        [Column("status")]
        public string Status { get; set; } = "P";

        [StringLength(150)]
        [Column("technician")]
        public string? Technician { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [StringLength(100)]
        [Column("created_by")]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [StringLength(100)]
        [Column("updated_by")]
        public string? UpdatedBy { get; set; }
    }
}
