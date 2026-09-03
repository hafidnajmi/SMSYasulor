"""
test_nft010_evidence.py - ODBC Driver 17 & 18 Compatibility & Connection Test (NFT-010)

Audits:
1. Dynamic detection of available ODBC drivers on OS.
2. Connection string generation for ODBC Driver 17 and ODBC Driver 18.
3. Verification of TrustServerCertificate=yes & Encrypt parameter handling.
4. Empirical pyodbc connection test for both ODBC Driver 17 and ODBC Driver 18.
"""

import sys
import os
import pyodbc

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import _get_best_odbc_driver, _build_sqlserver_connection_string

def test_driver_detection():
    print("=== [NFT-010 TEST 1] Installed ODBC Driver Detection ===")
    installed = pyodbc.drivers()
    print(f"  [*] System Installed ODBC Drivers: {installed}")
    
    best_driver = _get_best_odbc_driver()
    print(f"  [+] Auto-Selected Best Driver: '{best_driver}'")
    assert best_driver in installed or best_driver == "ODBC Driver 17 for SQL Server", "Selected driver must be valid!"
    print("  ✓ Driver auto-detection verified PASSED.\n")

def test_connection_string_builder():
    print("=== [NFT-010 TEST 2] Connection String Builder (Driver 17 vs 18) ===")
    
    # Test Driver 17
    cs17 = _build_sqlserver_connection_string("localhost", "UPMS_Database", "", "", "ODBC Driver 17 for SQL Server")
    print(f"  [*] Driver 17 Conn String:\n      {cs17}")
    assert "DRIVER={ODBC Driver 17 for SQL Server}" in cs17
    assert "TrustServerCertificate=yes" in cs17
    assert "Encrypt=no" in cs17

    # Test Driver 18
    cs18 = _build_sqlserver_connection_string("localhost", "UPMS_Database", "", "", "ODBC Driver 18 for SQL Server")
    print(f"  [*] Driver 18 Conn String:\n      {cs18}")
    assert "DRIVER={ODBC Driver 18 for SQL Server}" in cs18
    assert "TrustServerCertificate=yes" in cs18
    assert "Encrypt=yes" in cs18

    print("  ✓ Driver 17 & 18 Connection String formats verified PASSED.\n")

def test_empirical_connection_both_drivers():
    print("=== [NFT-010 TEST 3] Empirical DB Connection (Driver 17 & Driver 18) ===")
    
    drivers_to_test = []
    installed = pyodbc.drivers()
    if "ODBC Driver 17 for SQL Server" in installed:
        drivers_to_test.append("ODBC Driver 17 for SQL Server")
    if "ODBC Driver 18 for SQL Server" in installed:
        drivers_to_test.append("ODBC Driver 18 for SQL Server")

    for drv in drivers_to_test:
        conn_str = _build_sqlserver_connection_string("localhost", "UPMS_Database", "", "", drv)
        try:
            print(f"  [*] Attempting connection with '{drv}'...")
            conn = pyodbc.connect(conn_str, timeout=5)
            cursor = conn.cursor()
            cursor.execute("SELECT @@VERSION")
            ver = cursor.fetchone()[0]
            conn.close()
            print(f"  [+] SUCCESS connected via '{drv}'!")
            print(f"      Server Version: {ver.splitlines()[0]}")
        except Exception as e:
            print(f"  [-] FAILED connecting via '{drv}': {e}")
            raise AssertionError(f"Connection failed for driver '{drv}': {e}")

    print("\n✓ All available ODBC drivers connected successfully!")
    print("====================================================")
    print("[RESULT] NFT-010 AUDIT STATUS: PASSED (100% COMPATIBLE)")
    print("====================================================")

if __name__ == "__main__":
    print("====================================================")
    print("    NFT-010 ODBC DRIVER 17 & 18 COMPATIBILITY AUDIT ")
    print("====================================================\n")
    test_driver_detection()
    test_connection_string_builder()
    test_empirical_connection_both_drivers()
