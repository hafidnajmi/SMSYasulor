using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public class AuthService : IAuthService
    {
        private readonly UpmsDbContext _db;

        public AuthService(UpmsDbContext db)
        {
            _db = db;
        }

        public async Task<User?> ValidateUserAsync(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return null;

            string cleanUsername = username.Trim();
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == cleanUsername.ToLower());
            if (user == null || !user.IsActive)
                return null;

            bool isPasswordValid = false;

            // 1. Direct plain text match (for legacy migrated users or plain text passwords)
            if (user.PasswordHash == password)
            {
                isPasswordValid = true;
            }
            else
            {
                // 2. BCrypt hash verification
                try
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
                }
                catch
                {
                    isPasswordValid = false;
                }
            }

            if (!isPasswordValid)
                return null;

            return user;
        }

        public ClaimsPrincipal CreateClaimsPrincipal(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.GivenName, user.FullName ?? user.Username),
                new Claim(ClaimTypes.Role, user.Role ?? "user"),
                new Claim("CanMasterData", user.CanMasterData.ToString()),
                new Claim("CanAdminMgmt", user.CanAdminMgmt.ToString()),
                new Claim("CanBidding", user.CanBidding.ToString()),
                new Claim("CanSettings", user.CanSettings.ToString()),
                new Claim("CanBarangMasuk", user.CanBarangMasuk.ToString()),
                new Claim("CanRiwayat", user.CanRiwayat.ToString()),
                new Claim("CanElectricalParts", user.CanElectricalParts.ToString()),
                new Claim("CanSupplierData", user.CanSupplierData.ToString()),
                new Claim("CanEmailSettings", user.CanEmailSettings.ToString()),
                new Claim("CanBarangKeluar", user.CanBarangKeluar.ToString()),
                new Claim("CanLineMapping", user.CanLineMapping.ToString()),
                new Claim("CanMasterMachine", user.CanMasterMachine.ToString()),
                new Claim("CanSparepartMachine", user.CanSparepartMachine.ToString()),
                new Claim("CanCostIntelligence", user.CanCostIntelligence.ToString()),
                new Claim("RequireApprovalKeluar", user.RequireApprovalKeluar.ToString())
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            return new ClaimsPrincipal(identity);
        }

        public async Task UpdateLastLoginAsync(int userId)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user != null)
            {
                user.LastLogin = DateTime.Now;
                await _db.SaveChangesAsync();
            }
        }
    }
}
