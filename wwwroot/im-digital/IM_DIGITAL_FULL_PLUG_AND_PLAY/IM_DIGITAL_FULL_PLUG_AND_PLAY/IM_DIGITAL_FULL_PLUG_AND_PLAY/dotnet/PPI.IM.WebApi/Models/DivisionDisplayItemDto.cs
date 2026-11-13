using System;
using PPI.IM.Domain.Entities;

namespace PPI.IM.WebApi.Models
{
    public class DivisionDisplayItemDto
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string FgCode { get; set; } = string.Empty;
        public string SfCode { get; set; } = string.Empty;
        public string FlaNo { get; set; } = string.Empty;
        public string IssueDate { get; set; } = string.Empty;
        public bool IsFilled { get; set; }
        public string StatusText => IsFilled ? "Filled" : "Not Filled";
        public string Comment { get; set; } = string.Empty;
        public ImDocument RawDocument { get; set; } = new();
    }
}
