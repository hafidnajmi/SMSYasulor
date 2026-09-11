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
    up_area VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP,
    updated_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS ""pm_schedule_item"" (
    id SERIAL PRIMARY KEY,
    pm_schedule_id INT NOT NULL,
    sparepart_id VARCHAR(100) NOT NULL,
    sparepart_name VARCHAR(250) NOT NULL,
    quantity DOUBLE PRECISION DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'Pcs',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ""pm_standard_part"" (
    id SERIAL PRIMARY KEY,
    line VARCHAR(100) NOT NULL,
    machine_name VARCHAR(200),
    sparepart_id VARCHAR(100) NOT NULL,
    sparepart_name VARCHAR(250) NOT NULL,
    default_quantity DOUBLE PRECISION DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'Pcs',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
";
                await db.Database.ExecuteSqlRawAsync(sql);

                try
                {
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Supplier_Offer"" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Supplier_Offer"" ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""SPAREPART_PRICE_HISTORY"" ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS part_number VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS user_id INT;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" DROP COLUMN IF EXISTS purchase_price CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" DROP COLUMN IF EXISTS exchange_rate_to_idr CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"DO $$ BEGIN ALTER TABLE barang_masuk DROP COLUMN IF EXISTS purchase_price CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;");
                    await db.Database.ExecuteSqlRawAsync(@"DO $$ BEGIN ALTER TABLE barang_masuk DROP COLUMN IF EXISTS exchange_rate_to_idr CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Keluar"" ADD COLUMN IF NOT EXISTS part_number VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"UPDATE ""Barang_Keluar"" SET part_number = master_data_id WHERE master_data_id IS NOT NULL AND master_data_id <> '' AND (part_number IS NULL OR part_number = '');");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Keluar"" DROP COLUMN IF EXISTS rem_name CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Keluar"" DROP COLUMN IF EXISTS master_id CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Keluar"" DROP COLUMN IF EXISTS unit_price_snapshot CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Keluar"" DROP COLUMN IF EXISTS total_cost_snapshot CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Keluar"" DROP COLUMN IF EXISTS failure_reason CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,2);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Barang_Masuk"" ADD COLUMN IF NOT EXISTS remarks TEXT;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Audit_Log"" ALTER COLUMN action TYPE VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""pm_schedule"" ADD COLUMN IF NOT EXISTS up_area VARCHAR(100);");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""pm_standard_part"" ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'Monthly';");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""pm_standard_part"" ADD COLUMN IF NOT EXISTS duration_min INT DEFAULT 30;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""pm_standard_part"" ADD COLUMN IF NOT EXISTS target_months VARCHAR(100) DEFAULT '1,2,3,4,5,6,7,8,9,10,11,12';");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS can_manage_pm INT DEFAULT 1;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS can_manage_pm_edit INT DEFAULT 1;");
                    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Users"" DROP COLUMN IF EXISTS can_master_machine CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"DROP TABLE IF EXISTS ""Master_Line"" CASCADE;");
                    await db.Database.ExecuteSqlRawAsync(@"DROP TABLE IF EXISTS master_line CASCADE;");

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

                        -- Clean up orphan schedule items from pending PM schedules if standard part template was deleted
                        DELETE FROM ""pm_schedule_item""
                        WHERE pm_schedule_id IN (SELECT id FROM ""pm_schedule"" WHERE UPPER(status) = 'P')
                          AND sparepart_id NOT IN (SELECT sparepart_id FROM ""pm_standard_part"" WHERE sparepart_id IS NOT NULL AND sparepart_id <> '')
                          AND sparepart_name NOT IN (SELECT sparepart_name FROM ""pm_standard_part"" WHERE sparepart_name IS NOT NULL AND sparepart_name <> '');

                        -- Auto-sync last_updated_by in Master_Data from latest Audit_Log for items where last_updated_by is NULL
                        UPDATE ""Master_Data"" m
                        SET last_updated_by = a.changed_by
                        FROM (
                            SELECT DISTINCT ON (record_id) record_id, changed_by
                            FROM ""Audit_Log""
                            WHERE table_name = 'Master_Data' AND changed_by IS NOT NULL AND TRIM(changed_by) <> ''
                            ORDER BY record_id, changed_at DESC
                        ) a
                        WHERE m.id = a.record_id AND (m.last_updated_by IS NULL OR TRIM(m.last_updated_by) = '');

                        -- Auto-sync Master_Data current_unit_price with Supplier_Offer (Selected default first, otherwise MIN price)
                        UPDATE ""Master_Data"" m
                        SET current_unit_price = sub.price,
                            brand = CASE WHEN sub.supplier_name IS NOT NULL AND sub.supplier_name <> '' THEN sub.supplier_name ELSE m.brand END
                        FROM (
                            SELECT DISTINCT ON (master_data_id) 
                                master_data_id, 
                                price, 
                                supplier_name
                            FROM ""Supplier_Offer""
                            WHERE price > 0
                            ORDER BY master_data_id, is_selected DESC, price ASC
                        ) sub
                        WHERE m.id = sub.master_data_id;

                        -- Auto-sync sequence seq_upf_master to prevent duplicate key constraint violations
                        DO $$
                        DECLARE
                            max_val BIGINT;
                            max_user_id INT;
                        BEGIN
                            CREATE SEQUENCE IF NOT EXISTS seq_upf_master START WITH 10000 INCREMENT BY 1;
                            SELECT MAX(CAST(SUBSTRING(id FROM 'UPF-([0-9]+)') AS BIGINT)) INTO max_val 
                            FROM ""Master_Data"" 
                            WHERE id ~ '^UPF-[0-9]+$';
                            
                            IF max_val IS NOT NULL AND max_val >= 10000 THEN
                                PERFORM setval('seq_upf_master', max_val);
                            END IF;

                            -- Auto-sync Users table id sequence to avoid PK_Users duplicate key violation (23505)
                            SELECT COALESCE(MAX(id), 0) INTO max_user_id FROM ""Users"";
                            IF max_user_id > 0 THEN
                                PERFORM setval(pg_get_serial_sequence('""Users""', 'id'), max_user_id);
                            END IF;
                        END $$;

                        -- Auto-update Machine & Line in Master_Data from Barang_Keluar & Machine_Master if machine is GENERAL or empty
                        UPDATE ""Master_Data"" m
                        SET 
                            machine = sub.machine_name,
                            line = COALESCE(NULLIF(m.line, ''), sub.line),
                            last_updated_by = COALESCE(m.last_updated_by, 'system')
                        FROM (
                            SELECT DISTINCT ON (bk.master_data_id) 
                                bk.master_data_id, 
                                mm.machine_name, 
                                bk.line
                            FROM ""Barang_Keluar"" bk
                            JOIN ""Machine_Master"" mm ON bk.machine_id = mm.id
                            WHERE bk.master_data_id IS NOT NULL AND mm.machine_name IS NOT NULL AND TRIM(mm.machine_name) <> ''
                            ORDER BY bk.master_data_id, bk.created_at DESC
                        ) sub
                        WHERE m.id = sub.master_data_id 
                          AND (m.machine IS NULL OR UPPER(TRIM(m.machine)) = 'GENERAL' OR TRIM(m.machine) = '-' OR TRIM(m.machine) = '');
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
                        CanCostIntelligence = 1,
                        CanManagePm = 1,
                        CanManagePmEdit = 1,
                        RequireApprovalKeluar = false
                    };
                    db.Users.Add(adminUser);
                    await db.SaveChangesAsync();
                }

                var techUser = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == "technician");
                if (techUser == null)
                {
                    string techHash = BCrypt.Net.BCrypt.HashPassword("technician123", workFactor: 12);
                    techUser = new User
                    {
                        Username = "technician",
                        PasswordHash = techHash,
                        FullName = "Technician Field User",
                        Role = "user",
                        IsActive = true,
                        CanMasterData = 1,
                        CanBarangMasuk = 1,
                        CanBarangKeluar = 1,
                        CanRiwayat = 1,
                        CanManagePm = 1,
                        CanManagePmEdit = 1,
                        RequireApprovalKeluar = false
                    };
                    db.Users.Add(techUser);
                    await db.SaveChangesAsync();
                }

                await SeedSuppliersAsync(db);
                await SyncElectricalPartsToMasterDataAsync(db);
                await SeedPmSchedulesAsync(db);
                await UPMS.Web.Helpers.PriceHelper.SyncAllCheapestSupplierOffersAsync(db);
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

        public static async Task SeedPmSchedulesAsync(UpmsDbContext db)
        {
            try
            {
                // Synchronize existing pm_schedule records with real-time current time timestamp
                try
                {
                    await db.Database.ExecuteSqlRawAsync("UPDATE pm_schedule SET scheduled_date = date_trunc('day', scheduled_date) + (COALESCE(created_at, CURRENT_TIMESTAMP)::time) WHERE EXTRACT(HOUR FROM scheduled_date) = 0 OR EXTRACT(HOUR FROM scheduled_date) = 8;");
                }
                catch { }

                // Delete existing seed for UP1 2026 to ensure exact match with chart image
                var existingUp1 = await db.PmSchedules.Where(p => p.UpArea == "UP1" && p.ScheduledDate.Year == 2026).ToListAsync();
                if (existingUp1.Any())
                {
                    db.PmSchedules.RemoveRange(existingUp1);
                    await db.SaveChangesAsync();
                }

                var up1Lines = new[] { "B5", "B10", "B15", "B16", "J3", "J4", "J5", "T1", "T3", "T5", "T8" };
                var up2Lines = new[] { "B11", "B17", "B18", "B20", "B22", "S6", "S8", "S10", "S14", "S18" };
                var techList = UPMS.Web.Helpers.TechnicianHelper.Technicians;

                var itemsToSeed = new List<PmSchedule>();
                var nowTime = DateTime.Now;

                // Exact monthly specs for UP1 2026 from Maintenance Performance chart:
                var up1MonthlySpecs = new (int Month, int Plan, int Executed)[]
                {
                    (1, 18, 15),
                    (2, 16, 15),
                    (3, 13, 12),
                    (4, 22, 21),
                    (5, 17, 16),
                    (6, 17, 12),
                    (7, 19, 17),
                    (8, 17, 16)
                };

                foreach (var spec in up1MonthlySpecs)
                {
                    int month = spec.Month;
                    int totalPlan = spec.Plan;
                    int totalExec = spec.Executed;
                    int daysInMonth = DateTime.DaysInMonth(2026, month);

                    for (int i = 0; i < totalPlan; i++)
                    {
                        var lineCode = up1Lines[i % up1Lines.Length];
                        int day = Math.Clamp(1 + (i * daysInMonth / totalPlan), 1, daysInMonth);
                        string status = (i < totalExec) ? "E" : "M"; // Realization = Executed (E), Missed = M
                        string tech = techList[(month + i) % techList.Count];

                        itemsToSeed.Add(new PmSchedule
                        {
                            Title = $"PM Line {lineCode}",
                            MachineName = $"{lineCode} Main Production Unit",
                            MachineCode = $"{lineCode}-MC-0{(i % 3) + 1}",
                            ScheduledDate = new DateTime(2026, month, day).Add(nowTime.TimeOfDay),
                            Status = status,
                            Technician = tech,
                            UpArea = "UP1",
                            Notes = status == "E" ? $"PM rutin Line {lineCode} selesai" : $"PM Line {lineCode} missed / pending",
                            CreatedAt = nowTime,
                            CreatedBy = "System Seed"
                        });
                    }
                }

                // UP2 items per month (if not already seeded)
                if (!await db.PmSchedules.AnyAsync(p => p.UpArea == "UP2" && p.ScheduledDate.Year == 2026))
                {
                    for (int month = 1; month <= 12; month++)
                    {
                        for (int i = 0; i < 4; i++)
                        {
                            var lineCode = up2Lines[(month + i) % up2Lines.Length];
                            int day = Math.Min(4 + (i * 7), DateTime.DaysInMonth(2026, month));
                            string status = month <= 8 ? (i == 2 ? "M" : (i == 1 ? "R" : "E")) : (i == 0 ? "E" : "P");
                            string tech = techList[(month + i + 2) % techList.Count];

                            itemsToSeed.Add(new PmSchedule
                            {
                                Title = $"PM Line {lineCode}",
                                MachineName = $"{lineCode} Auxiliary Unit",
                                MachineCode = $"{lineCode}-MC-0{i + 1}",
                                ScheduledDate = new DateTime(2026, month, day).Add(nowTime.TimeOfDay),
                                Status = status,
                                Technician = tech,
                                UpArea = "UP2",
                                Notes = $"Pemeriksaan berkala fasilitas Line {lineCode}",
                                CreatedAt = nowTime,
                                CreatedBy = "System Seed"
                            });
                        }
                    }
                }

                db.PmSchedules.AddRange(itemsToSeed);
                await db.SaveChangesAsync();
                Console.WriteLine($"[DbSeeder] Successfully seeded {itemsToSeed.Count} exact PM Schedules for UP1 2026.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbSeeder] SeedPmSchedules warning: {ex.Message}");
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
