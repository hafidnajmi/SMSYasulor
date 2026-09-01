using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Email_Supplier_Log")]
    public class EmailSupplierLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        [Column("master_data_id")]
        public string MasterDataId { get; set; } = string.Empty;

        [StringLength(50)]
        [Column("bin")]
        public string? Bin { get; set; }

        [Column("supplier_id")]
        public int? SupplierId { get; set; }

        [Column("sent_date")]
        public DateTime SentDate { get; set; } = DateTime.Now;
    }
}
