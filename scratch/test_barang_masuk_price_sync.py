import psycopg2

DB_URI = "Host=localhost;Port=5432;Database=sms_database;Username=postgres;Password=Cikarang2026"

def verify_sync():
    conn = psycopg2.connect("host=localhost port=5432 dbname=sms_database user=postgres password=Cikarang2026")
    cur = conn.cursor()
    
    cur.execute('SELECT id, master_data_id, supplier_name, old_price, new_price, reason, effective_date FROM "SPAREPART_PRICE_HISTORY" ORDER BY id DESC LIMIT 5;')
    histories = cur.fetchall()
    
    print("--- 📜 RECENT PRICE HISTORIES IN DATABASE ---")
    for h in histories:
        print(f"ID: {h[0]} | Part: {h[1]} | Supplier: {h[2]} | Old: Rp {h[3]:,.0f} -> New: Rp {h[4]:,.0f} | Reason: {h[5]} | Date: {h[6]}")
        
    cur.execute('SELECT id, master_data_id, supplier_name, price, updated_at FROM "Supplier_Offer" ORDER BY id DESC LIMIT 5;')
    offers = cur.fetchall()
    
    print("\n--- 🏢 RECENT SUPPLIER OFFERS IN DATABASE ---")
    for o in offers:
        print(f"ID: {o[0]} | Part: {o[1]} | Supplier: {o[2]} | Price: Rp {o[3]:,.0f} | UpdatedAt: {o[4]}")
        
    conn.close()

if __name__ == "__main__":
    verify_sync()
