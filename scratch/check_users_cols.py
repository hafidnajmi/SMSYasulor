import psycopg2

conn = psycopg2.connect("host=localhost port=5432 dbname=sms_database user=postgres password=Cikarang2026")
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE lower(table_name) = 'users' ORDER BY ordinal_position;")
cols = [r[0] for r in cur.fetchall()]
print("POSTGRES USERS TABLE COLUMNS IN sms_database:")
for c in cols:
    print(" -", c)
