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
        /// Status P (Planning), E (Execute), R (Revision), M (Missed), O (Overhoul), E_P (Execute from Plan), E_R (Execute from Revision)
        /// </summary>
        [Required]
        [StringLength(20)]
        [Column("status")]
        public string Status { get; set; } = "P";

        /// <summary>
        /// Source status origin: P (Planning) or R (Revision)
        /// </summary>
        [StringLength(20)]
        [Column("source_status")]
        public string? SourceStatus { get; set; } = "P";

        /// <summary>
        /// Reference to parent schedule (for tracking revision/execution history without data loss)
        /// </summary>
        [Column("parent_id")]
        public int? ParentId { get; set; }

        [StringLength(150)]
        [Column("technician")]
        public string? Technician { get; set; }

        [StringLength(100)]
        [Column("up_area")]
        public string? UpArea { get; set; }

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

        /// <summary>
        /// Helper property to categorize exact status and display colors:
        /// - Overhaul: Kuning #FFD300 (Overhoul)
        /// - ExecutePlan: Abu Abu - Hijau (Planning ter execute)
        /// - ExecuteRevision: Biru - Hijau (Execute dari Revisi)
        /// - MissedPlan: Abu Abu - Merah (Planning Missed)
        /// - Revision: Biru (Revisi)
        /// - Planning: Abu Abu (Planning)
        /// </summary>
        [NotMapped]
        public string DisplayStatusCategory
        {
            get
            {
                var st = (Status ?? "P").Trim().ToUpper();
                var src = (SourceStatus ?? "P").Trim().ToUpper();

                if (st == "O" || st == "OVERHOUL" || st == "OVERHAUL" ||
                    (!string.IsNullOrWhiteSpace(Notes) && (Notes.ToUpper().Contains("OVERHAUL") || Notes.ToUpper().Contains("OVERHOUL"))))
                    return "Overhaul"; // Kuning #FFD300
                if (st == "E_R" || (st == "E" && src == "R"))
                    return "ExecuteRevision"; // Biru - Hijau
                if (st == "E_P" || (st == "E" && src == "P") || st == "E")
                    return "ExecutePlan";     // Abu Abu - Hijau
                if (st == "M_R" || (st == "M" && src == "R"))
                    return "MissedRevision";  // Biru - Merah
                if (st == "M" || st == "M_P")
                    return "MissedPlan";      // Abu Abu - Merah
                if (st == "R")
                    return "Revision";        // Biru
                return "Planning";            // Abu Abu
            }
        }

        [NotMapped]
        public bool IsDualStatus => DisplayStatusCategory switch
        {
            "ExecutePlan" or "ExecuteRevision" or "MissedPlan" or "MissedRevision" => true,
            _ => false
        };

        [NotMapped]
        public string LeftStatusLabel => DisplayStatusCategory switch
        {
            "Overhaul" => "Overhoul",
            "ExecuteRevision" or "MissedRevision" => "Revision",
            "Revision" => "Revision",
            _ => "Plan"
        };

        [NotMapped]
        public string RightStatusLabel => DisplayStatusCategory switch
        {
            "ExecutePlan" or "ExecuteRevision" => "Execute",
            "MissedPlan" or "MissedRevision" => "Missed",
            _ => ""
        };

        [NotMapped]
        public string StatusBadgeCssClass
        {
            get
            {
                return DisplayStatusCategory switch
                {
                    "Overhaul" => "pm-tag-o",
                    "ExecuteRevision" => "pm-tag-e-r",
                    "ExecutePlan" => "pm-tag-e-p",
                    "MissedPlan" or "MissedRevision" => "pm-tag-m-p",
                    "Revision" => "pm-tag-r",
                    _ => "pm-tag-p"
                };
            }
        }

        [NotMapped]
        public string StatusDisplayLabel
        {
            get
            {
                return DisplayStatusCategory switch
                {
                    "Overhaul" => "Overhoul",
                    "ExecuteRevision" => "Revision / Execute",
                    "ExecutePlan" => "Plan / Execute",
                    "MissedPlan" or "MissedRevision" => "Plan / Missed",
                    "Revision" => "Revision",
                    _ => "Plan"
                };
            }
        }

        [NotMapped]
        public string StatusPillsHtml
        {
            get
            {
                return DisplayStatusCategory switch
                {
                    "Overhaul" => "<span class=\"badge py-0 px-1 me-1 text-dark fw-bold\" style=\"background-color:#FFD300; font-size:9px;\">Overhoul</span>",
                    "ExecuteRevision" => "<span class=\"badge py-0 px-1 me-1 text-white\" style=\"background-color:#005497; font-size:9px;\">Revision</span><span class=\"badge py-0 px-1 me-1 text-dark\" style=\"background-color:#00e436; font-size:9px;\">Execute</span>",
                    "ExecutePlan" => "<span class=\"badge py-0 px-1 me-1 text-dark\" style=\"background-color:#e5e2de; border:1px solid #b8b4ae; font-size:9px;\">Planning</span><span class=\"badge py-0 px-1 me-1 text-dark\" style=\"background-color:#00e436; font-size:9px;\">Execute</span>",
                    "MissedRevision" => "<span class=\"badge py-0 px-1 me-1 text-white\" style=\"background-color:#005497; font-size:9px;\">Revision</span><span class=\"badge py-0 px-1 me-1 text-white\" style=\"background-color:#fd4800; font-size:9px;\">Missed</span>",
                    "MissedPlan" => "<span class=\"badge py-0 px-1 me-1 text-dark\" style=\"background-color:#e5e2de; border:1px solid #b8b4ae; font-size:9px;\">Planning</span><span class=\"badge py-0 px-1 me-1 text-white\" style=\"background-color:#fd4800; font-size:9px;\">Missed</span>",
                    "Revision" => "<span class=\"badge py-0 px-1 me-1 text-white\" style=\"background-color:#005497; font-size:9px;\">Revision</span>",
                    _ => "<span class=\"badge py-0 px-1 me-1 text-dark\" style=\"background-color:#e5e2de; border:1px solid #b8b4ae; font-size:9px;\">Planning</span>"
                };
            }
        }
    }
}
