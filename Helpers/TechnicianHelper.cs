using System.Collections.Generic;
using System.Linq;

namespace UPMS.Web.Helpers
{
    public static class TechnicianHelper
    {
        public static readonly List<string> Technicians = new List<string>
        {
            "Adit", "Agus", "Aji", "Andra", "Aricko", "Bachir", "Bambang", "Bobot",
            "Chandra", "Ferry", "Hafid", "Hussein", "Jayadi", "Madsari", "Marjuki",
            "Priyanto", "Raisa", "Ricky", "Rimba", "Rohmadi", "Slamet", "Sudrajat",
            "Suryanto", "Susilo", "Suyut", "Yully", "Zulfi"
        }.OrderBy(t => t).ToList();
    }
}
