using Microsoft.AspNetCore.Mvc;
using PPI.IM.Application.Services;
using System.Threading.Tasks;

namespace PPI.IM.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LockController : ControllerBase
    {
        private readonly IUpLockService _lockService;

        public LockController(IUpLockService lockService)
        {
            _lockService = lockService;
        }

        public class LockRequest
        {
            public string DocumentCode { get; set; } = string.Empty;
            public string Division { get; set; } = string.Empty;
            public string Username { get; set; } = string.Empty;
        }

        [HttpPost("acquire")]
        public async Task<IActionResult> AcquireLock([FromBody] LockRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.DocumentCode) || string.IsNullOrWhiteSpace(req.Division) || string.IsNullOrWhiteSpace(req.Username))
            {
                return BadRequest(new { canEdit = false, message = "Parameter tidak lengkap." });
            }

            var result = await _lockService.LockSectionAsync(req.DocumentCode, req.Division, req.Username);
            return Ok(new { canEdit = result.CanEdit, message = result.Message });
        }

        [HttpPost("release")]
        public async Task<IActionResult> ReleaseLock([FromBody] LockRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.DocumentCode) || string.IsNullOrWhiteSpace(req.Division) || string.IsNullOrWhiteSpace(req.Username))
            {
                return BadRequest(new { success = false, message = "Parameter tidak lengkap." });
            }

            var success = await _lockService.UnlockSectionAsync(req.DocumentCode, req.Division, req.Username);
            return Ok(new { success });
        }

        [HttpPost("force-unlock")]
        public async Task<IActionResult> ForceUnlock([FromBody] LockRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.DocumentCode) || string.IsNullOrWhiteSpace(req.Division))
            {
                return BadRequest(new { success = false, message = "Parameter tidak lengkap." });
            }

            var success = await _lockService.ForceUnlockSectionAsync(req.DocumentCode, req.Division);
            return Ok(new { success });
        }
    }
}
