using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Audit_Log")]
    public class AuditLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public long Id { get; set; }

        [Required]
        [StringLength(100)]
        [Column("table_name")]
        public string TableName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        [Column("record_id")]
        public string RecordId { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        [Column("action")]
        public string Action { get; set; } = string.Empty;

        [Column("old_value")]
        public string? OldData { get; set; }

        [Column("new_value")]
        public string? NewData { get; set; }

        [StringLength(100)]
        [Column("changed_by")]
        public string? ChangedBy { get; set; }

        [Column("changed_at")]
        public DateTime ChangedAt { get; set; } = DateTime.Now;
    }
}
