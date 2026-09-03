import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()
cur.execute("UPDATE dbo.Master_Data SET is_deleted = 0, deleted_at = NULL WHERE id IN ('UPF-12984', 'UPF-12985', 'UPF-12986', 'UPF-12997')")
db.sql_conn.commit()
print("UN-DELETED ALL 4 ITEMS SUCCESSFULLY")
