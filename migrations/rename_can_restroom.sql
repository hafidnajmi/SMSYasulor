-- Migration: Rename can_restroom -> can_electrical_parts + sparepart_asset -> electrical_parts
-- Run this ONCE against your existing SQL Server database

-- 1. Rename column
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'can_restroom')
BEGIN
    EXEC sp_rename 'dbo.Users.can_restroom', 'can_electrical_parts', 'COLUMN';
    PRINT '[OK] Column can_restroom renamed to can_electrical_parts';
END
ELSE
BEGIN
    PRINT '[SKIP] Column can_restroom not found (already renamed?)';
END

-- 2. Rename table
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.sparepart_asset') AND type = 'U')
BEGIN
    EXEC sp_rename 'dbo.sparepart_asset', 'electrical_parts';
    PRINT '[OK] Table sparepart_asset renamed to electrical_parts';
END
ELSE
BEGIN
    PRINT '[SKIP] Table sparepart_asset not found (already renamed?)';
END

-- 3. Rename sequence
IF EXISTS (SELECT 1 FROM sys.objects WHERE name = 'seq_upf_sparepart_asset' AND type = 'SO')
BEGIN
    EXEC sp_rename 'seq_upf_sparepart_asset', 'seq_upf_electrical_parts';
    PRINT '[OK] Sequence seq_upf_sparepart_asset renamed to seq_upf_electrical_parts';
END
ELSE
BEGIN
    PRINT '[SKIP] Sequence seq_upf_sparepart_asset not found (already renamed?)';
END
