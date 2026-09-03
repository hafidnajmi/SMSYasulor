import sys
import os

root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import Database

db = Database()
if db.sql_conn:
    with db.sql_conn.cursor() as cur:
        cur.execute("DELETE FROM dbo.Supplier WHERE name LIKE ?", ('TEST_%',))
        db.sql_conn.commit()
    print("Database cleaned successfully.")
