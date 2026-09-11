using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Helpers
{
    public static class RbacHelper
    {
        public static async Task<User?> GetUserAsync(UpmsDbContext db, string? username)
        {
            if (string.IsNullOrEmpty(username)) return null;
            return await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
        }

        public static bool IsAdmin(User? user, string? username)
        {
            if (user == null && string.IsNullOrEmpty(username)) return false;
            if (string.Equals(username, "admin", StringComparison.OrdinalIgnoreCase)) return true;
            if (user != null && (string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase) || user.Role?.ToLower() == "admin")) return true;
            return false;
        }

        public static async Task<bool> HasPermissionAsync(UpmsDbContext db, string? username, Func<User, int> permissionSelector)
        {
            if (string.IsNullOrEmpty(username)) return false;
            var user = await GetUserAsync(db, username);
            if (IsAdmin(user, username)) return true;
            if (user == null || !user.IsActive) return false;
            return permissionSelector(user) == 1;
        }
    }
}
