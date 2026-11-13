-- ====================================================================
-- SKRIP PEMBUATAN DATABASE & TABEL RESMI SISTEM IM DIGITAL (POSTGRESQL)
-- Dikonversi dari SKEMA_DATABASE_IM_DIGITAL.sql (SQL Server ke PostgreSQL)
-- Target RDBMS : PostgreSQL 12+ / 14 / 15 / 16 / 17
-- ====================================================================
-- CATATAN:
-- 1. Script ini sepenuhnya IDEMPOTENT (aman dijalankan berulang kali).
-- 2. Menggunakan tipe data PostgreSQL:
--    - INT IDENTITY(1,1) -> SERIAL PRIMARY KEY
--    - NVARCHAR(n)       -> VARCHAR(n)
--    - NVARCHAR(MAX)     -> TEXT
--    - VARBINARY(MAX)    -> BYTEA
--    - DATETIME2         -> TIMESTAMP
--    - GETDATE()         -> CURRENT_TIMESTAMP
-- ====================================================================

-- 1. Fungsi Kompatibilitas GETDATE() untuk PostgreSQL
CREATE OR REPLACE FUNCTION GETDATE() RETURNS timestamp AS $$
BEGIN
    RETURN CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 2. Tabel Pengguna (ppi_users)
CREATE TABLE IF NOT EXISTS ppi_users (
    id                    SERIAL PRIMARY KEY,
    username              VARCHAR(100) UNIQUE NOT NULL,
    password              VARCHAR(64)  NOT NULL,
    full_name             VARCHAR(200) NOT NULL DEFAULT '',
    nik                   VARCHAR(50)  NOT NULL DEFAULT '',
    role                  VARCHAR(20)  NOT NULL DEFAULT 'USER',
    is_active             INT          NOT NULL DEFAULT 1,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    launch_co             INT          NOT NULL DEFAULT 0,
    up                    INT          NOT NULL DEFAULT 0,
    pole                  INT          NOT NULL DEFAULT 0,
    msc_adm               INT          NOT NULL DEFAULT 0,
    iq                    INT          NOT NULL DEFAULT 0,
    up_filling_spv        INT          NOT NULL DEFAULT 0,
    up_filling_manager    INT          NOT NULL DEFAULT 0,
    packaging_pole        INT          NOT NULL DEFAULT 0,
    qa_lab                INT          NOT NULL DEFAULT 0,
    lihat_im              INT          NOT NULL DEFAULT 0,
    histori_pengisian     INT          NOT NULL DEFAULT 0,
    settings              INT          NOT NULL DEFAULT 0,
    input_spec_code       INT          NOT NULL DEFAULT 0,
    spec_code_pdf         INT          NOT NULL DEFAULT 0,
    is_locked             INT          NOT NULL DEFAULT 0,
    failed_login_count    INT          NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP    NULL,
    last_failed_login     TIMESTAMP    NULL,
    last_login            TIMESTAMP    NULL,
    force_password_change INT          NOT NULL DEFAULT 0,
    last_modified_by      VARCHAR(100) NULL,
    last_modified_date    TIMESTAMP    NULL,
    email                 VARCHAR(200) NULL,
    created_by            VARCHAR(100) NULL
);

-- 3. Tabel Dokumen IM (ppi_im_documents)
CREATE TABLE IF NOT EXISTS ppi_im_documents (
    id              SERIAL PRIMARY KEY,
    im_code         VARCHAR(50)   NOT NULL,
    uuid            VARCHAR(50)   UNIQUE NULL,
    description     VARCHAR(1000) NULL,
    kode_sf         VARCHAR(50)   NULL,
    no_fla          TEXT          NULL,
    tgl_issue       VARCHAR(20)   NULL,
    alasan_revisi   VARCHAR(1000) NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'Draft',
    jenis_line      VARCHAR(100)  NULL,
    dept_set        VARCHAR(100)  NULL,
    created_by      VARCHAR(100)  NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_by       VARCHAR(100)  NULL,
    locked_at       TIMESTAMP     NULL,
    deleted_at      TIMESTAMP     NULL,
    pdf_blob        BYTEA         NULL,
    pdf_filename    VARCHAR(500)  NULL,
    source_type     VARCHAR(20)   NOT NULL DEFAULT 'Digital'
);

-- Filtered Unique Index untuk im_code (hanya berlaku pada dokumen yang belum dihapus / deleted_at IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppi_im_documents_im_code_active 
ON ppi_im_documents(im_code) 
WHERE deleted_at IS NULL;

-- 4. Tabel Data Divisi (ppi_im_division_data)
CREATE TABLE IF NOT EXISTS ppi_im_division_data (
    id              SERIAL PRIMARY KEY,
    im_id           INT          NOT NULL REFERENCES ppi_im_documents(id) ON DELETE CASCADE,
    division        VARCHAR(50)  NOT NULL,
    data_json       TEXT         NULL,
    image_data      BYTEA        NULL,
    submitted_by    INT          NULL REFERENCES ppi_users(id),
    submitted_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ppi_im_division UNIQUE(im_id, division)
);

-- 5. Tabel Kunci Dokumen (ppi_im_locks)
CREATE TABLE IF NOT EXISTS ppi_im_locks (
    im_code     VARCHAR(50)  NOT NULL,
    division    VARCHAR(50)  NOT NULL,
    locked_by   VARCHAR(100) NULL,
    locked_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (im_code, division)
);

-- 6. Tabel Master Spec Code (ppi_spec_code_masters)
CREATE TABLE IF NOT EXISTS ppi_spec_code_masters (
    id                SERIAL PRIMARY KEY,
    spec_code         VARCHAR(100) UNIQUE NOT NULL,
    spec_name         VARCHAR(200) NULL,
    fg_codes          TEXT         NULL,
    a6_data_json      TEXT         NULL,
    a7_data_json      TEXT         NULL,
    pallet_pdf_name   VARCHAR(255) NULL,
    pallet_pdf_data   TEXT         NULL,
    fg_spec_pdf_name  VARCHAR(255) NULL,
    fg_spec_pdf_data  TEXT         NULL,
    created_by        VARCHAR(100) NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Pejabat Penanda Tangan (ppi_assignees) [Legacy compatibility]
CREATE TABLE IF NOT EXISTS ppi_assignees (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    division         VARCHAR(100) NOT NULL,
    signature_image  BYTEA        NULL,
    password         VARCHAR(100) NULL
);

-- 8. Tabel Log Otentikasi (ppi_auth_log)
CREATE TABLE IF NOT EXISTS ppi_auth_log (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(200) NULL,
    user_id     INT          NULL REFERENCES ppi_users(id),
    status      VARCHAR(50)  NULL,
    detail      VARCHAR(500) NULL,
    logged_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Log Audit Keamanan (ppi_security_audit_log)
CREATE TABLE IF NOT EXISTS ppi_security_audit_log (
    id              SERIAL PRIMARY KEY,
    action          VARCHAR(100) NULL,
    administrator   VARCHAR(100) NULL,
    target_username VARCHAR(100) NULL,
    computer_name   VARCHAR(100) NULL,
    reason          VARCHAR(500) NULL,
    logged_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabel Log Audit Dokumen IM (ppi_im_audit_log) [Audit Trail]
CREATE TABLE IF NOT EXISTS ppi_im_audit_log (
    id              SERIAL PRIMARY KEY,
    im_id           INT          NULL REFERENCES ppi_im_documents(id) ON DELETE CASCADE,
    user_id         INT          NULL REFERENCES ppi_users(id),
    action          VARCHAR(100) NULL,
    detail          TEXT         NULL,
    logged_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 11. INDEX PERFORMA (Optimasi Query Pencarian Dokumen & Relasi)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_ppi_im_documents_status ON ppi_im_documents(status);
CREATE INDEX IF NOT EXISTS idx_ppi_im_documents_created_at ON ppi_im_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ppi_im_division_data_im_id ON ppi_im_division_data(im_id);
CREATE INDEX IF NOT EXISTS idx_ppi_auth_log_user_id ON ppi_auth_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ppi_im_audit_log_im_id ON ppi_im_audit_log(im_id);

-- ====================================================================
-- 12. Seed Akun Default Administrator (Password: 'admin' di-hash SHA-256)
-- ====================================================================
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
ON CONFLICT (username) DO NOTHING;

