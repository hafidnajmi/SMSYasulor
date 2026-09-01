using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class OperatorController : Controller
    {
        private readonly IInventoryService _inventoryService;

        public OperatorController(IInventoryService inventoryService)
        {
            _inventoryService = inventoryService;
        }

        public async Task<IActionResult> Index()
        {
            var history = await _inventoryService.GetBarangKeluarHistoryAsync(null, null, 1, 10);
            return View(history.Items);
        }
    }
}
