using System;

namespace PPI.IM.Domain.Entities
{
    public class ImDocument
    {
        public int Id { get; set; }
        public string ImCode { get; set; } = string.Empty;
        public string? Uuid { get; set; }
        public string? Description { get; set; }
        public string? KodeSf { get; set; }
        public string? NoFla { get; set; }
        public string? TglIssue { get; set; }
        public string? AlasanRevisi { get; set; }
        public string Status { get; set; } = "Draft"; // Draft, Running, Closed, Revision
        public string? JenisLine { get; set; }
        public string? DeptSet { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
        public string? LockedBy { get; set; }
        public DateTime? LockedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
        public byte[]? PdfBlob { get; set; }
        public string? PdfFilename { get; set; }
        public string SourceType { get; set; } = "Digital"; // Digital, Hilirisasi, Manual
    }
}
