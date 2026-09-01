using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("sparepart_line_mapping")]
    public class SparepartLineMapping
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        [Column("sparepart_id")]
        public string SparepartId { get; set; } = string.Empty;

        [Column("line_id")]
        public int LineId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("is_active")]
        public int IsActive { get; set; } = 1;

        [Column("approved")]
        public int Approved { get; set; } = 1;

        [StringLength(20)]
        [Column("mapping_source")]
        public string? MappingSource { get; set; }

        [Column("usage_count")]
        public int? UsageCount { get; set; }

        [Column("last_used_at")]
        public DateTime? LastUsedAt { get; set; }
    }
}
