using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class DashboardController : Controller
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        public async Task<IActionResult> Index(int? year = null, int? month = null)
        {
            ViewBag.SelectedYear = year;
            ViewBag.SelectedMonth = month;

            var kpi = await _dashboardService.GetKpiSummaryAsync(year, month);
            var stockDist = await _dashboardService.GetStockStatusDistributionAsync();
            var costPerLine = await _dashboardService.GetCostPerLineAsync(year, month);
            var topLowStock = await _dashboardService.GetTopLowStockAsync(5);
            var recentLogs = await _dashboardService.GetRecentActivitiesAsync(5);
            var costInsights = await _dashboardService.GetCostInsightsAsync(year, month);

            ViewBag.Kpi = kpi;
            ViewBag.StockDist = stockDist;
            ViewBag.CostPerLine = costPerLine;
            ViewBag.TopLowStock = topLowStock;
            ViewBag.RecentLogs = recentLogs;
            ViewBag.CostInsights = costInsights;

            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetCostPerLineChartData(int? year, int? month)
        {
            var data = await _dashboardService.GetCostPerLineAsync(year, month);
            return Json(data);
        }
    }
}
