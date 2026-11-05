using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UPMS.Web.Models.Entities
{
    [Table("System_Updates")]
    public class SystemUpdate
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [StringLength(50)]
        [Column("version")]
        public string Version { get; set; } = "v1.0.0";

        [Required]
        [StringLength(50)]
        [Column("update_type")]
        public string UpdateType { get; set; } = "Improvement"; // "Bug Fix", "Improvement", "New Feature", "System Alert"

        [Required]
        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("action_required")]
        public string? ActionRequired { get; set; }

        [StringLength(50)]
        [Column("target_audience")]
        public string TargetAudience { get; set; } = "All Users"; // "All Users", "Admin Only", "Technician Only"

        [StringLength(50)]
        [Column("release_status")]
        public string ReleaseStatus { get; set; } = "Published"; // "Draft", "Published"

        [Column("release_date")]
        public DateTime? ReleaseDate { get; set; }

        [Column("send_email")]
        public bool SendEmail { get; set; } = false;

        [Column("recipient_emails")]
        public string? RecipientEmails { get; set; }

        [Column("email_sent_count")]
        public int EmailSentCount { get; set; } = 0;

        [Column("email_sent_at")]
        public DateTime? EmailSentAt { get; set; }

        [Column("show_popup_alert")]
        public bool ShowPopupAlert { get; set; } = true;

        [Column("popup_duration_days")]
        public int PopupDurationDays { get; set; } = 7;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [StringLength(100)]
        [Column("created_by")]
        public string CreatedBy { get; set; } = "Developer";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}

