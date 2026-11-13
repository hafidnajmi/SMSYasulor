using System;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using Npgsql;
using PPI.IM.Infrastructure.Config;
using Serilog;

namespace PPI.IM.Infrastructure.Data
{
    public class DbConnectionFactory
    {
        private readonly DatabaseConfig _config;

        static DbConnectionFactory()
        {
            Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
        }

        public DbConnectionFactory(DatabaseConfig config)
        {
            _config = config;
            NpgsqlConnection.ClearAllPools();
        }

        public string DatabaseName => _config.Database;
        public string ServerName => _config.Server;

        public string GetConnectionString(string? overrideDatabase = null, string? overrideServer = null)
        {
            if (!string.IsNullOrWhiteSpace(_config.ConnectionString))
            {
                var connBuilder = new NpgsqlConnectionStringBuilder(_config.ConnectionString);
                if (overrideDatabase != null) connBuilder.Database = overrideDatabase;
                if (overrideServer != null) connBuilder.Host = overrideServer;
                return connBuilder.ConnectionString;
            }

            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = overrideServer ?? _config.Server,
                Port = _config.Port > 0 ? _config.Port : 5432,
                Database = overrideDatabase ?? _config.Database,
                Username = !string.IsNullOrWhiteSpace(_config.Username) ? _config.Username : "postgres",
                Password = _config.Password,
                Timeout = _config.Timeout,
                Pooling = true,
                MinPoolSize = 1,
                MaxPoolSize = 50
            };

            if (Enum.TryParse<SslMode>(_config.SslMode, true, out var ssl))
            {
                builder.SslMode = ssl;
            }

            return builder.ConnectionString;
        }

        public NpgsqlConnection CreateConnection()
        {
            return new NpgsqlConnection(GetConnectionString());
        }

        public NpgsqlConnection CreateMasterConnection(string? overrideServer = null)
        {
            return new NpgsqlConnection(GetConnectionString("postgres", overrideServer));
        }

        public async Task<NpgsqlConnection> OpenConnectionWithRetryAsync()
        {
            var connStr = GetConnectionString();
            int attempts = Math.Max(1, _config.RetryAttempts);
            int delaySeconds = Math.Max(1, _config.RetryDelay);

            for (int i = 1; i <= attempts; i++)
            {
                try
                {
                    var conn = new NpgsqlConnection(connStr);
                    await conn.OpenAsync();
                    return conn;
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, "[DB] PostgreSQL connection attempt {Attempt}/{MaxAttempts} failed.", i, attempts);

                    if (i == attempts)
                        throw new InvalidOperationException($"Gagal terhubung ke PostgreSQL setelah {attempts} percobaan: {ex.Message}", ex);

                    await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
                }
            }

            throw new InvalidOperationException("Gagal membuka koneksi database.");
        }

        public NpgsqlConnection OpenConnectionWithRetry()
        {
            var connStr = GetConnectionString();
            int attempts = Math.Max(1, _config.RetryAttempts);
            int delaySeconds = Math.Max(1, _config.RetryDelay);

            for (int i = 1; i <= attempts; i++)
            {
                try
                {
                    var conn = new NpgsqlConnection(connStr);
                    conn.Open();
                    return conn;
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, "[DB] PostgreSQL connection attempt {Attempt}/{MaxAttempts} failed.", i, attempts);
                    if (i == attempts)
                        throw new InvalidOperationException($"Gagal terhubung ke PostgreSQL setelah {attempts} percobaan: {ex.Message}", ex);

                    Thread.Sleep(TimeSpan.FromSeconds(delaySeconds));
                }
            }

            throw new InvalidOperationException("Gagal membuka koneksi database.");
        }
    }
}
