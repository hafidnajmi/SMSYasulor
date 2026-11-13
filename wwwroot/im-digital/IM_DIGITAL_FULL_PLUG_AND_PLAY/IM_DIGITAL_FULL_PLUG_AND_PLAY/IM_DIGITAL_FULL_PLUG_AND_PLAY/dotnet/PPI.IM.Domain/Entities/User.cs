using System;

namespace PPI.IM.Domain.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Nik { get; set; } = string.Empty;
        public string Role { get; set; } = "USER";
        public int IsActive { get; set; } = 1;
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Division Permissions (1 = Access, 0 = Denied)
        public int LaunchCo { get; set; }
        public int Up { get; set; }
        public int Pole { get; set; }
        public int MscAdm { get; set; }
        public int Iq { get; set; }
        public int UpFillingSpv { get; set; }
        public int UpFillingManager { get; set; }
        public int PackagingPole { get; set; }
        public int QaLab { get; set; }
        public int LihatIm { get; set; }
        public int HistoriPengisian { get; set; }
        public int Settings { get; set; }
        public int InputSpecCode { get; set; }
        public int SpecCodePdf { get; set; }

        // Security & Audit
        public int IsLocked { get; set; }
        public int FailedLoginCount { get; set; }
        public DateTime? LockedUntil { get; set; }
        public DateTime? LastFailedLogin { get; set; }
        public DateTime? LastLogin { get; set; }
        public int ForcePasswordChange { get; set; }
        public string? LastModifiedBy { get; set; }
        public DateTime? LastModifiedDate { get; set; }
        public string? Email { get; set; }
        public string? CreatedBy { get; set; }
        
        public string DepartmentText
        {
            get
            {
                if (Role == "ADMIN") return "All Access";
                var list = new System.Collections.Generic.List<string>();
                if (LaunchCo == 1) list.Add("LAUNCH CO");
                if (Up == 1) list.Add("UP");
                if (Pole == 1) list.Add("POLE");
                if (MscAdm == 1) list.Add("MSC ADM");
                if (Iq == 1) list.Add("IQ");
                if (UpFillingSpv == 1) list.Add("UP FILLING SPV");
                if (UpFillingManager == 1) list.Add("UP FILLING MANAGER");
                if (PackagingPole == 1) list.Add("PACKAGING & POLE");
                if (QaLab == 1) list.Add("HEAD LAB");
                if (LihatIm == 1) list.Add("LIHAT IM");
                if (HistoriPengisian == 1) list.Add("HISTORI PENGISIAN");
                if (Settings == 1) list.Add("SETTINGS");
                if (InputSpecCode == 1) list.Add("INPUT SPEC CODE");
                if (SpecCodePdf == 1) list.Add("SPEC CODE & PDF");
                
                if (list.Count == 0) return "USER";
                return string.Join(", ", list);
            }
        }
    }
}
