using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PPI.IM.Domain.Entities;
using PPI.IM.Domain.Models;
using PPI.IM.Infrastructure.Data;
using PPI.IM.Infrastructure.Repositories;

namespace PPI.IM.Application.Services
{
    public class AuthService
    {
        private readonly UserRepository _userRepo;

        public AuthService(UserRepository userRepo)
        {
            _userRepo = userRepo;
        }

        public async Task<(bool Success, string Message, UserSession? Session)> LoginAsync(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return (false, "Username dan password wajib diisi.", null);

            var user = await _userRepo.GetByUsernameAsync(username.Trim());
            if (user == null)
            {
                return (false, "Username atau password salah.", null);
            }

            if (user.IsLocked == 1 && user.LockedUntil.HasValue && user.LockedUntil.Value > DateTime.Now)
            {
                var remaining = (user.LockedUntil.Value - DateTime.Now).Minutes + 1;
                return (false, $"Akun terkunci karena percobaan gagal. Coba lagi dalam {remaining} menit.", null);
            }

            string inputHash = DbInitializer.HashPassword(password);
            bool isHashMatch = (user.Password == inputHash);
            bool isPlainMatch = (user.Password == password);

            if (!isHashMatch && !isPlainMatch)
            {
                await _userRepo.RecordLoginFailureAsync(username);
                return (false, "Username atau password salah.", null);
            }

            // Seamless migration: auto-upgrade legacy plain text passwords to secure SHA-256 hash
            if (isPlainMatch && !isHashMatch)
            {
                try
                {
                    await _userRepo.UpdatePasswordAsync(user.Id, inputHash, "auto-security-migration");
                }
                catch { }
            }

            await _userRepo.RecordLoginSuccessAsync(user.Id);

            var allowedDivisions = new List<string>();
            if (user.LaunchCo == 1) allowedDivisions.Add("LAUNCH CO");
            if (user.Up == 1) allowedDivisions.Add("UP");
            if (user.Pole == 1) allowedDivisions.Add("POLE");
            if (user.MscAdm == 1) allowedDivisions.Add("MSC ADM");
            if (user.Iq == 1) allowedDivisions.Add("IQ");
            if (user.UpFillingSpv == 1) allowedDivisions.Add("UP FILLING SPV");
            if (user.UpFillingManager == 1) allowedDivisions.Add("UP FILLING MANAGER");
            if (user.PackagingPole == 1) allowedDivisions.Add("PACKAGING & POLE");
            if (user.QaLab == 1) allowedDivisions.Add("HEAD LAB");
            if (user.LihatIm == 1) allowedDivisions.Add("LIHAT IM");
            if (user.HistoriPengisian == 1) allowedDivisions.Add("HISTORI PENGISIAN");
            if (user.Settings == 1) allowedDivisions.Add("SETTINGS");
            if (user.InputSpecCode == 1) allowedDivisions.Add("INPUT SPEC CODE");
            if (user.SpecCodePdf == 1) allowedDivisions.Add("SPEC CODE & PDF");

            var session = new UserSession
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                AllowedDivisions = allowedDivisions
            };

            return (true, "Login berhasil.", session);
        }
    }
}
