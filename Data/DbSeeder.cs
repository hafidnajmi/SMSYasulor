using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Data
{
    public static class DbSeeder
    {
        public static async Task EnsureTablesCreatedAsync(UpmsDbContext db)
        {
            try
            {
                string sql = @"
CREATE TABLE IF NOT EXISTS ""Bidding_History"" (
    id SERIAL PRIMARY KEY,
    master_data_id VARCHAR(50) NOT NULL,
    bidding_year INT DEFAULT 0,
    bidding_stage VARCHAR(50),
    supplier_name VARCHAR(200),
    price DOUBLE PRECISION DEFAULT 0,
    status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ""Supplier"" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    email VARCHAR(200),
    phone VARCHAR(50),
    pic VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS ""Supplier_Offer"" (
    id SERIAL PRIMARY KEY,
    master_data_id VARCHAR(50) NOT NULL,
    bin VARCHAR(50),
    supplier_name VARCHAR(200),
    supplier_id INT,
    price NUMERIC(18,2) DEFAULT 0,
    is_selected BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ""SPAREPART_PRICE_HISTORY"" (
    id SERIAL PRIMARY KEY,
    master_data_id VARCHAR(50) NOT NULL,
    old_price NUMERIC(18,2) DEFAULT 0,
    new_price NUMERIC(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    reason VARCHAR(200),
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ""Audit_Log"" (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ""App_Settings"" (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT
);

CREATE TABLE IF NOT EXISTS ""Email_Supplier_Log"" (
    id SERIAL PRIMARY KEY,
    master_data_id VARCHAR(50) NOT NULL,
    bin VARCHAR(50),
    supplier_id INT,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ""Machine_Master"" (
    id SERIAL PRIMARY KEY,
    machine_code VARCHAR(100) NOT NULL,
    machine_name VARCHAR(200) NOT NULL,
    line VARCHAR(100),
    area VARCHAR(100),
    machine_type VARCHAR(100),
    manufacturer VARCHAR(200),
    model VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ""sparepart_line_mapping"" (
    id SERIAL PRIMARY KEY,
    sparepart_id VARCHAR(50) NOT NULL,
    line_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_active INT DEFAULT 1,
    approved INT DEFAULT 1,
    mapping_source VARCHAR(20),
    usage_count INT,
    last_used_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ""pm_schedule"" (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    machine_id INT,
    machine_code VARCHAR(100),
    machine_name VARCHAR(200),
    scheduled_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'P',
    technician VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP,
    updated_by VARCHAR(100)
);
";
                await db.Database.ExecuteSqlRawAsync(sql);

                try
                {
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Supplier_Offer"" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Supplier_Offer"" ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""SPAREPART_PRICE_HISTORY"" ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS part_number VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,2);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS remarks TEXT;");

                    // Auto-sync all unique supplier names across MasterData, SupplierOffer, and BarangMasuk into Supplier master table
                    await db.Database.ExecuteSqlRawAsync(@"
                        INSERT INTO ""Supplier"" (name)
                        SELECT DISTINCT TRIM(brand) FROM ""Master_Data""
                        WHERE brand IS NOT NULL AND TRIM(brand) <> '' AND TRIM(brand) <> '-'
                          AND LOWER(TRIM(brand)) NOT IN (SELECT LOWER(TRIM(name)) FROM ""Supplier"")
                        ON CONFLICT DO NOTHING;

                        INSERT INTO ""Supplier"" (name)
                        SELECT DISTINCT TRIM(supplier_name) FROM ""Supplier_Offer""
                        WHERE supplier_name IS NOT NULL AND TRIM(supplier_name) <> '' AND TRIM(supplier_name) <> '-'
                          AND LOWER(TRIM(supplier_name)) NOT IN (SELECT LOWER(TRIM(name)) FROM ""Supplier"")
                        ON CONFLICT DO NOTHING;

                        INSERT INTO ""Supplier"" (name)
                        SELECT DISTINCT TRIM(supplier) FROM ""Barang_Masuk""
                        WHERE supplier IS NOT NULL AND TRIM(supplier) <> '' AND TRIM(supplier) <> '-'
                          AND LOWER(TRIM(supplier)) NOT IN (SELECT LOWER(TRIM(name)) FROM ""Supplier"")
                        ON CONFLICT DO NOTHING;
                    ");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DbSeeder] Alter table warning: {ex.Message}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] EnsureTablesCreated warning: {ex.Message}");
            }
        }

        public static async Task SeedDefaultAdminAsync(UpmsDbContext db)
        {
            await EnsureTablesCreatedAsync(db);

            try
            {
                var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == "admin");
                if (adminUser == null)
                {
                    // AUTH-001: Never use a known default password.
                // Read from environment variable, or generate a secure random password.
                string initialPassword = Environment.GetEnvironmentVariable("ADMIN_INITIAL_PASSWORD")
                    ?? GenerateSecurePassword();

                Console.WriteLine("[DbSeeder] ============================================");
                Console.WriteLine("[DbSeeder] Admin account created for the first time.");
                Console.WriteLine($"[DbSeeder] Initial password: {initialPassword}");
                Console.WriteLine("[DbSeeder] CHANGE THIS PASSWORD IMMEDIATELY after first login!");
                Console.WriteLine("[DbSeeder] ============================================");

                string hash = BCrypt.Net.BCrypt.HashPassword(initialPassword, workFactor: 12);
                    adminUser = new User
                    {
                        Username = "admin",
                        PasswordHash = hash,
                        FullName = "System Administrator",
                        Role = "admin",
                        IsActive = true,
                        CanMasterData = 1,
                        CanAdminMgmt = 1,
                        CanBidding = 1,
                        CanSettings = 1,
                        CanBarangMasuk = 1,
                        CanRiwayat = 1,
                        CanElectricalParts = 1,
                        CanSupplierData = 1,
                        CanEmailSettings = 1,
                        CanBarangKeluar = 1,
                        CanLineMapping = 1,
                        CanMasterMachine = 1,
                        CanSparepartMachine = 1,
                        CanCostIntelligence = 1,
                        RequireApprovalKeluar = false
                    };
                    db.Users.Add(adminUser);
                    await db.SaveChangesAsync();
                }

                await SeedSuppliersAsync(db);
                await SyncElectricalPartsToMasterDataAsync(db);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] Admin seed warning: {ex.Message}");
            }
        }

        public static async Task SyncElectricalPartsToMasterDataAsync(UpmsDbContext db)
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(@"
                    UPDATE ""Master_Data"" 
                    SET frequency = 'SLOW', category = 'ELECTRICAL'
                    WHERE UPPER(category) IN ('ELECTRICAL', 'ELECTRICAL PARTS', 'ELECTRICAL PART');
                ");

                await db.Database.ExecuteSqlRawAsync(@"
                    DO $$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'electrical_parts') THEN
                            INSERT INTO ""Master_Data"" (id, item, bin, brand, category, frequency, current_stock, current_unit_price, is_deleted)
                            SELECT 
                                part_number, 
                                COALESCE(items, '-'), 
                                place, 
                                brand, 
                                'ELECTRICAL', 
                                'SLOW', 
                                COALESCE(qty, 0)::int, 
                                COALESCE(price_per_unit, 0.0), 
                                false
                            FROM electrical_parts
                            ON CONFLICT (id) DO UPDATE SET
                                frequency = 'SLOW',
                                category = 'ELECTRICAL',
                                bin = EXCLUDED.bin;
                        END IF;
                    END $$;
                ");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] SyncElectricalParts warning: {ex.Message}");
            }
        }

        public static async Task SeedSuppliersAsync(UpmsDbContext db)
        {
            try
            {
                var supplierNames = new[]
                {
                    "ADITANA INTI PERDANA",
                    "ADSA",
                    "AVENTICS",
                    "BOSCH",
                    "BUANA",
                    "DAB",
                    "DAIMN",
                    "FASTO",
                    "FESTO",
                    "FG",
                    "FILLOMATIC GLOBAL",
                    "FIRZA KARYA MANDIRI",
                    "GENERAL",
                    "GLOBAL SAHABAT OTOMASI",
                    "GRANDONE",
                    "INSUDA",
                    "INTIDAYA DINAMIKA SEJATI",
                    "JOTAM",
                    "KEYENCE",
                    "MANDIRI STARPLAST",
                    "MASPACK",
                    "MASTER CIPTA SENTOSA",
                    "MESPACK",
                    "METALISHA",
                    "MINOX",
                    "NORDEN",
                    "OMRON",
                    "PE LABELLERS",
                    "PIAB",
                    "PT. FKM",
                    "REXROTH",
                    "SANITARIA UTTAMA",
                    "SANTECH",
                    "SICK",
                    "SMC",
                    "SSI",
                    "TRIJAYA USAHA MANDIRI",
                    "UNICONTROLS",
                    "USAHA SAUDARA MANDIRI",
                    "USM",
                    "YUTAKA"
                };

                var existingSuppliers = await db.Suppliers.AsNoTracking().ToListAsync();
                var existingNameSet = new HashSet<string>(existingSuppliers.Select(s => s.Name.Trim()), StringComparer.OrdinalIgnoreCase);

                bool added = false;
                foreach (var sName in supplierNames)
                {
                    if (!existingNameSet.Contains(sName.Trim()))
                    {
                        db.Suppliers.Add(new Supplier
                        {
                            Name = sName.Trim()
                        });
                        added = true;
                    }
                }

                if (added)
                {
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] SeedSuppliers warning: {ex.Message}");
            }
        }
        private static string GenerateSecurePassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
            var bytes = new byte[16];
            RandomNumberGenerator.Fill(bytes);
            return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
        }
    }
}
