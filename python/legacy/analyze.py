import pandas as pd

df = pd.read_csv("bvmt_market_data.csv")

# Filter only stocks that actually traded (Quantité > 0) and have a variation
active = df[(df["Quantité"] > 0) & (df["Variation %"] != 0)].copy()

print("=" * 70)
print("  BVMT - TOP 5 HAUSSES (Biggest Gainers)")
print("=" * 70)
top_hausse = active.nlargest(5, "Variation %")
for i, (_, row) in enumerate(top_hausse.iterrows(), 1):
    print(f"  {i}. {row['Valeur']:<25} {row['Variation %']:>+7.2f}%   "
          f"Dernier: {row['Dernier']:>8.2f}   Réf: {row['Cours de référence']:>8.2f}   "
          f"Vol: {int(row['Quantité']):>8,}")
print()

print("=" * 70)
print("  BVMT - TOP 5 BAISSES (Biggest Losers)")
print("=" * 70)
top_baisse = active.nsmallest(5, "Variation %")
for i, (_, row) in enumerate(top_baisse.iterrows(), 1):
    print(f"  {i}. {row['Valeur']:<25} {row['Variation %']:>+7.2f}%   "
          f"Dernier: {row['Dernier']:>8.2f}   Réf: {row['Cours de référence']:>8.2f}   "
          f"Vol: {int(row['Quantité']):>8,}")
print()

# Summary stats
print("=" * 70)
print("  RÉSUMÉ DU MARCHÉ")
print("=" * 70)
hausse_count = len(df[df["Variation %"] > 0])
baisse_count = len(df[df["Variation %"] < 0])
inchange_count = len(df[df["Variation %"] == 0])
active_count = len(df[df["Quantité"] > 0])
print(f"  Hausses: {hausse_count}   |   Baisses: {baisse_count}   |   Inchangés: {inchange_count}")
print(f"  Valeurs actives: {active_count} / {len(df)}")
print(f"  Volume total: {int(df['Capitalisation'].sum()):,} DT")
print()

# Save results to CSV
results = pd.concat([
    top_hausse[["Valeur", "Ticker", "Groupe", "Cours de référence", "Dernier", "Variation %", "Quantité", "Capitalisation"]].assign(Type="HAUSSE"),
    top_baisse[["Valeur", "Ticker", "Groupe", "Cours de référence", "Dernier", "Variation %", "Quantité", "Capitalisation"]].assign(Type="BAISSE"),
])
results.to_csv("bvmt_top5_hausse_baisse.csv", index=False, encoding="utf-8-sig")
print("Results saved to bvmt_top5_hausse_baisse.csv")
