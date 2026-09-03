import psycopg2

conn = psycopg2.connect("host=localhost port=5432 dbname=sms_database user=postgres password=Cikarang2026")
cur = conn.cursor()

# 1. Print full table columns and types
cur.execute("""
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE lower(table_name) = 'users'
    ORDER BY ordinal_position;
""")
print("=== USERS TABLE COLUMNS & TYPES ===")
for r in cur.fetchall():
    print(r)

# 2. Print all rows in Users table
cur.execute('SELECT * FROM "Users";')
colnames = [desc[0] for desc in cur.description]
rows = cur.fetchall()
print("\n=== ALL USERS DATA ===")
print("HEADERS:", colnames)
for row in rows:
    print(row)

cur.close()
conn.close()
