"""
test_admin_permission_lock_evidence.py - Verification for Admin Permission Lock.
"""

import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import Database

def test_admin_lock():
    print("====================================================")
    print("      ADMIN PERMISSION LOCK VERIFICATION            ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    users = db.get_users()
    admin_user = next((u for u in users if str(u.get("username")).strip().lower() == "admin"), None)
    if not admin_user:
        admin_user = next((u for u in users if str(u.get("role")).strip().lower() == "admin"), None)

    print(f"[1] Retrieved Admin User: {admin_user.get('username')}, Role={admin_user.get('role')}")
    assert admin_user is not None, "Admin user not found"

    admin_id = admin_user.get("id")

    # Try updating admin permissions to 0 (revoking access)
    attempt_revoke = {
        "full_name": admin_user.get("full_name", "System Administrator"),
        "role": "admin",
        "can_master_data": 0,
        "can_admin_mgmt": 0,
        "can_settings": 0,
        "can_supplier_data": 0,
    }

    db.update_user(admin_id, attempt_revoke)

    # Re-fetch admin user from DB
    users_after = db.get_users()
    updated_admin = next(u for u in users_after if u.get("id") == admin_id)
    print(f"[2] After attempt to revoke permissions: can_master_data={updated_admin.get('can_master_data')}, can_settings={updated_admin.get('can_settings')}")

    assert updated_admin.get("can_master_data") == 1, "can_master_data must remain 1 for admin!"
    assert updated_admin.get("can_settings") == 1, "can_settings must remain 1 for admin!"
    assert updated_admin.get("can_admin_mgmt") == 1, "can_admin_mgmt must remain 1 for admin!"
    assert updated_admin.get("role") == "admin", "Role must remain admin!"

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Admin permissions are 100% locked & unchangeable!")
    print("====================================================")

if __name__ == "__main__":
    test_admin_lock()
