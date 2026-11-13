namespace PPI.IM.Infrastructure.Config
{
    public class DatabaseConfig
    {
        public string? ConnectionString { get; set; }
        public string Server { get; set; } = "localhost";
        public int Port { get; set; } = 5432;
        public string Database { get; set; } = "IM-Digital";
        public bool TrustedConnection { get; set; } = false;
        public string Username { get; set; } = "postgres";
        public string Password { get; set; } = "Cikarang2026";
        public int Timeout { get; set; } = 30;
        public int RetryAttempts { get; set; } = 3;
        public int RetryDelay { get; set; } = 2;
        public string SslMode { get; set; } = "Prefer";
        public bool TrustServerCertificate { get; set; } = true;
    }

    public class AppSettings
    {
        public string Name { get; set; } = "PPI-IM Digital System";
        public string PdfSavePath { get; set; } = @"C:\Backup";
        public string RemoteVersionUrl { get; set; } = @"\\SERVER-KANTOR\SharedFolder\AppUpdates\version.json";
        public int AutoRefreshInterval { get; set; } = 5;
        public string LogLevel { get; set; } = "Information";
        public string LogFile { get; set; } = "logs/app.log";
    }

    public class RootConfig
    {
        public DatabaseConfig Database { get; set; } = new();
        public AppSettings App { get; set; } = new();
    }
}
