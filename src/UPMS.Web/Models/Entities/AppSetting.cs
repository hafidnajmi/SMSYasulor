using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("App_Settings")]
    public class AppSetting
    {
        [Key]
        [StringLength(100)]
        [Column("setting_key")]
        public string SettingKey { get; set; } = string.Empty;

        [Column("setting_value")]
        public string? SettingValue { get; set; }
    }
}
