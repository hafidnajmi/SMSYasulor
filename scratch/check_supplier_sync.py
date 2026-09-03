import psycopg2

def check_supplier_connection():
    conn = psycopg2.connect("host=localhost port=5432 dbname=sms_database user=postgres password=Cikarang2026")
    cur = conn.cursor()
    
    # 1. Fetch registered suppliers from Supplier master table
    cur.execute('SELECT DISTINCT LOWER(TRIM(name)), name FROM "Supplier";')
    registered_suppliers = dict(cur.fetchall())
    print(f"Total Registered Master Suppliers: {len(registered_suppliers)}")
    print("Registered Supplier List:")
    for name in sorted(registered_suppliers.values()):
        print(f"  - {name}")
        
    print("\n--------------------------------------------------")
    
    # 2. Check Master_Data brand values
    cur.execute('SELECT DISTINCT TRIM(brand) FROM "Master_Data" WHERE brand IS NOT NULL AND TRIM(brand) <> \'\' AND TRIM(brand) <> \'-\';')
    master_brands = [r[0] for r in cur.fetchall()]
    print(f"\nUnique Brands/Suppliers in Master_Data: {len(master_brands)}")
    
    unregistered_master = []
    for b in master_brands:
        if b.lower() not in registered_suppliers:
            unregistered_master.append(b)
            
    if unregistered_master:
        print(f"⚠️ FOUND {len(unregistered_master)} Brands in Master_Data NOT yet in Supplier Master Table:")
        for u in unregistered_master:
            print(f"  ❌ '{u}'")
    else:
        print("✅ ALL Brands in Master_Data match registered Suppliers!")

    # 3. Check Supplier_Offer supplier_name values
    cur.execute('SELECT DISTINCT TRIM(supplier_name) FROM "Supplier_Offer" WHERE supplier_name IS NOT NULL AND TRIM(supplier_name) <> \'\' AND TRIM(supplier_name) <> \'-\';')
    offer_suppliers = [r[0] for r in cur.fetchall()]
    print(f"\nUnique Suppliers in Supplier_Offer: {len(offer_suppliers)}")
    
    unregistered_offers = []
    for s in offer_suppliers:
        if s.lower() not in registered_suppliers:
            unregistered_offers.append(s)
            
    if unregistered_offers:
        print(f"⚠️ FOUND {len(unregistered_offers)} Suppliers in Supplier_Offer NOT yet in Supplier Master Table:")
        for u in unregistered_offers:
            print(f"  ❌ '{u}'")
    else:
        print("✅ ALL Suppliers in Supplier_Offer match registered Suppliers!")

    # 4. Check Barang_Masuk supplier values
    cur.execute('SELECT DISTINCT TRIM(supplier) FROM "Barang_Masuk" WHERE supplier IS NOT NULL AND TRIM(supplier) <> \'\' AND TRIM(supplier) <> \'-\';')
    masuk_suppliers = [r[0] for r in cur.fetchall()]
    print(f"\nUnique Suppliers in Barang_Masuk: {len(masuk_suppliers)}")
    
    unregistered_masuk = []
    for m in masuk_suppliers:
        if m.lower() not in registered_suppliers:
            unregistered_masuk.append(m)
            
    if unregistered_masuk:
        print(f"⚠️ FOUND {len(unregistered_masuk)} Suppliers in Barang_Masuk NOT yet in Supplier Master Table:")
        for u in unregistered_masuk:
            print(f"  ❌ '{u}'")
    else:
        print("✅ ALL Suppliers in Barang_Masuk match registered Suppliers!")

    conn.close()

if __name__ == "__main__":
    check_supplier_connection()
