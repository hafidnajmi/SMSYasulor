import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
if db.sql_conn:
    cur = db.sql_conn.cursor()
    cur.execute("SELECT id, username, role, can_electrical_parts FROM dbo.Users")
    rows = cur.fetchall()
    print("USERS IN DB:", rows)

    # Ensure all technician users have can_electrical_parts = 1
    cur.execute("UPDATE dbo.Users SET can_electrical_parts = 1 WHERE role = 'technician'")
    db.sql_conn.commit()
    print("Updated can_electrical_parts = 1 for all technician users.")
