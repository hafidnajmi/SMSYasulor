using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using PPI.IM.Domain.Entities;
using PPI.IM.Infrastructure.Data;

namespace PPI.IM.Infrastructure.Repositories
{
    public class LockRepository
    {
        private readonly DbConnectionFactory _dbFactory;

        public LockRepository(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<bool> AcquireLockAsync(string imCode, string division, string username)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            // Check if already locked by someone else
            var currentLock = await conn.QuerySingleOrDefaultAsync<ImLock>(
                "SELECT * FROM ppi_im_locks WHERE im_code = @ImCode AND division = @Division;",
                new { ImCode = imCode, Division = division }
            );

            if (currentLock != null)
            {
                if (currentLock.LockedBy == username)
                {
                    // Refresh lock timestamp
                    await conn.ExecuteAsync(
                        "UPDATE ppi_im_locks SET locked_at = GETDATE() WHERE im_code = @ImCode AND division = @Division;",
                        new { ImCode = imCode, Division = division });
                    return true;
                }
                return false; // Locked by another user
            }

            // Insert new lock
            string insertSql = @"
            INSERT INTO ppi_im_locks (im_code, division, locked_by, locked_at)
            VALUES (@ImCode, @Division, @Username, GETDATE());";

            try
            {
                await conn.ExecuteAsync(insertSql, new { ImCode = imCode, Division = division, Username = username });
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task ReleaseLockAsync(string imCode, string division, string username)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            await conn.ExecuteAsync(
                "DELETE FROM ppi_im_locks WHERE im_code = @ImCode AND division = @Division AND (locked_by = @Username OR @Username = 'admin');",
                new { ImCode = imCode, Division = division, Username = username }
            );
        }
    }

    public class AssigneeRepository
    {
        private readonly DbConnectionFactory _dbFactory;

        public AssigneeRepository(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<IEnumerable<Assignee>> GetAssigneesByDivisionAsync(string division)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QueryAsync<Assignee>(
                "SELECT * FROM ppi_assignees WHERE division = @Division ORDER BY name ASC;",
                new { Division = division }
            );
        }

        public async Task<int> InsertAssigneeAsync(Assignee assignee)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            string sql = @"
            INSERT INTO ppi_assignees (name, division, signature_image, password)
            VALUES (@Name, @Division, @SignatureImage, @Password)
            RETURNING id;";

            return await conn.ExecuteScalarAsync<int>(sql, assignee);
        }
    }
}
