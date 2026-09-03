import psycopg2

conn = psycopg2.connect("host=localhost port=5432 dbname=sms_database user=postgres password=Cikarang2026")
cur = conn.cursor()
cur.execute("SELECT id, username, role, can_spareparts_catalog, can_barang_masuk, can_barang_keluar, can_transaction_logs FROM \"Users\";")
rows = cur.fetchall()
print("USERS IN DATABASE:")
for r in rows:
    print(r)
