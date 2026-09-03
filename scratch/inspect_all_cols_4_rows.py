import pandas as pd
df = pd.read_excel("Master_Data_20260818.xlsx")
id_col = [c for c in df.columns if "id" in str(c).lower() or "part" in str(c).lower()][0]
target_ids = ["UPF-12984", "UPF-12985", "UPF-12986", "UPF-12997"]
sub = df[df[id_col].astype(str).str.strip().isin(target_ids)]

print("ALL COLUMNS AND VALUES IN EXCEL FOR THE 4 ROWS:")
for idx, r in sub.iterrows():
    p_id = r[id_col]
    print(f"\n=== {p_id} ===")
    for k, v in r.items():
        print(f"  {k:<25}: {v}")
