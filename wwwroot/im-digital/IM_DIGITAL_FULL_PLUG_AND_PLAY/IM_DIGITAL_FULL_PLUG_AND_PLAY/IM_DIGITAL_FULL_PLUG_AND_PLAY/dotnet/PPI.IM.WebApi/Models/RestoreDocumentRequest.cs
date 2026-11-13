using System.Collections.Generic;

namespace PPI.IM.WebApi.Models
{
    public class RestoreDocumentRequest
    {
        public bool RestoreAll { get; set; } = true;
        public List<string>? Divisions { get; set; }
    }
}
