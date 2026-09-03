import pandas as pd
df = pd.read_excel("Master_Data_20260818.xlsx")
id_col = [c for c in df.columns if "id" in str(c).lower() or "part" in str(c).lower()][0]
target_ids = ["UPF-12984", "UPF-12985", "UPF-12986", "UPF-12997"]
sub = df[df[id_col].astype(str).str.strip().isin(target_ids)]
for idx, r in sub.iterrows():
    print(f"Row {idx}:")
    for k, v in r.items():
        if pd.notna(v):
            print(f"  {k}: {v}")
    print("-" * 40)
