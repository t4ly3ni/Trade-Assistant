"""
bvmt.config — Shared configuration constants
"""

API_URL = "https://www.bvmt.com.tn/rest_api/rest/market/groups/11,12,52,95,99"
API_HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": "https://www.bvmt.com.tn/public/BvmtMarketStation/index.html",
}

# Anomaly detection thresholds
VOLUME_SIGMA_THRESHOLD = 3
PRICE_CHANGE_THRESHOLD = 5
ORDER_IMBALANCE_RATIO = 5
SPREAD_SIGMA_THRESHOLD = 3
MIN_HISTORY = 3
POLL_INTERVAL = 30
