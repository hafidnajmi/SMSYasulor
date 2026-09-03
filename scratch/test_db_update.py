import psycopg2

conn = psycopg2.connect("host=localhost port=5432 dbname=sms_database user=postgres password=Cikarang2026")
cur = conn.cursor()

print("UPDATING USER HAFID (ID 2)...")
cur.execute("""
    UPDATE "Users" 
    SET can_spareparts_catalog=1, can_barang_masuk=1, can_barang_keluar=1, can_transaction_logs=1, can_admin_portal=0, can_settings_users=0, can_master_supplier=1, can_cost_intelligence=1, can_master_machine=1, can_line_compatibility=1, can_email_settings=0, require_approval_keluar=false
    WHERE id = 2;
""")
conn.commit()

cur.execute('SELECT * FROM "Users" WHERE id = 2;')
print("UPDATED HAFID:", cur.fetchone())

cur.close()
conn.close()
