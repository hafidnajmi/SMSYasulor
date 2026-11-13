using System.Collections.Generic;

namespace PPI.IM.Domain.Models
{
    public class QcLimitResult
    {
        public double StopMin { get; set; }
        public double AdjMin { get; set; }
        public double RunMin { get; set; }
        public double Nominal { get; set; }
        public double LinkBom { get; set; }
        public double RunMax { get; set; }
        public double AdjMax { get; set; }
        public double StopMax { get; set; }
        public double StatError { get; set; }
        public double SyaratLegal { get; set; }
    }

    public class QcCalculationSummary
    {
        public QcLimitResult LimitsGram { get; set; } = new();
        public QcLimitResult LimitsMl { get; set; } = new();
    }

    public class DuoQcCalculationSummary
    {
        public QcCalculationSummary Phase1 { get; set; } = new();
        public QcCalculationSummary Phase2 { get; set; } = new();
        public QcCalculationSummary Total { get; set; } = new();
    }

    public class UserSession
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER";
        public List<string> AllowedDivisions { get; set; } = new();

        public bool HasAccessTo(string division)
        {
            if (Role.Equals("ADMIN", System.StringComparison.OrdinalIgnoreCase))
                return true;

            return AllowedDivisions.Contains(division);
        }
    }
}
