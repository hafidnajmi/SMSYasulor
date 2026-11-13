using System;
using System.Text.RegularExpressions;
using System.Linq;

namespace PPI.IM.Application.Services
{
    public static class PasswordPolicyValidator
    {
        private static readonly string[] CommonBlacklist = new[]
        {
            "123456", "12345678", "123456789", "password", "password123", "admin123", "administrator", "qwerty123", "p@ssword", "p@ssword1"
        };

        public static (bool IsValid, string ErrorMessage) Validate(string password, string? username = null)
        {
            if (string.IsNullOrWhiteSpace(password))
                return (false, "Password wajib diisi.");

            if (password.Length < 8)
                return (false, "Password minimal 8 karakter sesuai standar keamanan internasional (NIST / OWASP).");

            if (password.Length > 64)
                return (false, "Password maksimal 64 karakter.");

            if (!Regex.IsMatch(password, @"[A-Z]"))
                return (false, "Password harus mengandung minimal 1 huruf besar (A-Z).");

            if (!Regex.IsMatch(password, @"[a-z]"))
                return (false, "Password harus mengandung minimal 1 huruf kecil (a-z).");

            if (!Regex.IsMatch(password, @"[0-9]"))
                return (false, "Password harus mengandung minimal 1 angka (0-9).");

            if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]"))
                return (false, "Password harus mengandung minimal 1 simbol / karakter khusus (!@#$%^&*...).");

            if (!string.IsNullOrWhiteSpace(username) && password.IndexOf(username.Trim(), StringComparison.OrdinalIgnoreCase) >= 0)
                return (false, "Password tidak boleh mengandung nama username.");

            if (CommonBlacklist.Contains(password.Trim().ToLowerInvariant()))
                return (false, "Password terlalu umum dan mudah ditebak. Harap gunakan kombinasi yang lebih aman.");

            return (true, string.Empty);
        }
    }
}

