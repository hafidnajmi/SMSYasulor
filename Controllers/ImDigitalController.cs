using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace UPMS.Web.Controllers
{
    [AllowAnonymous]
    public class ImDigitalController : Controller
    {
        [HttpGet]
        public IActionResult Index()
        {
            return Redirect("/im-digital/");
        }
    }
}

