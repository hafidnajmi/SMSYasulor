using System;

namespace PPI.IM.Domain.Entities
{
    public class ImDivisionData
    {
        public int Id { get; set; }
        public int ImId { get; set; }
        public string Division { get; set; } = string.Empty;
        public string? DataJson { get; set; }
        public byte[]? ImageData { get; set; }
        public int? SubmittedBy { get; set; }
        public DateTime SubmittedAt { get; set; } = DateTime.Now;
    }
}
