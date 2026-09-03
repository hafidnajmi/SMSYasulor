using System.Collections.Generic;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Models.ViewModels
{
    public class MachineLineDto
    {
        public string LineCode { get; set; } = string.Empty;
        public string Area { get; set; } = "UP1";
        public int TotalMachines { get; set; }
        public int ActiveMachines { get; set; }
    }

    public class MasterMachineViewModel
    {
        public int TotalLines { get; set; }
        public int TotalMachines { get; set; }
        public int ActiveMachines { get; set; }
        public int UnmappedMachines { get; set; }

        public List<MachineLineDto> Lines { get; set; } = new();
        public string? SelectedLine { get; set; }
        public string LineSearch { get; set; } = "";

        public List<MachineMaster> Machines { get; set; } = new();
        public string Search { get; set; } = "";
        public string StatusFilter { get; set; } = "all";
    }
}
