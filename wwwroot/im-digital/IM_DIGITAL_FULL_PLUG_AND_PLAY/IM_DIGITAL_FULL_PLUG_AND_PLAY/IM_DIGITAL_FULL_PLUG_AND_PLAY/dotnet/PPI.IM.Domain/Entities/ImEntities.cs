using System;

namespace PPI.IM.Domain.Entities
{
    public class ImLock
    {
        public string ImCode { get; set; } = string.Empty;
        public string Division { get; set; } = string.Empty;
        public string? LockedBy { get; set; }
        public DateTime LockedAt { get; set; } = DateTime.Now;
    }

    public class Assignee
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Division { get; set; } = string.Empty;
        public byte[]? SignatureImage { get; set; }
        public string? Password { get; set; }
    }

    public class AuthLog
    {
        public int Id { get; set; }
        public string? Username { get; set; }
        public int? UserId { get; set; }
        public string? Status { get; set; } // SUCCESS, FAILED
        public string? Detail { get; set; }
        public DateTime LoggedAt { get; set; } = DateTime.Now;
    }

    public class SecurityAuditLog
    {
        public int Id { get; set; }
        public string? Action { get; set; }
        public string? Administrator { get; set; }
        public string? TargetUsername { get; set; }
        public string? ComputerName { get; set; }
        public string? Reason { get; set; }
        public DateTime LoggedAt { get; set; } = DateTime.Now;
    }

    public class ImAuditLog
    {
        public int Id { get; set; }
        public int? ImId { get; set; }
        public int? UserId { get; set; }
        public string? Action { get; set; }
        public string? Detail { get; set; }
        public DateTime LoggedAt { get; set; } = DateTime.Now;
    }

    public class SpecCodeMaster
    {
        public int Id { get; set; }
        public string SpecCode { get; set; } = string.Empty;
        public string? SpecName { get; set; }
        public string? FgCodes { get; set; }
        public string? A6DataJson { get; set; }
        public string? A7DataJson { get; set; }
        public string? PalletPdfName { get; set; }
        public string? PalletPdfData { get; set; }
        public string? FgSpecPdfName { get; set; }
        public string? FgSpecPdfData { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
