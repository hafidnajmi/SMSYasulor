using Microsoft.AspNetCore.Mvc;
using PPI.IM.Application.Services;
using PPI.IM.Domain.Models;

namespace PPI.IM.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        public class LoginRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var (success, message, session) = await _authService.LoginAsync(request.Username, request.Password);

            if (!success)
            {
                return BadRequest(new { Message = message });
            }

            // In a real production app, generate JWT token here.
            // For now, we return the session object as proof of concept.
            return Ok(new
            {
                Message = "Login berhasil",
                User = new
                {
                    Id = session?.Id,
                    Username = session?.Username,
                    FullName = session?.FullName,
                    Role = session?.Role,
                    AllowedDivisions = session?.AllowedDivisions
                }
            });
        }
    }
}
