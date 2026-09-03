import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()
cur.execute("UPDATE dbo.Master_Data SET current_stock = 0 WHERE id IN ('UPF-12984', 'UPF-12985', 'UPF-12986') AND current_stock IS NULL")
db.sql_conn.commit()
print("NULL STOCKS UPDATED TO 0")
