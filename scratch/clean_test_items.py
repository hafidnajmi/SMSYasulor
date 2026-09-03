from database import Database

db = Database()
cur = db._cursor()
cur.execute("""
    DELETE FROM dbo.Master_Data 
    WHERE item IN ('TEST BEARING', 'TST ITEM') 
       OR bin IN ('TST-777', 'TST-2791')
""")
count = cur.rowcount
db.sql_conn.commit()
print(f"Successfully deleted {count} duplicate test records.")
