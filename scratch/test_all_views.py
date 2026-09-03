import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()

print("1. Testing get_master_data()...")
master = db.get_master_data(limit=5)
print(f"   [OK] Total master data fetched: {len(master)}")

print("2. Testing Line Compatibility queries...")
mapping = db.get_sparepart_machine_mapping()
print(f"   [OK] Total mappings fetched: {len(mapping)}")

print("3. Testing electrical parts...")
elec = db.get_electrical_parts(limit=5)
print(f"   [OK] Total electrical parts fetched: {len(elec)}")

print("4. Testing barang masuk data...")
bm = db.get_barang_masuk()
print(f"   [OK] Total barang masuk fetched: {len(bm)}")

print("5. Testing barang keluar data...")
bk = db.get_barang_keluar()
print(f"   [OK] Total barang keluar fetched: {len(bk)}")

print("\n=== SEMUA KONEKSI & MENU DATABASE BERHASIL DIRELOAD 100%! ===")
