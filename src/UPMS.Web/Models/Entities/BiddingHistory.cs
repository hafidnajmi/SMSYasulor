using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("Bidding_History")]
    public class BiddingHistory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        [Column("master_data_id")]
        public string MasterDataId { get; set; } = string.Empty;

        [Column("bidding_year")]
        public int BiddingYear { get; set; }

        [StringLength(50)]
        [Column("bidding_stage")]
        public string? BiddingStage { get; set; }

        [StringLength(200)]
        [Column("supplier_name")]
        public string? SupplierName { get; set; }

        [Column("price")]
        public double Price { get; set; }

        [StringLength(50)]
        [Column("status")]
        public string? Status { get; set; }
    }
}
