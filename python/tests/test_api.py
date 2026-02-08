"""Quick smoke test for all BVMT API endpoints."""
import requests

BASE = "http://127.0.0.1:8000"


def test(label, url):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"  GET {url}")
    print(f"{'='*60}")
    r = requests.get(url, timeout=30)
    print(f"  Status: {r.status_code}")
    d = r.json()
    if isinstance(d, dict):
        for k, v in d.items():
            if isinstance(v, list):
                print(f"  {k}: [{len(v)} items]")
            elif isinstance(v, dict):
                print(f"  {k}: {v}")
            else:
                print(f"  {k}: {v}")
    else:
        print(f"  Response: {d}")
    return d


# 1. Health
test("Health Check", f"{BASE}/api/health")

# 2. Market data
m = test("Market Data", f"{BASE}/api/market")
print(f"\n  First 3 stocks:")
for s in m["stocks"][:3]:
    print(f"    {s['valeur']:30s}  Var={s['variation']:+.2f}%  Vol={s['quantite']}")

# 3. Analysis (top 5 hausse/baisse)
a = test("Analysis (top 5)", f"{BASE}/api/analysis?top_n=5")
print(f"\n  Top Hausse:")
for t in a["top_hausse"]:
    print(f"    {t['valeur']:30s}  {t['variation']:+.2f}%")
print(f"  Top Baisse:")
for t in a["top_baisse"]:
    print(f"    {t['valeur']:30s}  {t['variation']:+.2f}%")

# 4. Anomalies
an = test("Anomaly Detection", f"{BASE}/api/anomalies")
print(f"\n  Sample alerts:")
for alert in an["alerts"][:5]:
    print(f"    [{alert['severity']}] {alert['valeur']}: {alert['message']}")

# 5. Stream status
test("Stream Status", f"{BASE}/api/stream/status")

# 6. Stream alerts
test("Stream Alerts", f"{BASE}/api/stream/alerts")

print(f"\n{'='*60}")
print("  ALL ENDPOINTS OK")
print(f"{'='*60}")
