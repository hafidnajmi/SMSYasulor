using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;
using UPMS.Web.Models.ViewModels;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class MasterMachineController : Controller
    {
        private readonly UpmsDbContext _db;

        private static readonly List<string> CleanLines = new()
        {
            "B4", "B5", "B10", "B11", "B15", "B16", "B17", "B18", "B19",
            "B20", "B21", "B22", "B24",
            "J3", "J4", "J5",
            "T1", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T12",
            "S6", "S7", "S8", "S9", "S10", "S14", "S15", "S16", "S18", "S19", "S20"
        };

        public MasterMachineController(UpmsDbContext db)
        {
            _db = db;
        }

        public IActionResult Index(string? selectedLine, string? lineSearch, string? search, string statusFilter = "all")
        {
            return RedirectToAction("Index", "LineCompatibility", new { selectedLine = selectedLine, kpiTab = "machines", detailSearch = search });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(MachineMaster machine)
        {
            if (string.IsNullOrWhiteSpace(machine.MachineCode))
            {
                TempData["Error"] = "Machine Code is required.";
                return RedirectToAction("Index", new { selectedLine = machine.Line });
            }

            string code = machine.MachineCode.Trim().ToUpper();
            bool exists = await _db.MachineMasters.AnyAsync(m => m.MachineCode.ToUpper() == code);
            if (exists)
            {
                TempData["Error"] = $"Machine Code '{code}' already exists.";
                return RedirectToAction("Index", new { selectedLine = machine.Line });
            }

            machine.MachineCode = code;
            machine.MachineName = string.IsNullOrWhiteSpace(machine.MachineName) ? $"Machine {code}" : machine.MachineName.Trim();
            machine.Status = string.IsNullOrWhiteSpace(machine.Status) ? "active" : machine.Status.ToLower();
            machine.CreatedAt = DateTime.Now;

            _db.MachineMasters.Add(machine);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Machine '{code}' created successfully.";
            return RedirectToAction("Index", new { selectedLine = machine.Line });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(MachineMaster machine)
        {
            var existing = await _db.MachineMasters.FindAsync(machine.Id);
            if (existing == null) return NotFound();

            string code = machine.MachineCode.Trim().ToUpper();
            bool exists = await _db.MachineMasters.AnyAsync(m => m.MachineCode.ToUpper() == code && m.Id != machine.Id);
            if (exists)
            {
                TempData["Error"] = $"Machine Code '{code}' already exists.";
                return RedirectToAction("Index", new { selectedLine = existing.Line });
            }

            existing.MachineCode = code;
            existing.MachineName = string.IsNullOrWhiteSpace(machine.MachineName) ? existing.MachineName : machine.MachineName.Trim();
            existing.Line = machine.Line;
            existing.Area = machine.Area;
            existing.MachineType = machine.MachineType;
            existing.Manufacturer = machine.Manufacturer;
            existing.Model = machine.Model;
            existing.Status = string.IsNullOrWhiteSpace(machine.Status) ? "active" : machine.Status.ToLower();
            existing.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            TempData["Success"] = $"Machine '{code}' updated successfully.";
            return RedirectToAction("Index", new { selectedLine = existing.Line });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ToggleStatus(int id, string? selectedLine)
        {
            var machine = await _db.MachineMasters.FindAsync(id);
            if (machine == null) return NotFound();

            string current = (machine.Status ?? "active").ToLower();
            machine.Status = current == "active" ? "inactive" : "active";
            machine.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            TempData["Success"] = $"Machine '{machine.MachineCode}' status changed to {machine.Status}.";
            return RedirectToAction("Index", new { selectedLine = selectedLine ?? machine.Line });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id, string? selectedLine)
        {
            var machine = await _db.MachineMasters.FindAsync(id);
            if (machine == null) return NotFound();

            _db.MachineMasters.Remove(machine);
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Machine '{machine.MachineCode}' deleted successfully.";
            return RedirectToAction("Index", new { selectedLine = selectedLine ?? machine.Line });
        }

        private static bool IsLineMatch(string? rawLine, string targetLine)
        {
            if (string.IsNullOrWhiteSpace(rawLine) || string.IsNullOrWhiteSpace(targetLine)) return false;
            var parts = rawLine.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            return parts.Any(p => p.Equals(targetLine, StringComparison.OrdinalIgnoreCase));
        }

        private static readonly HashSet<string> Up1Lines = new(StringComparer.OrdinalIgnoreCase)
        {
            "B10", "B15", "B16", "B5", "GENERAL",
            "J3", "J4", "J5",
            "T1", "T12", "T3", "T4", "T5", "T6", "T7", "T8", "T9",
            "VACANT", "WASHER"
        };

        private static string GetArea(string line)
        {
            if (string.IsNullOrWhiteSpace(line)) return "UP1";
            line = line.Trim();
            if (Up1Lines.Contains(line)) return "UP1";
            return "UP2";
        }
    }
}
