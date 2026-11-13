using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using PPI.IM.Domain.Entities;
using PPI.IM.Infrastructure.Data;

namespace PPI.IM.Infrastructure.Repositories
{
    public class UserRepository
    {
        private readonly DbConnectionFactory _dbFactory;

        public UserRepository(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT * FROM ppi_users WHERE username = @Username AND is_active = 1;",
                new { Username = username }
            );
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT * FROM ppi_users WHERE id = @Id;",
                new { Id = id }
            );
        }

        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QueryAsync<User>("SELECT * FROM ppi_users ORDER BY id ASC;");
        }

        public async Task<int> InsertUserAsync(User user)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            string sql = @"
            INSERT INTO ppi_users (
                username, password, full_name, nik, role, is_active,
                launch_co, up, pole, msc_adm, iq, up_filling_spv, up_filling_manager,
                packaging_pole, qa_lab, lihat_im, histori_pengisian, settings, input_spec_code, spec_code_pdf,
                email, created_by, created_at
            ) VALUES (
                @Username, @Password, @FullName, @Nik, @Role, @IsActive,
                @LaunchCo, @Up, @Pole, @MscAdm, @Iq, @UpFillingSpv, @UpFillingManager,
                @PackagingPole, @QaLab, @LihatIm, @HistoriPengisian, @Settings, @InputSpecCode, @SpecCodePdf,
                @Email, @CreatedBy, GETDATE()
            ) RETURNING id;";

            return await conn.ExecuteScalarAsync<int>(sql, user);
        }

        public async Task<bool> UpdateUserAsync(User user)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            string sql = @"
            UPDATE ppi_users SET
                username = @Username,
                full_name = @FullName,
                nik = @Nik,
                role = @Role,
                is_active = @IsActive,
                launch_co = @LaunchCo,
                up = @Up,
                pole = @Pole,
                msc_adm = @MscAdm,
                iq = @Iq,
                up_filling_spv = @UpFillingSpv,
                up_filling_manager = @UpFillingManager,
                packaging_pole = @PackagingPole,
                qa_lab = @QaLab,
                lihat_im = @LihatIm,
                histori_pengisian = @HistoriPengisian,
                settings = @Settings,
                input_spec_code = @InputSpecCode,
                spec_code_pdf = @SpecCodePdf,
                email = @Email,
                last_modified_by = @LastModifiedBy,
                last_modified_date = GETDATE()
            WHERE id = @Id;";

            int rows = await conn.ExecuteAsync(sql, user);
            return rows > 0;
        }

        public async Task<bool> UpdatePasswordAsync(int userId, string newPasswordHash, string modifiedBy)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            string sql = @"
            UPDATE ppi_users SET
                password = @Password,
                force_password_change = 0,
                last_modified_by = @ModifiedBy,
                last_modified_date = GETDATE()
            WHERE id = @Id;";

            int rows = await conn.ExecuteAsync(sql, new { Id = userId, Password = newPasswordHash, ModifiedBy = modifiedBy });
            return rows > 0;
        }

        public async Task RecordLoginSuccessAsync(int userId)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            await conn.ExecuteAsync(@"
                UPDATE ppi_users SET 
                    last_login = GETDATE(),
                    failed_login_count = 0,
                    is_locked = 0,
                    locked_until = NULL 
                WHERE id = @Id;", new { Id = userId });
        }

        public async Task RecordLoginFailureAsync(string username, int maxAttempts = 5, int lockDurationMinutes = 5)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            var user = await conn.QuerySingleOrDefaultAsync<User>(
                "SELECT * FROM ppi_users WHERE username = @Username;", new { Username = username });

            if (user == null) return;

            int newCount = user.FailedLoginCount + 1;
            bool shouldLock = newCount >= maxAttempts;
            DateTime? lockedUntil = shouldLock ? DateTime.Now.AddMinutes(lockDurationMinutes) : null;

            await conn.ExecuteAsync(@"
                UPDATE ppi_users SET
                    failed_login_count = @Count,
                    last_failed_login = GETDATE(),
                    is_locked = @IsLocked,
                    locked_until = @LockedUntil
                WHERE id = @Id;",
                new { Count = newCount, IsLocked = shouldLock ? 1 : 0, LockedUntil = lockedUntil, Id = user.Id });
        }
    }
}
