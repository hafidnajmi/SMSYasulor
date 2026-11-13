using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Dapper;
using Serilog;

namespace PPI.IM.Infrastructure.Data
{
    public class DbInitializer
    {
        private readonly DbConnectionFactory _dbFactory;

        public DbInitializer(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var sb = new StringBuilder();
            foreach (var b in bytes)
                sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        public async Task EnsureDatabaseExistsAsync()
        {
            try
            {
                using var masterConn = _dbFactory.CreateMasterConnection();
                await masterConn.OpenAsync();
                var exists = await masterConn.ExecuteScalarAsync<int>(
                    "SELECT 1 FROM pg_database WHERE datname = @DbName;",
                    new { DbName = _dbFactory.DatabaseName });
                if (exists != 1)
                {
                    await masterConn.ExecuteAsync($"CREATE DATABASE \"{_dbFactory.DatabaseName}\";");
                    Log.Information("[DB] Database '{DbName}' dipastikan siap.", _dbFactory.DatabaseName);
                }
            }
            catch (Exception ex)
            {
                Log.Debug("[DB] EnsureDatabaseExistsAsync notice: {Msg}", ex.Message);
            }
        }

        public async Task InitializeAsync()
        {
            try
            {
                await EnsureDatabaseExistsAsync();
            }
            catch { }

            Log.Information("[DB] Checking and verifying PostgreSQL database schema...");

            try
            {
                using var conn = await _dbFactory.OpenConnectionWithRetryAsync();

                // Ensure GETDATE() compatibility function
                await conn.ExecuteAsync(@"
                CREATE OR REPLACE FUNCTION GETDATE() RETURNS timestamp AS $$
                BEGIN
                    RETURN CURRENT_TIMESTAMP;
                END;
                $$ LANGUAGE plpgsql;");

                // Ensure default admin exists
                await conn.ExecuteAsync(@"
                INSERT INTO ppi_users (
                    username, password, full_name, nik, role, is_active,
                    launch_co, up, pole, msc_adm, iq, up_filling_spv, up_filling_manager,
                    packaging_pole, qa_lab, lihat_im, histori_pengisian, settings, input_spec_code, spec_code_pdf
                ) VALUES (
                    'admin', 
                    '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 
                    'System Administrator', 
                    '000000', 
                    'ADMIN', 
                    1,
                    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
                )
                ON CONFLICT (username) DO NOTHING;");

                Log.Information("[DB] PostgreSQL database schema & default admin verified.");
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "[DB] Database initialization warning: {Msg}", ex.Message);
            }
        }
    }
}
