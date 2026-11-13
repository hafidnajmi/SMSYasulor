-- ====================================================================
-- SKRIP PEMBUATAN DATABASE & TABEL RESMI SISTEM IM DIGITAL (SQL SERVER)
-- Versi: 2.1 — Terakhir diperbarui: 19 Oktober 2026
-- ====================================================================
-- CATATAN:
-- 1. Script ini idempotent (aman dijalankan berulang, tidak menimpa data yang sudah ada)
-- 2. Kolom legacy (up_head_manager, password_plain) TIDAK disertakan
--    karena tidak digunakan oleh backend .NET aktif
-- 3. Tabel ppi_im_audit_log dibuat untuk kebutuhan audit trail di masa depan
-- ====================================================================

-- 1. Buat Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'IM_Database')
BEGIN
    CREATE DATABASE [IM_Database];
END
GO

USE [IM_Database];
GO

-- 2. Tabel Pengguna (ppi_users)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_users' AND xtype='U')
CREATE TABLE ppi_users (
    id                    INT IDENTITY(1,1) PRIMARY KEY,
    username              NVARCHAR(100) UNIQUE NOT NULL,
    password              NVARCHAR(64)  NOT NULL,
    full_name             NVARCHAR(200) NOT NULL DEFAULT '',
    nik                   NVARCHAR(50)  NOT NULL DEFAULT '',
    role                  NVARCHAR(20)  NOT NULL DEFAULT 'USER',
    is_active             INT           NOT NULL DEFAULT 1,
    created_at            DATETIME2     NOT NULL DEFAULT GETDATE(),
    launch_co             INT           NOT NULL DEFAULT 0,
    up                    INT           NOT NULL DEFAULT 0,
    pole                  INT           NOT NULL DEFAULT 0,
    msc_adm               INT           NOT NULL DEFAULT 0,
    iq                    INT           NOT NULL DEFAULT 0,
    up_filling_spv        INT           NOT NULL DEFAULT 0,
    up_filling_manager    INT           NOT NULL DEFAULT 0,
    packaging_pole        INT           NOT NULL DEFAULT 0,
    qa_lab                INT           NOT NULL DEFAULT 0,
    lihat_im              INT           NOT NULL DEFAULT 0,
    histori_pengisian     INT           NOT NULL DEFAULT 0,
    settings              INT           NOT NULL DEFAULT 0,
    input_spec_code       INT           NOT NULL DEFAULT 0,
    spec_code_pdf         INT           NOT NULL DEFAULT 0,
    is_locked             INT           NOT NULL DEFAULT 0,
    failed_login_count    INT           NOT NULL DEFAULT 0,
    locked_until          DATETIME2     NULL,
    last_failed_login     DATETIME2     NULL,
    last_login            DATETIME2     NULL,
    force_password_change INT           NOT NULL DEFAULT 0,
    last_modified_by      NVARCHAR(100) NULL,
    last_modified_date    DATETIME2     NULL,
    email                 NVARCHAR(200) NULL,
    created_by            NVARCHAR(100) NULL
);
GO

-- 3. Tabel Dokumen IM (ppi_im_documents)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_im_documents' AND xtype='U')
CREATE TABLE ppi_im_documents (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    im_code         NVARCHAR(50)   NOT NULL,
    uuid            NVARCHAR(50)   UNIQUE NULL,
    description     NVARCHAR(1000) NULL,
    kode_sf         NVARCHAR(50)   NULL,
    no_fla          NVARCHAR(MAX)  NULL,
    tgl_issue       NVARCHAR(20)   NULL,
    alasan_revisi   NVARCHAR(1000) NULL,
    status          NVARCHAR(20)   NOT NULL DEFAULT 'Draft',
    jenis_line      NVARCHAR(100)  NULL,
    dept_set        NVARCHAR(100)  NULL,
    created_by      NVARCHAR(100)  NULL,
    created_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
    locked_by       NVARCHAR(100)  NULL,
    locked_at       DATETIME2      NULL,
    deleted_at      DATETIME2      NULL,
    pdf_blob        VARBINARY(MAX) NULL,
    pdf_filename    NVARCHAR(500)  NULL,
    source_type     NVARCHAR(20)   NOT NULL DEFAULT 'Digital'
);
GO

-- Filtered Unique Index untuk im_code (hanya berlaku pada dokumen yang belum dihapus)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_ppi_im_documents_im_code_active' AND object_id = OBJECT_ID('ppi_im_documents'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_ppi_im_documents_im_code_active 
    ON ppi_im_documents(im_code) 
    WHERE deleted_at IS NULL;
END
GO

-- 4. Tabel Data Divisi (ppi_im_division_data)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_im_division_data' AND xtype='U')
CREATE TABLE ppi_im_division_data (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    im_id           INT           NOT NULL REFERENCES ppi_im_documents(id) ON DELETE CASCADE,
    division        NVARCHAR(50)  NOT NULL,
    data_json       NVARCHAR(MAX) NULL,
    image_data      VARBINARY(MAX) NULL,
    submitted_by    INT           NULL REFERENCES ppi_users(id),
    submitted_at    DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_ppi_im_division UNIQUE(im_id, division)
);
GO

-- 5. Tabel Kunci Dokumen (ppi_im_locks)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_im_locks' AND xtype='U')
CREATE TABLE ppi_im_locks (
    im_code     NVARCHAR(50)  NOT NULL,
    division    NVARCHAR(50)  NOT NULL,
    locked_by   NVARCHAR(100) NULL,
    locked_at   DATETIME2     NOT NULL DEFAULT GETDATE(),
    PRIMARY KEY (im_code, division)
);
GO

-- 6. Tabel Master Spec Code (ppi_spec_code_masters)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_spec_code_masters' AND xtype='U')
CREATE TABLE ppi_spec_code_masters (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    spec_code         NVARCHAR(100) UNIQUE NOT NULL,
    spec_name         NVARCHAR(200) NULL,
    fg_codes          NVARCHAR(MAX) NULL,
    a6_data_json      NVARCHAR(MAX) NULL,
    a7_data_json      NVARCHAR(MAX) NULL,
    pallet_pdf_name   NVARCHAR(255) NULL,
    pallet_pdf_data   NVARCHAR(MAX) NULL,
    fg_spec_pdf_name  NVARCHAR(255) NULL,
    fg_spec_pdf_data  NVARCHAR(MAX) NULL,
    created_by        NVARCHAR(100) NULL,
    created_at        DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2     NOT NULL DEFAULT GETDATE()
);
GO

-- 7. Tabel Pejabat Penanda Tangan (ppi_assignees) [Legacy - lihat catatan di ERD]
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_assignees' AND xtype='U')
CREATE TABLE ppi_assignees (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    name             NVARCHAR(200) NOT NULL,
    division         NVARCHAR(100) NOT NULL,
    signature_image  VARBINARY(MAX) NULL,
    password         NVARCHAR(100) NULL
);
GO

-- 8. Tabel Log Otentikasi (ppi_auth_log)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_auth_log' AND xtype='U')
CREATE TABLE ppi_auth_log (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    username    NVARCHAR(200) NULL,
    user_id     INT NULL REFERENCES ppi_users(id),
    status      NVARCHAR(50)  NULL,
    detail      NVARCHAR(500) NULL,
    logged_at   DATETIME2     NOT NULL DEFAULT GETDATE()
);
GO

-- 9. Tabel Log Audit Keamanan (ppi_security_audit_log)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_security_audit_log' AND xtype='U')
CREATE TABLE ppi_security_audit_log (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    action          NVARCHAR(100) NULL,
    administrator   NVARCHAR(100) NULL,
    target_username NVARCHAR(100) NULL,
    computer_name   NVARCHAR(100) NULL,
    reason          NVARCHAR(500) NULL,
    logged_at       DATETIME2     NOT NULL DEFAULT GETDATE()
);
GO

-- 10. Tabel Log Audit Dokumen IM (ppi_im_audit_log) [Reserved - belum aktif di backend]
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ppi_im_audit_log' AND xtype='U')
CREATE TABLE ppi_im_audit_log (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    im_id           INT NULL REFERENCES ppi_im_documents(id) ON DELETE CASCADE,
    user_id         INT NULL REFERENCES ppi_users(id),
    action          NVARCHAR(100) NULL,
    detail          NVARCHAR(MAX) NULL,
    logged_at       DATETIME2     NOT NULL DEFAULT GETDATE()
);
GO

-- ====================================================================
-- 11. MIGRATION SCRIPTS (untuk upgrade database yang sudah ada)
-- Script di bawah ini AMAN dijalankan berulang kali.
-- ====================================================================

-- 11a. Perlebar kolom no_fla ke NVARCHAR(MAX) jika masih NVARCHAR(200)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_im_documents') AND name = 'no_fla')
BEGIN
    ALTER TABLE ppi_im_documents ALTER COLUMN no_fla NVARCHAR(MAX) NULL;
END
GO

-- 11b. Perlebar kolom description ke NVARCHAR(1000) jika masih NVARCHAR(200)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_im_documents') AND name = 'description')
BEGIN
    ALTER TABLE ppi_im_documents ALTER COLUMN description NVARCHAR(1000) NULL;
END
GO

-- 11c. Perlebar kolom alasan_revisi ke NVARCHAR(1000) jika masih NVARCHAR(500)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_im_documents') AND name = 'alasan_revisi')
BEGIN
    ALTER TABLE ppi_im_documents ALTER COLUMN alasan_revisi NVARCHAR(1000) NULL;
END
GO

-- 11d. Tambahkan kolom input_spec_code jika belum ada
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_users') AND name = 'input_spec_code')
BEGIN
    ALTER TABLE ppi_users ADD input_spec_code INT NOT NULL DEFAULT 0;
END
GO

-- 11e. Tambahkan kolom spec_code_pdf jika belum ada
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_users') AND name = 'spec_code_pdf')
BEGIN
    ALTER TABLE ppi_users ADD spec_code_pdf INT NOT NULL DEFAULT 0;
END
GO

-- 11f. Migrasi unique constraint im_code ke filtered unique index
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = name FROM sys.key_constraints 
WHERE parent_object_id = OBJECT_ID('ppi_im_documents') AND type = 'UQ' AND name LIKE 'UQ__ppi_im_d%';
IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE ppi_im_documents DROP CONSTRAINT ' + @constraintName);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_ppi_im_documents_im_code_active' AND object_id = OBJECT_ID('ppi_im_documents'))
BEGIN
    EXEC('CREATE UNIQUE NONCLUSTERED INDEX UQ_ppi_im_documents_im_code_active ON ppi_im_documents(im_code) WHERE deleted_at IS NULL;');
END
GO

-- 11g. Tambahkan kolom PDF pada ppi_spec_code_masters jika belum ada
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_spec_code_masters') AND name = 'pallet_pdf_name')
BEGIN
    ALTER TABLE ppi_spec_code_masters ADD pallet_pdf_name NVARCHAR(255) NULL;
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_spec_code_masters') AND name = 'pallet_pdf_data')
BEGIN
    ALTER TABLE ppi_spec_code_masters ADD pallet_pdf_data NVARCHAR(MAX) NULL;
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_spec_code_masters') AND name = 'fg_spec_pdf_name')
BEGIN
    ALTER TABLE ppi_spec_code_masters ADD fg_spec_pdf_name NVARCHAR(255) NULL;
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ppi_spec_code_masters') AND name = 'fg_spec_pdf_data')
BEGIN
    ALTER TABLE ppi_spec_code_masters ADD fg_spec_pdf_data NVARCHAR(MAX) NULL;
END
GO

-- ====================================================================
-- 12. Seed Akun Default Administrator (Password: 'admin' di-hash SHA-256)
-- ====================================================================
IF NOT EXISTS (SELECT 1 FROM ppi_users WHERE username = 'admin')
BEGIN
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
    );
END
GO
