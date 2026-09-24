# UPMS Database Migration Guide
## Local PC → Company SQL Server

---

## Daftar Isi
1. [Persiapan Awal](#1-persiapan-awal)
2. [Urutan Migrasi](#2-urutan-migrasi)
3. [Detail Tabel & Kolom](#3-detail-tabel--kolom)
   - 3.1 [Master_Data](#31-master_data)
   - 3.2 [Users](#32-users)
   - 3.3 [Supplier_Offer](#33-supplier_offer)
   - 3.4 [Bidding_History](#34-bidding_history)
   - 3.5 [Barang_Masuk](#35-barang_masuk)
   - 3.6 [Barang_Keluar](#36-barang_keluar)
   - 3.7 [sparepart_asset (Restroom)](#37-sparepart_asset-restroom)
   - 3.8 [App_Settings](#38-app_settings)
   - 3.9 [Email_Supplier_Log](#39-email_supplier_log)
   - 3.10 [Email_Draft](#310-email_draft)
   - 3.11 [Audit_Log](#311-audit_log)
   - 3.12 [Schema_Version](#312-schema_version)
   - 3.13 [SEQUENCE Objects](#313-sequence-objects)
4. [Post-Migration](#4-post-migration)
5. [Verifikasi](#5-verifikasi)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Persiapan Awal

### Prasyarat
- SQL Server 2019+ (bisa pakai Express atau Standard)
- Login SQL Server dengan hak `db_owner` atau `sysadmin`
- SSMS (SQL Server Management Studio) atau Azure Data Studio
- Python 3.13+ terinstall di PC development

### Langkah Awal di Server Company

```sql
-- 1. Buat database (nama bebas, contoh: UPMS_Database)
CREATE DATABASE UPMS_Database;
GO

USE UPMS_Database;
GO
```

### Backup Data dari Lokal

```sql
-- Generate script semua data (gunakan SSMS):
-- 1. Klik kanan UPMS_Database → Tasks → Generate Scripts
-- 2. Pilih "Select specific database objects"
-- 3. Pilih semua tables (Master_Data, Barang_Masuk, Users, dll)
-- 4. Set "Types of data to script" = "Schema and data"
-- 5. Save ke file .sql
```

Atau gunakan `bcp` / `Export Data-tier Application (.bacpac)`.

---

## 2. Urutan Migrasi

Migrasi harus sesuai urutan karena **Foreign Key dependencies**:

```
1.  Master_Data             ← tidak punya FK dependency
2.  Users                   ← tidak punya FK dependency
3.  Supplier_Offer          ← logical FK ke Master_Data
4.  Bidding_History         ← FK ke Master_Data (CASCADE)
5.  Barang_Masuk            ← FK ke Master_Data + Users
6.  Barang_Keluar           ← FK ke Master_Data + Users
7.  sparepart_asset         ← tidak punya FK (standalone)
8.  App_Settings            ← tidak punya FK
9.  Email_Supplier_Log      ← logical FK ke Master_Data
10. Email_Draft             ← tidak punya FK
11. Audit_Log               ← tidak punya FK
12. Schema_Version          ← tidak punya FK
13. SEQUENCE objects        ← setelah semua tabel terisi
```

---

## 3. Detail Tabel & Kolom

---

### 3.1 Master_Data

**Menu:** Master Data, Admin Management, Dashboard, Barang Masuk, Barang Keluar, Bidding, Auto Alert Email

**Fungsi:** Data utama sparepart — pusat dari seluruh sistem. Semua modul membaca/menulis tabel ini.

```sql
CREATE TABLE dbo.Master_Data (
    id              NVARCHAR(30)    NOT NULL PRIMARY KEY,   -- UPF-XXXXX (contoh: UPF-12804)
    up_area         NVARCHAR(50)    NULL,                   -- Area produksi (UP1 / UP2)
    bin             NVARCHAR(50)    NULL,                   -- Kode BIN (contoh: A1-1-1)
    item            NVARCHAR(255)   NULL,                   -- Nama sparepart
    detail          NVARCHAR(MAX)   NULL,                   -- Deskripsi detail
    line            NVARCHAR(50)    NULL,                   -- Line produksi (T5, J3, B24, dll)
    category        NVARCHAR(50)    NULL,                   -- Kategori part
    frequency       NVARCHAR(50)    NULL,                   -- Frekuensi: 'FAST' / 'SLOW'
    machine         NVARCHAR(255)   NULL,                   -- Nama mesin
    brand           NVARCHAR(255)   NULL,                   -- Brand / merek
    safety_stock    FLOAT           NULL,                   -- Stok minimal (safety stock)
    current_stock   FLOAT           NULL,                   -- Stok terkini
    qty_line        FLOAT           NULL,                   -- Qty per line
    tbm_per_year    FLOAT           NULL,                   -- TBM per tahun
    lt_per_month    FLOAT           NULL,                   -- Lead time (bulan)
    qty_need_year   FLOAT           NULL,                   -- Kebutuhan per tahun
    budget_code     NVARCHAR(100)   NULL,                   -- Kode budget / cost center
    created_at      DATETIME        NULL,                   -- Waktu dibuat
    updated_at      DATETIME        NULL,                   -- Waktu diupdate
    image           NVARCHAR(500)   NULL,                   -- Path foto sparepart
    is_deleted      BIT             NOT NULL DEFAULT 0      -- Soft delete flag
);
```

**Index:**
```sql
CREATE NONCLUSTERED INDEX IX_MasterData_IsDeleted ON dbo.Master_Data (is_deleted)
    INCLUDE (id, bin, item, current_stock, safety_stock);
```

**Mapping Kolom ke Menu:**

| Kolom | Dimana Ditampilkan | Digunakan untuk |
|-------|-------------------|-----------------|
| `id` | Semua tabel & referensi | Primary key, referensi FK |
| `bin` | Master Data, Admin Mgmt, Barang Masuk/Keluar, Riwayat, Bidding | Kode lokasi sparepart |
| `item` | Semua menu | Nama sparepart |
| `detail` | Master Data (detail card) | Deskripsi |
| `line` | Admin Management (filter) | Line produksi |
| `machine` | Admin Management, Bidding | Nama mesin |
| `brand` | Admin Management | Brand |
| `frequency` | Auto Alert | Menentukan cooldown alert (FAST=7hr, SLOW=30hr) |
| `safety_stock` | Admin Management, Dashboard | Batas minimal stok |
| `current_stock` | Admin Management, Dashboard, Barang Masuk/Keluar | Stok terkini (dihitung ulang setiap transaksi) |
| `qty_need_year` | Bidding, Admin Management | Kebutuhan tahunan |
| `lt_per_month` | Admin Management | Lead time untuk kalkulasi safety stock |
| `image` | Master Data (thumbnail) | Foto sparepart |
| `is_deleted` | Semua query | Soft delete (data tidak dihapus fisik) |

**Rumus Safety Stock (di frontend):**
```
safety_stock = ((qty_need_year / 12) * lt_per_month) * factor
factor = 1.0 jika frequency = 'FAST'
factor = 0.5 jika frequency = 'SLOW'
```

---

### 3.2 Users

**Menu:** Login, Settings (User Management)

**Fungsi:** Akun pengguna dengan RBAC (Role-Based Access Control). Setiap pengguna memiliki permission per menu.

```sql
CREATE TABLE dbo.Users (
    id                NVARCHAR(30)   NOT NULL PRIMARY KEY,  -- UPF-XXXXX
    username          NVARCHAR(255)  NOT NULL,              -- Username login
    password_hash     NVARCHAR(255)  NOT NULL,              -- Hash bcrypt
    role              NVARCHAR(50)   NOT NULL,              -- 'admin' / 'supervisor' / 'manager' / 'user'
    is_active         BIT            NOT NULL DEFAULT 1,    -- 1=Active, 0=Inactive
    created_at        DATETIME       NULL DEFAULT GETDATE(),-- Tgl dibuat
    full_name         NVARCHAR(255)  NULL DEFAULT '',       -- Nama lengkap
    last_login        DATETIME       NULL,                  -- Terakhir login
    can_master_data   INT            NULL DEFAULT 0,        -- Izin: Master Data
    can_admin_mgmt    INT            NULL DEFAULT 0,        -- Izin: Admin Management
    can_bidding       INT            NULL DEFAULT 0,        -- Izin: Bidding
    can_settings      INT            NULL DEFAULT 0,        -- Izin: Settings
    can_barang_masuk  INT            NULL DEFAULT 0,        -- Izin: Barang Masuk
    can_riwayat       INT            NULL DEFAULT 0,        -- Izin: Riwayat Transaksi
    can_restroom      INT            NULL DEFAULT 1,        -- Izin: Sparepart Asset
);
```

**Seed Default Admin:**
```sql
-- Password: 'admin' (hash dengan bcrypt, rounds=12)
-- Jalankan melalui Python application (database.py._seed_default_user_sql())
-- Atau buat manual via aplikasi pertama kali login
```

**Mapping Role ke Menu (default):**

| Role | Master Data | Admin Mgmt | Bidding | Barang Masuk | Riwayat | Sparepart Asset | Settings |
|------|------------|------------|---------|--------------|---------|-----------------|----------|
| Admin | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Supervisor | 👁 View | 👁 View | 👁 View | 👁 View | 👁 View | 👁 View | ❌ |
| Manager | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ |
| User | 👁 View | ❌ | 👁 View | ❌ | 👁 View | 👁 View | ❌ |

> **Catatan:** Permission bisa dikustom per user via menu Settings → Edit User.

---

### 3.3 Supplier_Offer

**Menu:** Admin Management (tab Supplier)

**Fungsi:** Menyimpan penawaran harga dari supplier untuk setiap sparepart. Harga terendah dipakai untuk perbandingan.

```sql
CREATE TABLE dbo.Supplier_Offer (
    id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,  -- Auto-increment
    bin             NVARCHAR(50)    NULL,                   -- Kode BIN (denormalized)
    master_data_id  NVARCHAR(30)    NULL,                   -- FK logikal ke Master_Data.id
    supplier_name   NVARCHAR(255)   NULL,                   -- Nama supplier
    price           DECIMAL(18,2)   NULL,                   -- Harga per unit
    total_value     DECIMAL(18,2)   NULL,                   -- Total = price * qty_need_year
    created_at      DATETIME        NULL DEFAULT GETDATE(), -- Tgl input
    email           NVARCHAR(255)   NULL                    -- Email supplier (untuk RFQ)
);
```

**Mapping Menu:**

| Kolom | Menu | Keterangan |
|-------|------|-----------|
| `bin` | Admin Management | Filter/sort |
| `master_data_id` | Admin Management | Join ke Master_Data |
| `supplier_name` | Admin Management | Ditampilkan di tabel supplier |
| `price` | Admin Management | Harga terendah digunakan sebagai default |
| `total_value` | Admin Management | Nilai total kontrak |
| `email` | Email Settings (RFQ) | Tujuan email RFQ |

---

### 3.4 Bidding_History

**Menu:** Bidding (tender tahunan)

**Fungsi:** Riwayat tender / bidding tahunan per sparepart. Setiap tahun bisa multiple stage (1st, Additional, dll).

```sql
CREATE TABLE dbo.Bidding_History (
    id              NVARCHAR(30)    NOT NULL PRIMARY KEY,   -- UPF-XXXXX
    master_data_id  NVARCHAR(30)    NOT NULL,               -- FK ke Master_Data.id (CASCADE)
    bidding_year    INT             NULL,                   -- Tahun bidding (contoh: 2025)
    bidding_stage   NVARCHAR(50)    NULL,                   -- Stage: '1st', 'Additional'
    supplier_name   NVARCHAR(255)   NULL,                   -- Supplier pemenang
    price           FLOAT           NULL,                   -- Harga kemenangan
    status          NVARCHAR(50)    NULL,                   -- Status: 'Awarded', 'Pending'
    created_at      DATETIME        NULL DEFAULT GETDATE(), -- Tgl dibuat
    updated_at      DATETIME        NULL DEFAULT GETDATE()  -- Tgl diupdate
);
```

**FK:**
```sql
ALTER TABLE dbo.Bidding_History ADD CONSTRAINT FK_BiddingHistory_MasterData
    FOREIGN KEY (master_data_id) REFERENCES dbo.Master_Data(id) ON DELETE CASCADE;
```

**Mapping Menu:**

| Kolom | Menu | Keterangan |
|-------|------|-----------|
| `master_data_id` | Bidding | Join ke Master_Data untuk info item |
| `bidding_year` | Bidding | Filter tahun |
| `bidding_stage` | Bidding | Stage tender |
| `supplier_name` | Bidding, Admin Management | Supplier terpilih |
| `price` | Bidding | Harga per unit |
| `status` | Bidding | Status awarding |

---

### 3.5 Barang_Masuk

**Menu:** Barang Masuk, Riwayat Transaksi

**Fungsi:** Mencatat barang masuk (inbound). Setiap record menambah stok di Master_Data.

```sql
CREATE TABLE dbo.Barang_Masuk (
    id            NVARCHAR(30)    NOT NULL PRIMARY KEY,     -- UPF-XXXXX
    tanggal       NVARCHAR(50)    NULL,                     -- Tgl terima (format: 'DD Mon YYYY HH:MM')
    bin           NVARCHAR(50)    NULL,                     -- Kode BIN
    item_name     NVARCHAR(255)   NULL,                     -- Nama item (denormalized)
    qty           FLOAT           NOT NULL DEFAULT 0,       -- Qty diterima
    po_number     NVARCHAR(100)   NULL,                     -- Nomor PO
    remarks       NVARCHAR(MAX)   NULL,                     -- Catatan
    master_id     NVARCHAR(30)    NULL,                     -- FK ke Master_Data.id
    user_id       NVARCHAR(30)    NULL,                     -- FK ke Users.id
    created_at    DATETIME        NULL DEFAULT GETDATE(),   -- Waktu record
    pic           NVARCHAR(100)   NULL                      -- PIC (Raisa, Priyanto, dll)
);
```

**FKs:**
```sql
ALTER TABLE dbo.Barang_Masuk ADD CONSTRAINT FK_BarangMasuk_MasterData
    FOREIGN KEY (master_id) REFERENCES dbo.Master_Data(id) ON DELETE NO ACTION;

ALTER TABLE dbo.Barang_Masuk ADD CONSTRAINT FK_BarangMasuk_Users
    FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE NO ACTION;
```

**Business Rule:**
Setiap INSERT ke Barang_Masuk → `UPDATE Master_Data SET current_stock = current_stock + qty WHERE bin = ?`

**Mapping Menu:**

| Kolom | Menu | Keterangan |
|-------|------|-----------|
| `tanggal` | Barang Masuk, Riwayat | Tgl transaksi |
| `bin` | Barang Masuk, Riwayat | Kode BIN |
| `item_name` | Barang Masuk, Riwayat | Nama item |
| `qty` | Barang Masuk, Riwayat, Dashboard | Jumlah diterima |
| `po_number` | Barang Masuk, Riwayat | Nomor PO |
| `pic` | Barang Masuk, Riwayat | PIC penerima |
| `master_id` | (internal) | Join ke Master_Data |
| `user_id` | (internal) | Join ke Users |

---

### 3.6 Barang_Keluar

**Menu:** Operator (Barang Keluar), Riwayat Transaksi

**Fungsi:** Mencatat barang keluar (outbound). Setiap record mengurangi stok di Master_Data.

```sql
CREATE TABLE dbo.Barang_Keluar (
    id            NVARCHAR(30)    NOT NULL PRIMARY KEY,     -- UPF-XXXXX
    tanggal       NVARCHAR(50)    NULL,                     -- Tgl keluar
    bin           NVARCHAR(50)    NULL,                     -- Kode BIN
    item_name     NVARCHAR(255)   NULL,                     -- Nama item (denormalized)
    pic           NVARCHAR(100)   NULL,                     -- PIC pengambil (Raisa, Priyanto, dll)
    line          NVARCHAR(100)   NULL,                     -- Line produksi tujuan
    qty           FLOAT           NOT NULL DEFAULT 0,       -- Qty dikeluarkan
    master_id     NVARCHAR(30)    NULL,                     -- FK ke Master_Data.id
    user_id       NVARCHAR(30)    NULL,                     -- FK ke Users.id
    created_at    DATETIME        NULL DEFAULT GETDATE()    -- Waktu record
);
```

**FKs:**
```sql
ALTER TABLE dbo.Barang_Keluar ADD CONSTRAINT FK_BarangKeluar_MasterData
    FOREIGN KEY (master_id) REFERENCES dbo.Master_Data(id) ON DELETE NO ACTION;

ALTER TABLE dbo.Barang_Keluar ADD CONSTRAINT FK_BarangKeluar_Users
    FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE NO ACTION;
```

**Business Rule:**
Setiap INSERT ke Barang_Keluar → `UPDATE Master_Data SET current_stock = current_stock - qty WHERE bin = ?`

**Mapping Menu:**

| Kolom | Menu | Keterangan |
|-------|------|-----------|
| `tanggal` | Operator, Riwayat | Tgl transaksi |
| `bin` | Operator, Riwayat | Kode BIN |
| `item_name` | Operator, Riwayat | Nama item |
| `pic` | Operator, Riwayat | PIC pengambil |
| `line` | Operator, Riwayat | Line tujuan |
| `qty` | Operator, Riwayat, Dashboard | Jumlah keluar |

---

### 3.7 sparepart_asset (Restroom)

**Menu:** Sparepart Asset (Restroom)

**Fungsi:** Inventarisasi sparepart untuk fasilitas restroom/toilet. Terpisah dari Master_Data.

```sql
CREATE TABLE dbo.sparepart_asset (
    id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,  -- Auto-increment
    part_number     NVARCHAR(30)    NOT NULL,               -- UPF-XXXXX (business key)
    no_original     NVARCHAR(10)    NULL,                   -- No part original
    item_number     NVARCHAR(50)    NULL,                   -- Kode item
    place           NVARCHAR(100)   NULL,                   -- Lokasi / tempat
    items           NVARCHAR(500)   NULL,                   -- Nama item
    brand           NVARCHAR(200)   NULL,                   -- Brand
    qty             FLOAT           NULL DEFAULT 0,         -- Qty tersedia
    condition       NVARCHAR(50)    NULL DEFAULT 'Good',    -- Kondisi: 'New', 'Used', 'Poor'
    price_per_unit  FLOAT           NULL DEFAULT 0,         -- Harga per unit
    value           FLOAT           NULL DEFAULT 0,         -- Total nilai (qty * price)
    created_at      DATETIME        NULL DEFAULT GETDATE()  -- Tgl input
);
```

**Mapping Menu:**

| Kolom | Menu | Keterangan |
|-------|------|-----------|
| `part_number` | Sparepart Asset | ID unik sparepart |
| `place` | Sparepart Asset | Filter lokasi |
| `items` | Sparepart Asset | Nama item |
| `qty` | Sparepart Asset | Jumlah stok |
| `condition` | Sparepart Asset | Filter kondisi |
| `value` | Sparepart Asset (detail) | Total nilai aset |

---

### 3.8 App_Settings

**Menu:** Email Settings

**Fungsi:** Menyimpan konfigurasi key-value untuk SMTP email dan pengaturan lainnya.

```sql
CREATE TABLE dbo.App_Settings (
    setting_key     NVARCHAR(100)   NOT NULL PRIMARY KEY,   -- Key setting
    setting_value   NVARCHAR(MAX)   NULL,                   -- Value setting
    updated_at      DATETIME        NULL DEFAULT GETDATE()  -- Tgl update
);
```

**Known Keys:**

| Key | Default | Fungsi |
|-----|---------|--------|
| `smtp_server` | `smtp.office365.com` | Server SMTP untuk kirim email |
| `smtp_port` | `587` | Port SMTP |
| `sender_email` | - | Email pengirim |
| `sender_password` | - | Password / App Password |
| `admin_email` | - | Email admin untuk laporan |

---

### 3.9 Email_Supplier_Log

**Menu:** (Internal — digunakan oleh Auto Alert engine di `utils/email_service.py`)

**Fungsi:** Mencatat histori email alert yang sudah dikirim ke supplier. Digunakan untuk cooldown (tidak mengirim ulang sebelum 7/30 hari).

```sql
CREATE TABLE dbo.Email_Supplier_Log (
    id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    master_data_id  NVARCHAR(30)    NULL,                   -- FK logikal ke Master_Data.id
    bin             NVARCHAR(100)   NULL,                   -- Kode BIN
    supplier_id     INT             NULL,                   -- ID supplier
    sent_date       DATETIME        NULL DEFAULT GETDATE()  -- Tgl kirim
);
```

**Business Rule (cooldown):**
- `frequency = 'FAST'` → re-alert setelah **7 hari**
- `frequency = 'SLOW'` atau NULL → re-alert setelah **30 hari**

---

### 3.10 Email_Draft

**Menu:** Email Settings (draft RFQ)

**Fungsi:** Menyimpan draft email RFQ yang dibuat oleh sistem. Bisa dilihat di menu Email Settings.

```sql
CREATE TABLE dbo.Email_Draft (
    id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    draft_type      NVARCHAR(50)    NOT NULL,               -- Tipe draft: 'RFQ'
    body_html       NVARCHAR(MAX)   NULL,                   -- Body email (HTML)
    metadata        NVARCHAR(MAX)   NULL,                   -- JSON: {items, suppliers, dll}
    created_at      DATETIME        NULL DEFAULT GETDATE()  -- Tgl dibuat
);
```

---

### 3.11 Audit_Log

**Menu:** Dashboard (recent activity)

**Fungsi:** Mencatat perubahan data (INSERT/UPDATE/DELETE) untuk audit trail.

```sql
CREATE TABLE dbo.Audit_Log (
    id              BIGINT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
    action          NVARCHAR(10)    NOT NULL,               -- 'INSERT', 'UPDATE', 'DELETE'
    table_name      NVARCHAR(100)   NOT NULL,               -- Nama tabel
    record_id       NVARCHAR(50)    NULL,                   -- ID record
    changed_by      NVARCHAR(100)   NULL,                   -- Username
    changed_at      DATETIME        NULL DEFAULT GETDATE(), -- Waktu perubahan
    old_value       NVARCHAR(MAX)   NULL,                   -- JSON sebelum
    new_value       NVARCHAR(MAX)   NULL                    -- JSON sesudah
);
```

**Index:**
```sql
CREATE NONCLUSTERED INDEX IX_AuditLog_Table_Record ON dbo.Audit_Log (table_name, record_id, changed_at DESC);
```

---

### 3.12 Schema_Version

**Menu:** (Internal — tracking migrasi)

**Fungsi:** Mencatat versi migrasi database yang sudah dijalankan.

```sql
CREATE TABLE dbo.Schema_Version (
    version         INT             NOT NULL PRIMARY KEY,
    description     NVARCHAR(255)   NOT NULL,
    applied_at      DATETIME        NULL DEFAULT GETDATE(),
    applied_by      NVARCHAR(100)   NULL DEFAULT SUSER_SNAME()
);
```

**Seed Data:**
```sql
INSERT INTO dbo.Schema_Version (version, description) VALUES
    (1, 'Initial SQL Server migration - UPF prefix IDs'),
    (2, 'Production infrastructure: SEQUENCE, Audit_Log, soft-delete');
```

---

### 3.13 SEQUENCE Objects

**Fungsi:** Generator ID unik dengan format `UPF-XXXXX`. Menggunakan SEQUENCE SQL Server untuk menghindari race condition.

```sql
-- Tentukan nilai START berdasarkan MAX ID dari data yang sudah dimigrasi
-- Ganti {max_id + 1} dengan nilai aktual

CREATE SEQUENCE dbo.seq_upf_master
    AS BIGINT START WITH {max_Master_Data + 1} INCREMENT BY 1 NO CYCLE CACHE 10;

CREATE SEQUENCE dbo.seq_upf_bidding
    AS BIGINT START WITH {max_Bidding_History + 1} INCREMENT BY 1 NO CYCLE CACHE 10;

CREATE SEQUENCE dbo.seq_upf_bmasuk
    AS BIGINT START WITH {max_Barang_Masuk + 1} INCREMENT BY 1 NO CYCLE CACHE 10;

CREATE SEQUENCE dbo.seq_upf_bkeluar
    AS BIGINT START WITH {max_Barang_Keluar + 1} INCREMENT BY 1 NO CYCLE CACHE 10;

CREATE SEQUENCE dbo.seq_upf_sparepart_asset
    AS BIGINT START WITH {max_sparepart_asset.part_number + 1} INCREMENT BY 1 NO CYCLE CACHE 10;
```

**Cara hitung START value:**
```sql
SELECT ISNULL(MAX(CAST(SUBSTRING(id, 5, LEN(id)) AS INT)), 0) + 1
FROM dbo.Master_Data
WHERE ISNUMERIC(SUBSTRING(id, 5, LEN(id))) = 1;
-- Ulangi untuk Bidding_History, Barang_Masuk, Barang_Keluar, sparepart_asset.part_number
```

---

## 4. Post-Migration

Setelah semua data & SEQUENCE terbuat, jalankan langkah berikut:

### 4.1 Tambah FK Constraints (jika belum ada)

```sql
-- Bidding_History → Master_Data (CASCADE)
ALTER TABLE dbo.Bidding_History ADD CONSTRAINT FK_BiddingHistory_MasterData
    FOREIGN KEY (master_data_id) REFERENCES dbo.Master_Data(id) ON DELETE CASCADE;

-- Barang_Masuk → Master_Data
ALTER TABLE dbo.Barang_Masuk ADD CONSTRAINT FK_BarangMasuk_MasterData
    FOREIGN KEY (master_id) REFERENCES dbo.Master_Data(id) ON DELETE NO ACTION;

-- Barang_Masuk → Users
ALTER TABLE dbo.Barang_Masuk ADD CONSTRAINT FK_BarangMasuk_Users
    FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE NO ACTION;

-- Barang_Keluar → Master_Data
ALTER TABLE dbo.Barang_Keluar ADD CONSTRAINT FK_BarangKeluar_MasterData
    FOREIGN KEY (master_id) REFERENCES dbo.Master_Data(id) ON DELETE NO ACTION;

-- Barang_Keluar → Users
ALTER TABLE dbo.Barang_Keluar ADD CONSTRAINT FK_BarangKeluar_Users
    FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE NO ACTION;
```

### 4.2 Soft-Delete Index

```sql
CREATE NONCLUSTERED INDEX IX_MasterData_IsDeleted ON dbo.Master_Data (is_deleted)
    INCLUDE (id, bin, item, current_stock, safety_stock);
```

### 4.3 Audit Log Index

```sql
CREATE NONCLUSTERED INDEX IX_AuditLog_Table_Record ON dbo.Audit_Log (table_name, record_id, changed_at DESC);
```

### 4.4 Config Local

File `config_local.yaml` di PC development:

```yaml
database:
  production:
    driver: "ODBC Driver 17 for SQL Server"
    server: "NAMA_SERVER_COMPANY"      # Ganti dengan nama server / IP
    database: "UPMS_Database"
    username: "sa"                      # atau user domain
    password: "password_server"         # password SQL Server
    trust_cert: "yes"

  local:
    driver: "ODBC Driver 17 for SQL Server"
    server: "NAMA_SERVER_COMPANY"
    database: "UPMS_Database"
    username: "sa"
    password: "password_server"
    trust_cert: "yes"
```

---

## 5. Verifikasi

Setelah migrasi selesai, jalankan query berikut untuk verifikasi:

### 5.1 Cek Jumlah Record

```sql
SELECT 'Master_Data' as [Table], COUNT(*) as [Rows] FROM dbo.Master_Data
UNION ALL SELECT 'Users', COUNT(*) FROM dbo.Users
UNION ALL SELECT 'Supplier_Offer', COUNT(*) FROM dbo.Supplier_Offer
UNION ALL SELECT 'Bidding_History', COUNT(*) FROM dbo.Bidding_History
UNION ALL SELECT 'Barang_Masuk', COUNT(*) FROM dbo.Barang_Masuk
UNION ALL SELECT 'Barang_Keluar', COUNT(*) FROM dbo.Barang_Keluar
UNION ALL SELECT 'sparepart_asset', COUNT(*) FROM dbo.sparepart_asset
UNION ALL SELECT 'App_Settings', COUNT(*) FROM dbo.App_Settings
UNION ALL SELECT 'Audit_Log', COUNT(*) FROM dbo.Audit_Log
ORDER BY [Table];
```

### 5.2 Cek SEQUENCE

```sql
SELECT name, current_value FROM sys.sequences WHERE schema_id = SCHEMA_ID('dbo');
```

### 5.3 Cek FK Constraints

```sql
SELECT
    fk.name AS FK_Name,
    OBJECT_NAME(fk.parent_object_id) AS Child_Table,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS Child_Column,
    OBJECT_NAME(fk.referenced_object_id) AS Parent_Table,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS Parent_Column,
    delete_referential_action_desc AS Delete_Rule
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
ORDER BY Child_Table;
```

### 5.4 Test Login Aplikasi

Jalankan aplikasi (`python main.py`) dan coba:
1. Login dengan user admin
2. Buka Master Data → cek data muncul
3. Buka Dashboard → cek chart & summary
4. Buat 1 transaksi Barang Masuk
5. Cek Riwayat Transaksi
6. Buka Settings → cek user list

---

## 6. Troubleshooting

### Error: "Cannot insert duplicate key"
- Cek apakah data sudah ada di server
- Gunakan `MERGE` atau `INSERT ... WHERE NOT EXISTS`

### Error: "FK conflict"
- Pastikan urutan migrasi sesuai (Master_Data & Users dulu)
- Cek orphan records di child table

### Error: "SEQUENCE not found"
- Jalankan `CREATE SEQUENCE` untuk tabel terkait
- atau aplikasi akan fallback ke `SELECT MAX(...)` query

### Error: "Login failed for user"
- Cek `config_local.yaml` → username/password
- Pastikan SQL Server Authentication enabled
- Cek firewall / port 1433

### Aplikasi lambat
- Pastikan index sudah dibuat
- Cek execution plan di SSMS

---

> **Catatan:** Jika ada error lain saat migrasi, hubungi developer.
