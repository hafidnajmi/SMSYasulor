using System.Security.Claims;
using System.Threading.Tasks;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public interface IAuthService
    {
        Task<User?> ValidateUserAsync(string username, string password);
        ClaimsPrincipal CreateClaimsPrincipal(User user);
        Task UpdateLastLoginAsync(int userId);
        Task LogFailedLoginAsync(string username, string? ipAddress); // AUTH-011
    }
}
