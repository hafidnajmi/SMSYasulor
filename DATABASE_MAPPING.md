# System Management Sparepart (SMS) — Database Mapping Document

> **Database Engine:** Microsoft SQL Server (Enterprise / Standard)  
> **Database Name:** `UPMS_Database`  
> **Rule:** PHASE 1 migration strictly preserves existing SQL Server schema, table names, column names, relationships, primary keys, and data types without alteration.

---

## 1. Table & Column Mapping Specification

### 1.1 `dbo.Users`

| Column Name | SQL Server Data Type | Nullable | Primary / Foreign Key | C# Model Property | EF Core Mapping / Constraint |
|-------------|---------------------|----------|-----------------------|-------------------|-----------------------------|
| `id` | `INT` | No | PK `IDENTITY(1,1)` | `int Id` | `[Key], [DatabaseGenerated(DatabaseGeneratedOption.Identity)]` |
| `username` | `NVARCHAR(100)` | No | UK | `string Username` | `[Required], [Column("username")]` |
| `password_hash` | `NVARCHAR(64)` | No | None | `string PasswordHash` | `[Required], [Column("password_hash")]` |
| `full_name` | `NVARCHAR(200)` | Yes | None | `string? FullName` | `[Column("full_name")]` |
| `role` | `NVARCHAR(20)` | No | None | `string Role` | `[Required], [Column("role")]` |
| `last_login` | `DATETIME` | Yes | None | `DateTime? LastLogin` | `[Column("last_login")]` |
| `can_master_data` | `INT` | No | Default 1 | `int CanMasterData` | `[Column("can_master_data")]` |
| `can_admin_mgmt` | `INT` | No | Default 1 | `int CanAdminMgmt` | `[Column("can_admin_mgmt")]` |
| `can_bidding` | `INT` | No | Default 1 | `int CanBidding` | `[Column("can_bidding")]` |
| `can_settings` | `INT` | No | Default 0 | `int CanSettings` | `[Column("can_settings")]` |
| `can_barang_masuk` | `INT` | No | Default 1 | `int CanBarangMasuk` | `[Column("can_barang_masuk")]` |
| `can_riwayat` | `INT` | No | Default 1 | `int CanRiwayat` | `[Column("can_riwayat")]` |
| `can_restroom` | `INT` | No | Default 0 | `int CanRestroom` | `[Column("can_restroom")]` |
| `can_supplier_data` | `INT` | No | Default 0 | `int CanSupplierData` | `[Column("can_supplier_data")]` |
| `can_email_settings` | `INT` | No | Default 0 | `int CanEmailSettings` | `[Column("can_email_settings")]` |
| `can_barang_keluar` | `INT` | No | Default 1 | `int CanBarangKeluar` | `[Column("can_barang_keluar")]` |
| `can_line_mapping` | `INT` | No | Default 0 | `int CanLineMapping` | `[Column("can_line_mapping")]` |
| `require_approval_keluar` | `INT` | No | Default 0 | `int RequireApprovalKeluar` | `[Column("require_approval_keluar")]` |

---

### 1.2 `dbo.Master_Data`

| Column Name | SQL Server Data Type | Nullable | Primary / Foreign Key | C# Model Property | EF Core Mapping / Constraint |
|-------------|---------------------|----------|-----------------------|-------------------|-----------------------------|
| `id` | `NVARCHAR(50)` | No | PK (SEQUENCE format `UPF-XXXXX`) | `string Id` | `[Key], [Column("id")]` |
| `item` | `NVARCHAR(200)` | No | None | `string Item` | `[Required], [Column("item")]` |
| `detail` | `NVARCHAR(500)` | Yes | None | `string? Detail` | `[Column("detail")]` |
| `brand` | `NVARCHAR(100)` | Yes | None | `string? Brand` | `[Column("brand")]` |
| `machine` | `NVARCHAR(200)` | Yes | None | `string? Machine` | `[Column("machine")]` |
| `up_area` | `NVARCHAR(50)` | Yes | None | `string? UpArea` | `[Column("up_area")]` |
| `bin` | `NVARCHAR(50)` | Yes | None | `string? Bin` | `[Column("bin")]` |
| `line` | `NVARCHAR(100)` | Yes | None | `string? Line` | `[Column("line")]` |
| `category` | `NVARCHAR(50)` | Yes | None | `string? Category` | `[Column("category")]` |
| `frequency` | `NVARCHAR(50)` | Yes | FAST / SLOW | `string? Frequency` | `[Column("frequency")]` |
| `current_stock` | `DECIMAL(18,2)` | No | Default 0.00 | `decimal CurrentStock` | `[Column("current_stock")]` |
| `safety_stock` | `DECIMAL(18,2)` | No | Default 0.00 | `decimal SafetyStock` | `[Column("safety_stock")]` |
| `qty_need_year` | `DECIMAL(18,2)` | Yes | None | `decimal? QtyNeedYear` | `[Column("qty_need_year")]` |
| `budget_code` | `NVARCHAR(100)` | Yes | None | `string? BudgetCode` | `[Column("budget_code")]` |
| `image` | `VARBINARY(MAX)` | Yes | None | `byte[]? Image` | `[Column("image")]` |
| `is_deleted` | `INT` | No | Default 0 (soft delete) | `int IsDeleted` | `[Column("is_deleted")]` |
| `alert_selected` | `INT` | No | Default 0 | `int AlertSelected` | `[Column("alert_selected")]` |
| `unit_price` | `DECIMAL(18,2)` | Yes | None | `decimal? UnitPrice` | `[Column("unit_price")]` |
| `current_unit_price` | `DECIMAL(18,2)` | Yes | None | `decimal? CurrentUnitPrice` | `[Column("current_unit_price")]` |
| `currency` | `NVARCHAR(10)` | Yes | Default 'IDR' | `string? Currency` | `[Column("currency")]` |
| `last_price_update` | `DATETIME` | Yes | None | `DateTime? LastPriceUpdate` | `[Column("last_price_update")]` |
| `last_updated_by` | `NVARCHAR(100)` | Yes | None | `string? LastUpdatedBy` | `[Column("last_updated_by")]` |

---

### 1.3 `dbo.Barang_Masuk`

| Column Name | SQL Server Data Type | Nullable | Primary / Foreign Key | C# Model Property | EF Core Mapping / Constraint |
|-------------|---------------------|----------|-----------------------|-------------------|-----------------------------|
| `id` | `NVARCHAR(50)` | No | PK (`UPF-...`) | `string Id` | `[Key], [Column("id")]` |
| `tanggal` | `DATE` | No | None | `DateTime Tanggal` | `[Column("tanggal"), DataType(DataType.Date)]` |
| `bin` | `NVARCHAR(50)` | Yes | None | `string? Bin` | `[Column("bin")]` |
| `item_name` | `NVARCHAR(200)` | No | None | `string ItemName` | `[Required], [Column("item_name")]` |
| `qty` | `DECIMAL(18,2)` | No | None | `decimal Qty` | `[Column("qty")]` |
| `pic` | `NVARCHAR(100)` | Yes | None | `string? Pic` | `[Column("pic")]` |
| `supplier` | `NVARCHAR(200)` | Yes | None | `string? Supplier` | `[Column("supplier")]` |
| `created_at` | `DATETIME` | No | Default `GETDATE()` | `DateTime CreatedAt` | `[Column("created_at")]` |

---

### 1.4 `dbo.Barang_Keluar`

| Column Name | SQL Server Data Type | Nullable | Primary / Foreign Key | C# Model Property | EF Core Mapping / Constraint |
|-------------|---------------------|----------|-----------------------|-------------------|-----------------------------|
| `id` | `NVARCHAR(50)` | No | PK (`UPF-...`) | `string Id` | `[Key], [Column("id")]` |
| `tanggal` | `DATE` | No | None | `DateTime Tanggal` | `[Column("tanggal")]` |
| `bin` | `NVARCHAR(50)` | Yes | None | `string? Bin` | `[Column("bin")]` |
| `item_name` | `NVARCHAR(200)` | No | None | `string ItemName` | `[Required], [Column("item_name")]` |
| `qty` | `DECIMAL(18,2)` | No | None | `decimal Qty` | `[Column("qty")]` |
| `rem_name` | `NVARCHAR(100)` | Yes | None | `string? RemName` | `[Column("rem_name")]` |
| `master_data_id` | `NVARCHAR(50)` | Yes | FK -> `Master_Data.id` | `string? MasterDataId` | `[Column("master_data_id"), ForeignKey("MasterData")]` |
| `line` | `NVARCHAR(100)` | Yes | None | `string? Line` | `[Column("line")]` |
| `machine_id` | `INT` | Yes | FK -> `Machine_Master.id` | `int? MachineId` | `[Column("machine_id"), ForeignKey("MachineMaster")]` |
| `maintenance_type` | `NVARCHAR(50)` | Yes | None | `string? MaintenanceType` | `[Column("maintenance_type")]` |
| `failure_reason` | `NVARCHAR(100)` | Yes | None | `string? FailureReason` | `[Column("failure_reason")]` |
| `action_note` | `NVARCHAR(500)` | Yes | None | `string? ActionNote` | `[Column("action_note")]` |
| `Unit_Price` | `DECIMAL(18,2)` | Yes | None | `decimal? UnitPrice` | `[Column("Unit_Price")]` |
| `Total_Cost` | `DECIMAL(18,2)` | Yes | None | `decimal? TotalCost` | `[Column("Total_Cost")]` |
| `pic` | `NVARCHAR(100)` | Yes | None | `string? Pic` | `[Column("pic")]` |
| `user_id` | `INT` | Yes | FK -> `Users.id` | `int? UserId` | `[Column("user_id"), ForeignKey("User")]` |
| `created_at` | `DATETIME` | No | Default `GETDATE()` | `DateTime CreatedAt` | `[Column("created_at")]` |
| `approval_status` | `NVARCHAR(20)` | Yes | Approved/Pending/Rejected | `string? ApprovalStatus` | `[Column("approval_status")]` |
| `approved_by` | `NVARCHAR(100)` | Yes | None | `string? ApprovedBy` | `[Column("approved_by")]` |
| `approved_at` | `DATETIME` | Yes | None | `DateTime? ApprovedAt` | `[Column("approved_at")]` |

---

### 1.5 `dbo.Machine_Master`

| Column Name | SQL Server Data Type | Nullable | Primary / Foreign Key | C# Model Property | EF Core Mapping / Constraint |
|-------------|---------------------|----------|-----------------------|-------------------|-----------------------------|
| `id` | `INT` | No | PK `IDENTITY(1,1)` | `int Id` | `[Key], [DatabaseGenerated(DatabaseGeneratedOption.Identity)]` |
| `machine_code` | `NVARCHAR(100)` | No | UK | `string MachineCode` | `[Required], [Column("machine_code")]` |
| `machine_name` | `NVARCHAR(200)` | No | None | `string MachineName` | `[Required], [Column("machine_name")]` |
| `line` | `NVARCHAR(100)` | Yes | None | `string? Line` | `[Column("line")]` |
| `area` | `NVARCHAR(100)` | Yes | None | `string? Area` | `[Column("area")]` |
| `machine_type` | `NVARCHAR(100)` | Yes | None | `string? MachineType` | `[Column("machine_type")]` |
| `manufacturer` | `NVARCHAR(200)` | Yes | None | `string? Manufacturer` | `[Column("manufacturer")]` |
| `model` | `NVARCHAR(200)` | Yes | None | `string? Model` | `[Column("model")]` |
| `status` | `NVARCHAR(20)` | No | Default 'active' | `string Status` | `[Column("status")]` |
| `created_at` | `DATETIME` | No | Default `GETDATE()` | `DateTime CreatedAt` | `[Column("created_at")]` |

---

### 1.6 Additional Tables Specification

- **`dbo.SPAREPART_LINE_MAPPING`**: `id` (INT PK ID), `master_data_id` (NVARCHAR(50) FK), `line` (NVARCHAR(100)), `created_at`, `updated_at`, `is_active` (INT).
- **`dbo.SPAREPART_PRICE_HISTORY`**: `id` (INT PK ID), `master_data_id` (NVARCHAR(50) FK), `old_price`, `new_price`, `currency`, `reason`, `effective_date`, `updated_by`, `updated_at`.
- **`dbo.Supplier`**: `id` (INT PK ID), `name`, `address`, `email`, `phone`, `pic`.
- **`dbo.Supplier_Offer`**: `id` (INT PK ID), `master_data_id` (FK), `bin`, `supplier_name`, `supplier_id` (FK), `price`, `total_value`, `selected_for_rfq`.
- **`dbo.Bidding_History`**: `id` (NVARCHAR(50) PK UPF-...), `master_data_id` (FK), `bidding_year`, `bidding_stage`, `supplier_name`, `price`, `status`.
- **`dbo.sparepart_asset`**: `id` (INT PK ID), `part_number`, `place`, `items`, `brand`, `qty`, `condition`, `price_unit`.
- **`dbo.Email_Supplier_Log`**: `id` (INT PK ID), `master_data_id` (FK), `bin`, `supplier_id`, `sent_date`.
- **`dbo.Audit_Log`**: `id` (INT PK ID), `table_name`, `record_id`, `action`, `old_data` (NVARCHAR(MAX) JSON), `new_data` (NVARCHAR(MAX) JSON), `changed_by`, `changed_at`.
- **`dbo.App_Settings`**: `setting_key` (NVARCHAR(100) PK), `setting_value` (NVARCHAR(MAX)).

---

## 2. SQL Server SEQUENCE Objects

The ASP.NET Core application will generate UPF-prefixed IDs via database sequence calls:

```sql
SELECT NEXT VALUE FOR dbo.[seq_upf_master];
SELECT NEXT VALUE FOR dbo.[seq_upf_bmasuk];
SELECT NEXT VALUE FOR dbo.[seq_upf_bkeluar];
SELECT NEXT VALUE FOR dbo.[seq_upf_bidding];
SELECT NEXT VALUE FOR dbo.[seq_upf_sparepart_asset];
```

In EF Core, this is executed via raw SQL command on `DbContext`:
```csharp
public async Task<string> GenerateUpfIdAsync(string sequenceName)
{
    var connection = _context.Database.GetDbConnection();
    await connection.OpenAsync();
    using var command = connection.CreateCommand();
    command.CommandText = $"SELECT NEXT VALUE FOR dbo.[{sequenceName}]";
    var result = await command.ExecuteScalarAsync();
    return $"UPF-{result}";
}
```
