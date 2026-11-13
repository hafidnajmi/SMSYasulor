using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using PPI.IM.Domain.Entities;
using PPI.IM.Infrastructure.Repositories;
using PPI.IM.Infrastructure.Data;
using PPI.IM.Application.Services;

namespace PPI.IM.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserRepository _userRepo;

        public UsersController(UserRepository userRepo)
        {
            _userRepo = userRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userRepo.GetAllUsersAsync();
            foreach (var u in users)
            {
                // Standar Keamanan Internasional (ISO 27001 / OWASP): Password tidak boleh dibocorkan ke client
                u.Password = "••••••••";
            }
            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] User user)
        {
            if (string.IsNullOrWhiteSpace(user.Password))
            {
                return BadRequest(new { message = "Password wajib diisi sesuai standar keamanan internasional (min. 8 karakter, kombinasi huruf besar, kecil, angka, dan simbol)." });
            }

            var (isValid, errorMsg) = PasswordPolicyValidator.Validate(user.Password, user.Username);
            if (!isValid)
            {
                return BadRequest(new { message = errorMsg });
            }

            // Enkripsi Password Standar Internasional (SHA-256)
            user.Password = DbInitializer.HashPassword(user.Password);
            var newId = await _userRepo.InsertUserAsync(user);
            user.Id = newId;
            user.Password = "••••••••";
            return Ok(user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] User user)
        {
            user.Id = id;
            var success = await _userRepo.UpdateUserAsync(user);
            if (!success) return NotFound();
            user.Password = "••••••••";
            return Ok(user);
        }

        [HttpPut("{id}/password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] PasswordRequest req)
        {
            var user = await _userRepo.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User tidak ditemukan." });
            }

            var (isValid, errorMsg) = PasswordPolicyValidator.Validate(req.NewPassword, user.Username);
            if (!isValid)
            {
                return BadRequest(new { message = errorMsg });
            }

            // Enkripsi Password Standar Internasional (SHA-256)
            string hashedPassword = DbInitializer.HashPassword(req.NewPassword);
            var success = await _userRepo.UpdatePasswordAsync(id, hashedPassword, req.ModifiedBy ?? "admin");
            if (!success) return NotFound();
            return Ok(new { success = true, message = "Password berhasil diperbarui dengan standar keamanan internasional." });
        }
        
        public class PasswordRequest 
        {
            public string NewPassword { get; set; } = "";
            public string? ModifiedBy { get; set; } = "";
        }
    }
}
