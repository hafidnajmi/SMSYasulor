using System;
using System.Threading.Tasks;
using Dapper;
using PPI.IM.Domain.Entities;
using PPI.IM.Infrastructure.Data;

namespace PPI.IM.Application.Services
{
    public class UpLockService : IUpLockService
    {
        private readonly DbConnectionFactory _dbFactory;
        private const int EXPIRY_MINUTES = 15;

        public UpLockService(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<(bool CanEdit, string Message)> LockSectionAsync(string documentCode, string division, string username)
        {
            if (string.IsNullOrWhiteSpace(documentCode))
                return (false, "Kode dokumen tidak valid.");

            if (string.IsNullOrWhiteSpace(username))
                return (false, "Username tidak valid.");

            if (string.IsNullOrWhiteSpace(division))
                return (false, "Divisi tidak valid.");

            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();

            // 1. Cari data lock eksis untuk DocumentCode dan Division
            var currentLock = await conn.QuerySingleOrDefaultAsync<ImLock>(
                "SELECT im_code AS ImCode, division AS Division, locked_by AS LockedBy, locked_at AS LockedAt " +
                "FROM ppi_im_locks WHERE im_code = @ImCode AND division = @Division;",
                new { ImCode = documentCode, Division = division }
            );

            var now = DateTime.Now;

            if (currentLock != null)
            {
                // Kasus A: User yang sama membuka kembali (Refresh timestamp lock)
                if (string.Equals(currentLock.LockedBy, username, StringComparison.OrdinalIgnoreCase))
                {
                    await conn.ExecuteAsync(
                        "UPDATE ppi_im_locks SET locked_at = GETDATE() WHERE im_code = @ImCode AND division = @Division;",
                        new { ImCode = documentCode, Division = division });

                    return (true, $"Berhasil memperbarui kunci bagian {division}.");
                }

                // Kasus B: Cek apakah lock sudah Expired (> 60 menit)
                double minutesPassed = (now - currentLock.LockedAt).TotalMinutes;
                if (minutesPassed >= EXPIRY_MINUTES)
                {
                    // Lock sudah expired, ambil alih lock untuk user baru
                    await conn.ExecuteAsync(
                        "UPDATE ppi_im_locks SET locked_by = @Username, locked_at = GETDATE() WHERE im_code = @ImCode AND division = @Division;",
                        new { ImCode = documentCode, Division = division, Username = username });

                    return (true, $"Kunci lama telah kadaluarsa (> 60 menit). Berhasil mengunci bagian {division}.");
                }

                // Kasus C: Sedang di-lock user lain dan belum expired (< 60 menit)
                string lockedUser = !string.IsNullOrWhiteSpace(currentLock.LockedBy) ? currentLock.LockedBy : "User lain";
                return (false, $"Bagian {division} sedang diedit oleh {lockedUser}");
            }

            // 2. Jika belum ada lock sama sekali, masukkan lock baru
            string insertSql = @"
            INSERT INTO ppi_im_locks (im_code, division, locked_by, locked_at)
            VALUES (@ImCode, @Division, @Username, GETDATE());";

            try
            {
                await conn.ExecuteAsync(insertSql, new { ImCode = documentCode, Division = division, Username = username });
                return (true, $"Berhasil mengunci bagian {division}.");
            }
            catch
            {
                // Concurrency catch jika 2 request mengunci milidetik bersamaan
                var raceLock = await conn.QuerySingleOrDefaultAsync<ImLock>(
                    "SELECT im_code AS ImCode, division AS Division, locked_by AS LockedBy, locked_at AS LockedAt " +
                    "FROM ppi_im_locks WHERE im_code = @ImCode AND division = @Division;",
                    new { ImCode = documentCode, Division = division }
                );

                string lockedUser = raceLock?.LockedBy ?? "User lain";
                return (false, $"Bagian {division} sedang diedit oleh {lockedUser}");
            }
        }

        public async Task<bool> UnlockSectionAsync(string documentCode, string division, string username)
        {
            if (string.IsNullOrWhiteSpace(documentCode)) return false;

            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            int rowsAffected = await conn.ExecuteAsync(
                "DELETE FROM ppi_im_locks WHERE im_code = @ImCode AND division = @Division AND (locked_by = @Username OR @Username = 'admin');",
                new { ImCode = documentCode, Division = division, Username = username }
            );

            return rowsAffected > 0;
        }

        public async Task<bool> ForceUnlockSectionAsync(string documentCode, string division)
        {
            if (string.IsNullOrWhiteSpace(documentCode)) return false;

            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            int rowsAffected = await conn.ExecuteAsync(
                "DELETE FROM ppi_im_locks WHERE im_code = @ImCode AND division = @Division;",
                new { ImCode = documentCode, Division = division }
            );

            return rowsAffected > 0;
        }
    }
}
