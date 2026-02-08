import requests
import pandas as pd


def scrape_bvmt_market():
    """Scrape the market data table from bvmt.com.tn using the REST API"""

    url = "https://www.bvmt.com.tn/rest_api/rest/market/groups/11,12,52,95,99"
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.bvmt.com.tn/public/BvmtMarketStation/index.html",
    }

    print(f"Fetching market data from API...")
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    data = response.json()
    markets = data.get("markets", [])
    print(f"Received {len(markets)} market records.")

    if not markets:
        print("No market data found.")
        return None

    # Flatten the nested JSON into a clean table
    rows = []
    for m in markets:
        ref = m.get("referentiel", {})
        limit = m.get("limit", {})
        row = {
            "ISIN": m.get("isin", ""),
            "Valeur": ref.get("stockName", ""),
            "Ticker": ref.get("ticker", ""),
            "Groupe": ref.get("valGroup", ""),
            "Statut": m.get("status", ""),
            "Ord.A": limit.get("askOrd", ""),
            "Qté.A": limit.get("askQty", ""),
            "Achat": limit.get("ask", ""),
            "Vente": limit.get("bid", ""),
            "Qté.V": limit.get("bidQty", ""),
            "Ord.V": limit.get("bidOrd", ""),
            "Cours de référence": m.get("close", ""),
            "CTO": m.get("cto", ""),
            "VTO %": m.get("vto", ""),
            "QTO": m.get("qto", ""),
            "Ouverture": m.get("open", ""),
            "Dernier": m.get("last", ""),
            "Variation %": m.get("change", ""),
            "Dern Qté": m.get("trVolume", ""),
            "Quantité": m.get("volume", ""),
            "Capitalisation": m.get("caps", ""),
            "P.Haut": m.get("high", ""),
            "P.Bas": m.get("low", ""),
            "S.Haut": m.get("max", ""),
            "S.Bas": m.get("min", ""),
            "Heure": m.get("time", ""),
        }
        rows.append(row)

    df = pd.DataFrame(rows)

    # Save to CSV
    output_file = "bvmt_market_data.csv"
    df.to_csv(output_file, index=False, encoding="utf-8-sig")
    print(f"\nData saved to {output_file}")
    print(f"Total rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst 15 rows:")
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 200)
    print(df[["Valeur", "Statut", "Achat", "Vente", "Cours de référence", "Dernier", "Variation %", "Quantité", "Heure"]].head(15).to_string())

    return df


if __name__ == "__main__":
    scrape_bvmt_market()
