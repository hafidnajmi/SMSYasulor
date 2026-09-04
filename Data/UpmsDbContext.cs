using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Data
{
    public class UpmsDbContext : DbContext
    {
        public UpmsDbContext(DbContextOptions<UpmsDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<MasterData> MasterDatas => Set<MasterData>();
        public DbSet<BarangMasuk> BarangMasuks => Set<BarangMasuk>();
        public DbSet<BarangKeluar> BarangKeluars => Set<BarangKeluar>();
        public DbSet<MachineMaster> MachineMasters => Set<MachineMaster>();
        public DbSet<SparepartLineMapping> SparepartLineMappings => Set<SparepartLineMapping>();
        public DbSet<SparepartPriceHistory> SparepartPriceHistories => Set<SparepartPriceHistory>();
        public DbSet<Supplier> Suppliers => Set<Supplier>();
        public DbSet<SupplierOffer> SupplierOffers => Set<SupplierOffer>();
        public DbSet<BiddingHistory> BiddingHistories => Set<BiddingHistory>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<AppSetting> AppSettings => Set<AppSetting>();
        public DbSet<EmailSupplierLog> EmailSupplierLogs => Set<EmailSupplierLog>();
        public DbSet<PmSchedule> PmSchedules => Set<PmSchedule>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<MachineMaster>()
                .HasIndex(m => m.MachineCode)
                .IsUnique();
        }

        public async Task<string> GenerateNextUpfIdAsync(string sequenceName)
        {
            var allowedSequences = new System.Collections.Generic.HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "seq_upf_master",
                "seq_upf_bidding",
                "seq_upf_bmasuk",
                "seq_upf_bkeluar",
                "seq_upf_sparepart_asset",
                "seq_upf_electrical_parts"
            };

            if (!allowedSequences.Contains(sequenceName))
            {
                throw new ArgumentException($"Invalid or unapproved sequence name: {sequenceName}");
            }

            var connection = Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var createSeqCommand = connection.CreateCommand();
            createSeqCommand.CommandText = $"CREATE SEQUENCE IF NOT EXISTS {sequenceName.ToLower()} START WITH 10000 INCREMENT BY 1;";
            await createSeqCommand.ExecuteNonQueryAsync();

            using var command = connection.CreateCommand();
            command.CommandText = $"SELECT nextval('{sequenceName.ToLower()}')";
            var scalarResult = await command.ExecuteScalarAsync();

            if (scalarResult != null && long.TryParse(scalarResult.ToString(), out long num))
            {
                return $"UPF-{num}";
            }

            return $"UPF-{Guid.NewGuid().ToString().Substring(0, 8)}";
        }
    }
}
