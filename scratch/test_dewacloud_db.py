import psycopg2

print("TESTING CONNECTION TO DEWA CLOUD POSTGRESQL...")
try:
    conn = psycopg2.connect("host=node79737-sms-yasulor.user.cloudjkt01.com port=5432 dbname=sms_database user=webadmin password=KrKUiDqUuP connect_timeout=10")
    print("SUCCESSFULLY CONNECTED TO DEWA CLOUD DB!")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print("PostgreSQL Version:", cur.fetchone())
    cur.close()
    conn.close()
except Exception as e:
    print("CONNECTION ERROR:", e)
