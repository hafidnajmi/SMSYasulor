using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace UPMS.Web.Controllers
{
    [AllowAnonymous]
    public class ImDigitalController : Controller
    {
        [HttpGet]
        public IActionResult Index(string? dept = "Filling")
        {
            return Redirect("http://localhost:3001");
        }
    }
}

