using System;
using System.Collections.Generic;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Models.ViewModels
{
    // ── DTO: Line Health Summary (mirrors Python lines_health state) ──────────
    public class LineHealthDto
    {
        public string LineCode { get; set; } = string.Empty;
        public string Area { get; set; } = "UP1";
        public int CompatibleParts { get; set; }
        public int PendingReview { get; set; }
        public int TotalMachines { get; set; }
        public string HealthStatus { get; set; } = "Healthy"; // Healthy | Warning | Critical
        public DateTime? LastActivity { get; set; }
    }

    // ── DTO: Compatible Part row ──────────────────────────────────────────────
    public class CompatiblePartDto
    {
        public string Id { get; set; } = string.Empty;
        public string Item { get; set; } = string.Empty;
        public string Machine { get; set; } = "-";
        public string Bin { get; set; } = "-";
        public string Category { get; set; } = "-";
        public double LeadTime { get; set; }
        public int CurrentStock { get; set; }
        public decimal CurrentPrice { get; set; }
        public string MappingSource { get; set; } = "MANUAL";
        public string StatusDisplay { get; set; } = "Approved";
        public DateTime? CompatibleSince { get; set; }
    }

    // ── DTO: Machine Compatibility row ────────────────────────────────────────
    public class MachineCompatibilityDto
    {
        public int MachineId { get; set; }
        public string MachineCode { get; set; } = string.Empty;
        public string MachineName { get; set; } = string.Empty;
        public string Line { get; set; } = "-";
        public string MachineType { get; set; } = "-";
        public bool Approved { get; set; }
        public string Source { get; set; } = "MANUAL";
        public DateTime CreatedAt { get; set; }
        public int? UsageCount { get; set; }
    }

    // ── DTO: Pending Review row ───────────────────────────────────────────────
    public class PendingReviewDto
    {
        public int Id { get; set; }
        public string PartNumber { get; set; } = string.Empty;
        public string PartName { get; set; } = "-";
        public string Line { get; set; } = "-";
        public string Source { get; set; } = "AUTO";
        public string Reason { get; set; } = string.Empty;
        public DateTime DateCreated { get; set; }
        public string Status { get; set; } = "Pending Review";
    }

    // ── DTO: Statistics ───────────────────────────────────────────────────────
    public class TopLineDto  { public string LineCode { get; set; } = ""; public int Count { get; set; } }
    public class TopSpDto    { public string SparepartId { get; set; } = ""; public int Count { get; set; } }
    public class GrowthDto   { public string Label { get; set; } = ""; public int Value { get; set; } }

    public class CompatibilityStatsDto
    {
        public int TotalLines       { get; set; }
        public int TotalMachines    { get; set; }
        public int TotalSpareparts  { get; set; }
        public int PendingMapping   { get; set; }
        public int ManualMapping    { get; set; }
        public int AutoMapping      { get; set; }
        public List<TopLineDto>  TopLines       { get; set; } = new();
        public List<TopSpDto>    TopSpareparts  { get; set; } = new();
        public List<GrowthDto>   GrowthMonthly  { get; set; } = new();
    }

    // ── ViewModel: Main LineCompatibility view ────────────────────────────────
    public class LineCompatibilityViewModel
    {
        public string SubTab { get; set; } = "line"; // line | machine | pending | statistics

        // ── TAB 1: Line ───────────────────────────────────────────────────────
        public List<LineHealthDto> LinesHealth { get; set; } = new();
        public string? SelectedLine { get; set; }
        public LineHealthDto? SelectedLineData { get; set; }
        public string LineSearch { get; set; } = "";
        public string LineSort { get; set; } = "line_code";
        public string DetailSearch { get; set; } = "";
        public string KpiTab { get; set; } = "parts"; // parts | machines

        // ── Parts list (KPI: parts sub-tab) ──────────────────────────────────
        public List<CompatiblePartDto> CompatibleParts { get; set; } = new();
        public int PartsPage { get; set; } = 1;
        public int PartsTotalPages { get; set; } = 1;
        public int PartsTotalCount { get; set; }

        // ── Machines in line (KPI: machines sub-tab) ─────────────────────────
        public List<MachineMaster> MachinesInLine { get; set; } = new();

        // ── TAB 2: Machine ────────────────────────────────────────────────────
        public List<MasterData> AllSpareparts { get; set; } = new();
        public string? SelectedPartId { get; set; }
        public MasterData? SelectedPart { get; set; }
        public List<MachineCompatibilityDto> MachinesForPart { get; set; } = new();
        public string SpSearch { get; set; } = "";

        // ── TAB 3: Pending ────────────────────────────────────────────────────
        public List<PendingReviewDto> PendingReviews { get; set; } = new();

        // ── TAB 4: Statistics ─────────────────────────────────────────────────
        public CompatibilityStatsDto? Stats { get; set; }
    }
}
