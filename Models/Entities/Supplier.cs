using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Supplier")]
    public class Supplier
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        [Column("address")]
        public string? Address { get; set; }

        [StringLength(200)]
        [Column("email")]
        public string? Email { get; set; }

        [StringLength(50)]
        [Column("phone")]
        public string? Phone { get; set; }

        [StringLength(100)]
        [Column("pic")]
        public string? Pic { get; set; }
    }
}
