using System.Threading.Tasks;

namespace PPI.IM.Application.Services
{
    public interface IUpLockService
    {
        /// <summary>
        /// Mengecek dan mengunci bagian divisi tertentu untuk dokumen tertentu.
        /// Auto-Expiry = 60 Menit.
        /// </summary>
        Task<(bool CanEdit, string Message)> LockSectionAsync(string documentCode, string division, string username);

        /// <summary>
        /// Melepas kunci bagian divisi saat simpan atau menutup form/tab.
        /// </summary>
        Task<bool> UnlockSectionAsync(string documentCode, string division, string username);

        /// <summary>
        /// Force unlock bagian divisi (Khusus Admin / Supervisor).
        /// </summary>
        Task<bool> ForceUnlockSectionAsync(string documentCode, string division);
    }
}
