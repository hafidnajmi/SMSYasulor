using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Machine_Master")]
    public class MachineMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        [Column("machine_code")]
        public string MachineCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        [Column("machine_name")]
        public string MachineName { get; set; } = string.Empty;

        [StringLength(100)]
        [Column("line")]
        public string? Line { get; set; }

        [StringLength(100)]
        [Column("area")]
        public string? Area { get; set; }

        [StringLength(100)]
        [Column("machine_type")]
        public string? MachineType { get; set; }

        [StringLength(200)]
        [Column("manufacturer")]
        public string? Manufacturer { get; set; }

        [StringLength(200)]
        [Column("model")]
        public string? Model { get; set; }

        [Required]
        [StringLength(20)]
        [Column("status")]
        public string Status { get; set; } = "active";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
