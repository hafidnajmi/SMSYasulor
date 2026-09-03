import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def profile():
    t0 = time.time()
    db = Database()
    print(f"[TIME] DB Init: {time.time() - t0:.3f} s")

    t1 = time.time()
    inv_data = db.get_inventory_summary()
    print(f"[TIME] get_inventory_summary: {time.time() - t1:.3f} s")

    t2 = time.time()
    exec_stats = db.get_executive_dashboard_stats()
    print(f"[TIME] get_executive_dashboard_stats: {time.time() - t2:.3f} s")

    t3 = time.time()
    initial_outgoing_cost = db.get_total_outgoing_cost("All", "All")
    print(f"[TIME] get_total_outgoing_cost: {time.time() - t3:.3f} s")

    t4 = time.time()
    compat_stats = db.get_compatibility_center_stats()
    print(f"[TIME] get_compatibility_center_stats: {time.time() - t4:.3f} s")

    t5 = time.time()
    recent_act = db.get_dashboard_recent_activity(limit=5)
    print(f"[TIME] get_dashboard_recent_activity: {time.time() - t5:.3f} s")

    t6 = time.time()
    low_stock = db.get_dashboard_low_stock_items(limit=5)
    print(f"[TIME] get_dashboard_low_stock_items: {time.time() - t6:.3f} s")

    t7 = time.time()
    master_kpis = db.get_master_data_kpi_summary()
    print(f"[TIME] get_master_data_kpi_summary: {time.time() - t7:.3f} s")

    t8 = time.time()
    elec_stats = db.get_electrical_stats()
    print(f"[TIME] get_electrical_stats: {time.time() - t8:.3f} s")

    print(f"[TIME] TOTAL FETCH TIME: {time.time() - t0:.3f} s")

if __name__ == "__main__":
    profile()
