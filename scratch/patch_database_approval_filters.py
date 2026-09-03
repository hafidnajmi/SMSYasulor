import re

def main():
    with open('database.py', 'r', encoding='utf-8') as f:
        content = f.read()

    # Define exact replacements
    replacements = [
        # 1. get_barang_keluar
        (
            """            SELECT bk.*, m.machine_code, m.machine_name 
            FROM dbo.Barang_Keluar bk
            LEFT JOIN dbo.Machine_Master m ON bk.machine_id = m.id
            WHERE 1=1""",
            """            SELECT bk.*, m.machine_code, m.machine_name 
            FROM dbo.Barang_Keluar bk
            LEFT JOIN dbo.Machine_Master m ON bk.machine_id = m.id
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        ),
        # 2. get_machine_operational_stats
        (
            """                FROM dbo.Barang_Keluar
                WHERE machine_id = ?""",
            """                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved')"""
        ),
        (
            """                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND maintenance_type IS NOT NULL AND maintenance_type <> ''""",
            """                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved') AND maintenance_type IS NOT NULL AND maintenance_type <> ''"""
        ),
        # 3. get_inventory_intelligence_stats
        (
            """ISNULL((SELECT SUM(Total_Cost) FROM dbo.Barang_Keluar WHERE master_data_id = Master_Data.id AND tanggal >= DATEADD(day, -365, GETDATE())), 0) as annual_consumption""",
            """ISNULL((SELECT SUM(Total_Cost) FROM dbo.Barang_Keluar WHERE master_data_id = Master_Data.id AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())), 0) as annual_consumption"""
        ),
        (
            """ISNULL((SELECT COUNT(*) FROM dbo.Barang_Keluar WHERE master_data_id = Master_Data.id AND tanggal >= DATEADD(day, -365, GETDATE())), 0) as annual_tx_count""",
            """ISNULL((SELECT COUNT(*) FROM dbo.Barang_Keluar WHERE master_data_id = Master_Data.id AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())), 0) as annual_tx_count"""
        ),
        # 4. get_executive_dashboard_stats
        (
            """cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE CAST(tanggal AS DATE) = CAST(GETDATE() AS DATE)")""",
            """cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE (approval_status IS NULL OR approval_status = 'approved') AND CAST(tanggal AS DATE) = CAST(GETDATE() AS DATE)")"""
        ),
        (
            """                SELECT TOP 1 line, SUM(Total_Cost) as cost
                FROM dbo.Barang_Keluar
                WHERE line IS NOT NULL AND line <> '' {filter_sql}""",
            """                SELECT TOP 1 line, SUM(Total_Cost) as cost
                FROM dbo.Barang_Keluar
                WHERE line IS NOT NULL AND line <> '' AND (approval_status IS NULL OR approval_status = 'approved') {filter_sql}"""
        ),
        (
            """                SELECT TOP 1 m.machine_name, SUM(bk.Total_Cost) as cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master m ON bk.machine_id = m.id
                WHERE 1=1 {bk_filter_sql}""",
            """                SELECT TOP 1 m.machine_name, SUM(bk.Total_Cost) as cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master m ON bk.machine_id = m.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved') {bk_filter_sql}"""
        ),
        (
            """                SELECT TOP 1 item_name, SUM(Total_Cost) as cost
                FROM dbo.Barang_Keluar
                WHERE 1=1 {filter_sql}""",
            """                SELECT TOP 1 item_name, SUM(Total_Cost) as cost
                FROM dbo.Barang_Keluar
                WHERE (approval_status IS NULL OR approval_status = 'approved') {filter_sql}"""
        ),
        # 5. get_total_outgoing_cost
        (
            """query = "SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE 1=1\"""",
            """query = "SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE (approval_status IS NULL OR approval_status = 'approved')\""""
        ),
        # 6. get_sparepart_usage_analytics
        (
            """                FROM dbo.Barang_Keluar
                WHERE master_data_id = ? AND tanggal >= DATEADD(day, -365, GETDATE())""",
            """                FROM dbo.Barang_Keluar
                WHERE master_data_id = ? AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())"""
        ),
        (
            """cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE tanggal >= DATEADD(day, -365, GETDATE())")""",
            """cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())")"""
        ),
        (
            """cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE master_data_id = ? AND tanggal >= DATEADD(day, -365, GETDATE())", (sparepart_id,))""",
            """cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE master_data_id = ? AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())", (sparepart_id,))"""
        ),
        # 7. get_dashboard_recent_activity
        (
            """                    FROM dbo.Barang_Keluar
                    WHERE created_at IS NOT NULL {year_filter_bk}""",
            """                    FROM dbo.Barang_Keluar
                    WHERE created_at IS NOT NULL AND (approval_status IS NULL OR approval_status = 'approved') {year_filter_bk}"""
        ),
        # 8. get_transaction_summary
        (
            """                cursor.execute(\"\"\"
                    SELECT COUNT(*)
                    FROM dbo.Barang_Keluar
                    WHERE MONTH(created_at) = MONTH(GETDATE())
                      AND YEAR(created_at) = YEAR(GETDATE())
                \"\"\")""",
            """                cursor.execute(\"\"\"
                    SELECT COUNT(*)
                    FROM dbo.Barang_Keluar
                    WHERE (approval_status IS NULL OR approval_status = 'approved')
                      AND MONTH(created_at) = MONTH(GETDATE())
                      AND YEAR(created_at) = YEAR(GETDATE())
                \"\"\")"""
        ),
        # 9. get_cost_per_line
        (
            """            FROM dbo.Barang_Keluar bk
            WHERE 1=1""",
            """            FROM dbo.Barang_Keluar bk
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        ),
        # 10. get_cost_per_machine
        (
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.Machine_Master m ON bk.machine_id = m.id
            WHERE 1=1""",
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.Machine_Master m ON bk.machine_id = m.id
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        ),
        # 11. get_cost_detail_by_line
        (
            """            FROM dbo.Barang_Keluar bk
            WHERE bk.line = ?""",
            """            FROM dbo.Barang_Keluar bk
            WHERE bk.line = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        ),
        # 12. get_cost_detail_by_machine
        (
            """            FROM dbo.Barang_Keluar bk
            WHERE bk.machine_id = ?""",
            """            FROM dbo.Barang_Keluar bk
            WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        ),
        # 13. get_line_intelligence_stats
        (
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
            WHERE ml.line_id = ? AND ml.is_active = 1
              AND MONTH(bk.tanggal) = MONTH(GETDATE()) 
              AND YEAR(bk.tanggal) = YEAR(GETDATE())""",
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
            WHERE ml.line_id = ? AND ml.is_active = 1
              AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
              AND MONTH(bk.tanggal) = MONTH(GETDATE()) 
              AND YEAR(bk.tanggal) = YEAR(GETDATE())"""
        ),
        # 14. get_line_compatible_parts
        (
            """                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                JOIN dbo.machine_line ml ON mm.id = ml.machine_id
                WHERE bk.master_data_id = ? AND ml.line_id = ? AND ml.is_active = 1""",
            """                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                JOIN dbo.machine_line ml ON mm.id = ml.machine_id
                WHERE bk.master_data_id = ? AND ml.line_id = ? AND ml.is_active = 1 AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        ),
        (
            """                FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE bk.master_data_id = ? AND ml.line_id = ? AND ml.is_active = 1
                  AND MONTH(bk.tanggal) = MONTH(GETDATE()) AND YEAR(bk.tanggal) = YEAR(GETDATE())""",
            """                FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE bk.master_data_id = ? AND ml.line_id = ? AND ml.is_active = 1
                  AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                  AND MONTH(bk.tanggal) = MONTH(GETDATE()) AND YEAR(bk.tanggal) = YEAR(GETDATE())"""
        ),
        # 15. get_line_usage_summary
        (
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            GROUP BY md.id, md.bin, md.item""",
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            GROUP BY md.id, md.bin, md.item"""
        ),
        # 16. get_production_line_health_explorer
        (
            """                FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE ml.line_id = ? AND ml.is_active = 1
                  AND MONTH(bk.tanggal) = MONTH(GETDATE()) 
                  AND YEAR(bk.tanggal) = YEAR(GETDATE())""",
            """                FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE ml.line_id = ? AND ml.is_active = 1
                  AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                  AND MONTH(bk.tanggal) = MONTH(GETDATE()) 
                  AND YEAR(bk.tanggal) = YEAR(GETDATE())"""
        ),
        (
            """                SELECT MAX(tanggal) FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE ml.line_id = ? AND ml.is_active = 1""",
            """                SELECT MAX(tanggal) FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE ml.line_id = ? AND ml.is_active = 1 AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        ),
        # 17. get_machine_overview_stats
        (
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            WHERE bk.machine_id = ?
            GROUP BY md.item""",
            """            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            GROUP BY md.item"""
        ),
        # 18. get_compatibility_statistics
        (
            """            # 10. Most Used Spareparts
            cur.execute(\"\"\"
                SELECT TOP 5 md.bin, md.item, COUNT(*) as usage_count
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                GROUP BY md.bin, md.item
                ORDER BY usage_count DESC
            \"\"\")""",
            """            # 10. Most Used Spareparts
            cur.execute(\"\"\"
                SELECT TOP 5 md.bin, md.item, COUNT(*) as usage_count
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                GROUP BY md.bin, md.item
                ORDER BY usage_count DESC
            \"\"\")"""
        ),
        (
            """            # 11. Most Used Machines
            cur.execute(\"\"\"
                SELECT TOP 5 mm.machine_code, mm.machine_name, COUNT(*) as usage_count
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                GROUP BY mm.machine_code, mm.machine_name
                ORDER BY usage_count DESC
            \"\"\")""",
            """            # 11. Most Used Machines
            cur.execute(\"\"\"
                SELECT TOP 5 mm.machine_code, mm.machine_name, COUNT(*) as usage_count
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                GROUP BY mm.machine_code, mm.machine_name
                ORDER BY usage_count DESC
            \"\"\")"""
        ),
        (
            """            # 12. Highest Monthly Cost (Per Machine)
            cur.execute(\"\"\"
                SELECT TOP 5 mm.machine_code, mm.machine_name, SUM(ISNULL(bk.Total_Cost, bk.qty * ISNULL(bk.Unit_Price, 0))) as total_cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                WHERE MONTH(bk.tanggal) = MONTH(GETDATE()) AND YEAR(bk.tanggal) = YEAR(GETDATE())
                GROUP BY mm.machine_code, mm.machine_name
                ORDER BY total_cost DESC
            \"\"\")""",
            """            # 12. Highest Monthly Cost (Per Machine)
            cur.execute(\"\"\"
                SELECT TOP 5 mm.machine_code, mm.machine_name, SUM(ISNULL(bk.Total_Cost, bk.qty * ISNULL(bk.Unit_Price, 0))) as total_cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved') AND MONTH(bk.tanggal) = MONTH(GETDATE()) AND YEAR(bk.tanggal) = YEAR(GETDATE())
                GROUP BY mm.machine_code, mm.machine_name
                ORDER BY total_cost DESC
            \"\"\")"""
        ),
        # 19. get_machine_installed_spareparts
        (
            """                FROM dbo.Barang_Keluar
                WHERE machine_id = ?
                  AND MONTH(tanggal) = MONTH(GETDATE())
                  AND YEAR(tanggal) = YEAR(GETDATE())
                GROUP BY master_data_id""",
            """                FROM dbo.Barang_Keluar
                WHERE machine_id = ?
                  AND (approval_status IS NULL OR approval_status = 'approved')
                  AND MONTH(tanggal) = MONTH(GETDATE())
                  AND YEAR(tanggal) = YEAR(GETDATE())
                GROUP BY master_data_id"""
        ),
        (
            """                SELECT master_data_id, MAX(tanggal) AS last_date
                FROM dbo.Barang_Keluar
                WHERE machine_id = ?
                GROUP BY master_data_id""",
            """                SELECT master_data_id, MAX(tanggal) AS last_date
                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved')
                GROUP BY master_data_id"""
        ),
        # 20. get_machine_replacement_history
        (
            """                FROM dbo.Barang_Keluar bk
                LEFT JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE bk.machine_id = ?
                ORDER BY bk.tanggal DESC""",
            """                FROM dbo.Barang_Keluar bk
                LEFT JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                ORDER BY bk.tanggal DESC"""
        ),
        # 21. get_machine_usage_analysis
        (
            """                FROM dbo.Barang_Keluar bk
                LEFT JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE bk.machine_id = ?""",
            """                FROM dbo.Barang_Keluar bk
                LEFT JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')"""
        )
    ]

    patched_count = 0
    for target, replacement in replacements:
        if target in content:
            content = content.replace(target, replacement)
            patched_count += 1
        else:
            print(f"WARNING: target snippet not found:\n{repr(target[:60])}...")

    with open('database.py', 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"SUCCESS: Patched {patched_count} / {len(replacements)} queries in database.py")

if __name__ == '__main__':
    main()
