"""
Module 3 : Détection d'Anomalies - BVMT Market
================================================
Détecte en temps réel (quasi-réel) :
  1. Pics de volume  (>3 écarts-types de la moyenne)
  2. Variations de prix anormales (>5% en 1 heure sans news)
  3. Patterns suspects (séquences d'ordres inhabituelles)

Architecture:
  MarketStream  →  AnomalyEngine  →  AlertManager
      (poll API)      (3 detectors)     (console + log + CSV + sound)
"""

import time
import json
import math
import statistics
import csv
import os
import winsound
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional

import requests
import pandas as pd


# ─────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────
API_URL = "https://www.bvmt.com.tn/rest_api/rest/market/groups/11,12,52,95,99"
API_HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": "https://www.bvmt.com.tn/public/BvmtMarketStation/index.html",
}
POLL_INTERVAL = 30          # seconds between API polls
MIN_HISTORY = 3             # minimum snapshots before anomaly checks
VOLUME_SIGMA_THRESHOLD = 3  # standard deviations for volume spike
PRICE_CHANGE_THRESHOLD = 5  # % price change threshold
ORDER_IMBALANCE_RATIO = 5   # bid/ask imbalance ratio threshold
SPREAD_SIGMA_THRESHOLD = 3  # std devs for abnormal spread
ALERTS_LOG = "anomaly_alerts.csv"
HISTORY_FILE = "market_history.json"


# ─────────────────────────────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────────────────────────────
class AlertSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AnomalyType(Enum):
    VOLUME_SPIKE = "VOLUME_SPIKE"
    PRICE_ANOMALY = "PRICE_ANOMALY"
    ORDER_IMBALANCE = "ORDER_IMBALANCE"
    SPREAD_ANOMALY = "SPREAD_ANOMALY"
    RAPID_PRICE_MOVE = "RAPID_PRICE_MOVE"
    PATTERN_SUSPECT = "PATTERN_SUSPECT"


@dataclass
class Alert:
    timestamp: str
    isin: str
    valeur: str
    anomaly_type: str
    severity: str
    message: str
    current_value: float
    threshold: float
    details: str = ""


@dataclass
class StockSnapshot:
    """Single point-in-time snapshot of a stock"""
    timestamp: str
    isin: str
    valeur: str
    ticker: str
    last: float
    close: float         # reference price
    change: float        # variation %
    volume: int
    caps: float          # capitalisation
    ask: float
    bid: float
    ask_qty: int
    bid_qty: int
    ask_ord: int
    bid_ord: int
    high: float
    low: float
    status: str
    cto: float
    vto: float


# ─────────────────────────────────────────────────────────────────────
# AlertManager — notification system
# ─────────────────────────────────────────────────────────────────────
class AlertManager:
    """Handles alert dispatching: console, CSV log, sound"""

    def __init__(self, log_file: str = ALERTS_LOG):
        self.log_file = log_file
        self.alert_count = 0
        self.session_alerts: list[Alert] = []
        self._init_log()

    def _init_log(self):
        if not os.path.exists(self.log_file):
            with open(self.log_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "Timestamp", "ISIN", "Valeur", "Type", "Severity",
                    "Message", "Current Value", "Threshold", "Details"
                ])

    def emit(self, alert: Alert):
        """Dispatch an alert through all channels"""
        self.alert_count += 1
        self.session_alerts.append(alert)

        # Console output with color coding
        self._console_alert(alert)
        # CSV log
        self._log_alert(alert)
        # Sound notification for CRITICAL
        if alert.severity == AlertSeverity.CRITICAL.value:
            self._sound_alert()

    def _console_alert(self, alert: Alert):
        severity_icons = {
            "INFO": "ℹ️ ",
            "WARNING": "⚠️ ",
            "CRITICAL": "🚨",
        }
        icon = severity_icons.get(alert.severity, "  ")
        border = "═" * 68

        print(f"\n╔{border}╗")
        print(f"║ {icon} ANOMALY DETECTED — {alert.severity:<10} {alert.timestamp:>30}   ║")
        print(f"╠{border}╣")
        print(f"║  Valeur : {alert.valeur:<20} ISIN: {alert.isin:<28} ║")
        print(f"║  Type   : {alert.anomaly_type:<52} ║")
        print(f"║  Message: {alert.message:<52} ║")
        if alert.details:
            # Wrap details to fit box
            for line in _wrap(alert.details, 52):
                print(f"║  Detail : {line:<52} ║")
        print(f"║  Valeur actuelle: {alert.current_value:<15} Seuil: {alert.threshold:<21} ║")
        print(f"╚{border}╝")

    def _log_alert(self, alert: Alert):
        with open(self.log_file, "a", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                alert.timestamp, alert.isin, alert.valeur,
                alert.anomaly_type, alert.severity, alert.message,
                alert.current_value, alert.threshold, alert.details,
            ])

    def _sound_alert(self):
        try:
            winsound.Beep(1000, 300)
            winsound.Beep(1500, 300)
        except Exception:
            pass

    def summary(self):
        print(f"\n{'─' * 60}")
        print(f"  SESSION SUMMARY: {self.alert_count} anomalies detected")
        print(f"{'─' * 60}")
        by_type = defaultdict(int)
        by_severity = defaultdict(int)
        by_stock = defaultdict(int)
        for a in self.session_alerts:
            by_type[a.anomaly_type] += 1
            by_severity[a.severity] += 1
            by_stock[a.valeur] += 1

        if by_type:
            print("  By type:")
            for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
                print(f"    {t:<25} {c}")
            print("  By severity:")
            for s, c in sorted(by_severity.items()):
                print(f"    {s:<25} {c}")
            print("  Top flagged stocks:")
            for s, c in sorted(by_stock.items(), key=lambda x: -x[1])[:10]:
                print(f"    {s:<25} {c}")
        print(f"  Alerts logged to: {self.log_file}")
        print()


# ─────────────────────────────────────────────────────────────────────
# AnomalyEngine — 3 detection strategies
# ─────────────────────────────────────────────────────────────────────
class AnomalyEngine:
    """
    Maintains rolling history per stock and runs 3 detection strategies:
      1. Volume spike detection
      2. Price anomaly detection
      3. Suspicious pattern detection
    """

    def __init__(self, alert_manager: AlertManager):
        self.alert_mgr = alert_manager
        # isin → deque of StockSnapshot (rolling window)
        self.history: dict[str, deque[StockSnapshot]] = defaultdict(lambda: deque(maxlen=200))
        self.snapshot_count = 0

    def ingest(self, snapshots: list[StockSnapshot]):
        """Ingest a batch of stock snapshots and run anomaly checks"""
        self.snapshot_count += 1
        for snap in snapshots:
            self.history[snap.isin].append(snap)

        # Only run detection if we have enough history
        if self.snapshot_count >= MIN_HISTORY:
            for snap in snapshots:
                hist = list(self.history[snap.isin])
                if len(hist) >= MIN_HISTORY:
                    self._detect_volume_spike(snap, hist)
                    self._detect_price_anomaly(snap, hist)
                    self._detect_suspicious_patterns(snap, hist)

    # ── Detector 1: Volume Spikes ────────────────────────────────
    def _detect_volume_spike(self, current: StockSnapshot, history: list[StockSnapshot]):
        """
        Detect volume spikes > 3 standard deviations from rolling mean.
        Uses incremental volume (delta) between snapshots.
        """
        if len(history) < MIN_HISTORY + 1:
            return

        # Compute volume deltas between consecutive snapshots
        deltas = []
        for i in range(1, len(history)):
            delta = history[i].volume - history[i - 1].volume
            if delta >= 0:
                deltas.append(delta)

        if len(deltas) < MIN_HISTORY:
            return

        mean_vol = statistics.mean(deltas)
        if len(deltas) >= 2:
            std_vol = statistics.stdev(deltas)
        else:
            return

        if std_vol == 0:
            return

        current_delta = current.volume - history[-2].volume if len(history) >= 2 else 0
        if current_delta <= 0:
            return

        z_score = (current_delta - mean_vol) / std_vol

        if z_score > VOLUME_SIGMA_THRESHOLD:
            severity = AlertSeverity.CRITICAL if z_score > 5 else AlertSeverity.WARNING
            self.alert_mgr.emit(Alert(
                timestamp=current.timestamp,
                isin=current.isin,
                valeur=current.valeur,
                anomaly_type=AnomalyType.VOLUME_SPIKE.value,
                severity=severity.value,
                message=f"Volume spike: {current_delta:,} units (z={z_score:.1f}σ)",
                current_value=current_delta,
                threshold=mean_vol + VOLUME_SIGMA_THRESHOLD * std_vol,
                details=f"Mean={mean_vol:,.0f} Std={std_vol:,.0f} "
                        f"TotalVol={current.volume:,}",
            ))

    # ── Detector 2: Price Anomalies ──────────────────────────────
    def _detect_price_anomaly(self, current: StockSnapshot, history: list[StockSnapshot]):
        """
        Detect abnormal price movements:
          a) >5% variation from reference price
          b) Rapid intra-session price moves (comparing snapshots)
        """
        # (a) Large variation from reference
        if current.close > 0 and current.last > 0:
            pct_change = abs(current.change)
            if pct_change >= PRICE_CHANGE_THRESHOLD:
                severity = AlertSeverity.CRITICAL if pct_change >= 8 else AlertSeverity.WARNING
                direction = "HAUSSE" if current.change > 0 else "BAISSE"
                self.alert_mgr.emit(Alert(
                    timestamp=current.timestamp,
                    isin=current.isin,
                    valeur=current.valeur,
                    anomaly_type=AnomalyType.PRICE_ANOMALY.value,
                    severity=severity.value,
                    message=f"Prix anormal: {direction} de {pct_change:.2f}%",
                    current_value=pct_change,
                    threshold=PRICE_CHANGE_THRESHOLD,
                    details=f"Réf={current.close:.2f} Dernier={current.last:.2f} "
                            f"Haut={current.high:.2f} Bas={current.low:.2f}",
                ))

        # (b) Rapid intra-session price move (between snapshots)
        if len(history) >= 2:
            prev = history[-2]
            if prev.last > 0 and current.last > 0:
                rapid_change = abs(current.last - prev.last) / prev.last * 100
                if rapid_change >= 2.0:  # 2% between two polls
                    self.alert_mgr.emit(Alert(
                        timestamp=current.timestamp,
                        isin=current.isin,
                        valeur=current.valeur,
                        anomaly_type=AnomalyType.RAPID_PRICE_MOVE.value,
                        severity=AlertSeverity.WARNING.value,
                        message=f"Mouvement rapide: {rapid_change:.2f}% entre 2 relevés",
                        current_value=rapid_change,
                        threshold=2.0,
                        details=f"Avant={prev.last:.2f} Après={current.last:.2f}",
                    ))

    # ── Detector 3: Suspicious Patterns ──────────────────────────
    def _detect_suspicious_patterns(self, current: StockSnapshot, history: list[StockSnapshot]):
        """
        Detect suspicious order book patterns:
          a) Order imbalance (bid/ask qty ratio)
          b) Abnormal spread (bid-ask spread vs history)
          c) Spoofing-like patterns (large orders appearing/disappearing)
        """
        # (a) Order Imbalance — extreme buy vs sell pressure
        if current.ask_qty > 0 and current.bid_qty > 0:
            ratio = current.bid_qty / current.ask_qty
            inv_ratio = current.ask_qty / current.bid_qty

            if ratio > ORDER_IMBALANCE_RATIO:
                self.alert_mgr.emit(Alert(
                    timestamp=current.timestamp,
                    isin=current.isin,
                    valeur=current.valeur,
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre ordres: pression VENTE (ratio {ratio:.1f}x)",
                    current_value=ratio,
                    threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.Achat={current.ask_qty:,} Qté.Vente={current.bid_qty:,} "
                            f"Ord.A={current.ask_ord} Ord.V={current.bid_ord}",
                ))
            elif inv_ratio > ORDER_IMBALANCE_RATIO:
                self.alert_mgr.emit(Alert(
                    timestamp=current.timestamp,
                    isin=current.isin,
                    valeur=current.valeur,
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre ordres: pression ACHAT (ratio {inv_ratio:.1f}x)",
                    current_value=inv_ratio,
                    threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.Achat={current.ask_qty:,} Qté.Vente={current.bid_qty:,} "
                            f"Ord.A={current.ask_ord} Ord.V={current.bid_ord}",
                ))

        # (b) Abnormal Spread
        if current.ask > 0 and current.bid > 0 and current.bid > current.ask:
            spread = current.bid - current.ask
            spread_pct = (spread / current.ask) * 100

            # Compare to historical spreads
            hist_spreads = []
            for h in history[:-1]:
                if h.ask > 0 and h.bid > 0 and h.bid > h.ask:
                    hist_spreads.append((h.bid - h.ask) / h.ask * 100)

            if len(hist_spreads) >= MIN_HISTORY:
                mean_spread = statistics.mean(hist_spreads)
                std_spread = statistics.stdev(hist_spreads) if len(hist_spreads) >= 2 else 0
                if std_spread > 0:
                    z = (spread_pct - mean_spread) / std_spread
                    if z > SPREAD_SIGMA_THRESHOLD:
                        self.alert_mgr.emit(Alert(
                            timestamp=current.timestamp,
                            isin=current.isin,
                            valeur=current.valeur,
                            anomaly_type=AnomalyType.SPREAD_ANOMALY.value,
                            severity=AlertSeverity.INFO.value,
                            message=f"Spread anormal: {spread_pct:.2f}% (z={z:.1f}σ)",
                            current_value=spread_pct,
                            threshold=mean_spread + SPREAD_SIGMA_THRESHOLD * std_spread,
                            details=f"Ask={current.ask:.2f} Bid={current.bid:.2f} "
                                    f"Spread={spread:.3f}",
                        ))

        # (c) Spoofing detection — large order qty suddenly appearing
        if len(history) >= 2:
            prev = history[-2]
            # Check if ask_qty or bid_qty spiked massively
            for side, curr_qty, prev_qty, label in [
                ("ACHAT", current.ask_qty, prev.ask_qty, "Qté.A"),
                ("VENTE", current.bid_qty, prev.bid_qty, "Qté.V"),
            ]:
                if prev_qty > 0 and curr_qty > 0:
                    qty_ratio = curr_qty / prev_qty
                    if qty_ratio > 10 and curr_qty > 1000:
                        self.alert_mgr.emit(Alert(
                            timestamp=current.timestamp,
                            isin=current.isin,
                            valeur=current.valeur,
                            anomaly_type=AnomalyType.PATTERN_SUSPECT.value,
                            severity=AlertSeverity.CRITICAL.value,
                            message=f"Spoofing potentiel côté {side}: {label} x{qty_ratio:.0f}",
                            current_value=curr_qty,
                            threshold=prev_qty * 10,
                            details=f"Avant={prev_qty:,} Après={curr_qty:,} "
                                    f"Ratio={qty_ratio:.1f}x",
                        ))


# ─────────────────────────────────────────────────────────────────────
# MarketStream — quasi real-time data fetcher
# ─────────────────────────────────────────────────────────────────────
class MarketStream:
    """Polls the BVMT REST API and converts to StockSnapshots"""

    def fetch(self) -> list[StockSnapshot]:
        """Fetch current market data and return as list of snapshots"""
        try:
            resp = requests.get(API_URL, headers=API_HEADERS, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"  [STREAM] API error: {e}")
            return []

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        markets = data.get("markets", [])
        snapshots = []

        for m in markets:
            ref = m.get("referentiel", {})
            lim = m.get("limit", {})
            snapshots.append(StockSnapshot(
                timestamp=now,
                isin=m.get("isin", ""),
                valeur=ref.get("stockName", ""),
                ticker=ref.get("ticker", ""),
                last=float(m.get("last", 0)),
                close=float(m.get("close", 0)),
                change=float(m.get("change", 0)),
                volume=int(m.get("volume", 0)),
                caps=float(m.get("caps", 0)),
                ask=float(lim.get("ask", 0)),
                bid=float(lim.get("bid", 0)),
                ask_qty=int(lim.get("askQty", 0)),
                bid_qty=int(lim.get("bidQty", 0)),
                ask_ord=int(lim.get("askOrd", 0)),
                bid_ord=int(lim.get("bidOrd", 0)),
                high=float(m.get("high", 0)),
                low=float(m.get("low", 0)),
                status=m.get("status", "").strip(),
                cto=float(m.get("cto", 0)),
                vto=float(m.get("vto", 0)),
            ))

        return snapshots


# ─────────────────────────────────────────────────────────────────────
# Offline analysis — run detectors on existing CSV data
# ─────────────────────────────────────────────────────────────────────
def analyze_csv(csv_path: str = "bvmt_market_data.csv"):
    """Run anomaly detection on existing CSV data (single snapshot)"""
    print("=" * 60)
    print("  MODULE 3 — DÉTECTION D'ANOMALIES (Analyse CSV)")
    print("=" * 60)

    df = pd.read_csv(csv_path)
    alert_mgr = AlertManager(log_file="anomaly_alerts.csv")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    active = df[df["Quantité"] > 0].copy()

    # ── 1. Volume Analysis ───────────────────────────────────────
    print("\n▶ Analyse des volumes...")
    volumes = [int(x) for x in active["Quantité"].values]
    if len(volumes) >= 2:
        mean_v = statistics.mean(volumes)
        std_v = statistics.stdev(volumes)
        threshold = mean_v + VOLUME_SIGMA_THRESHOLD * std_v

        print(f"  Moyenne volume: {mean_v:,.0f} | Écart-type: {std_v:,.0f} | Seuil (3σ): {threshold:,.0f}")

        spikes = active[active["Quantité"] > threshold]
        for _, row in spikes.iterrows():
            z = (row["Quantité"] - mean_v) / std_v if std_v > 0 else 0
            alert_mgr.emit(Alert(
                timestamp=now, isin=row["ISIN"], valeur=row["Valeur"],
                anomaly_type=AnomalyType.VOLUME_SPIKE.value,
                severity=AlertSeverity.CRITICAL.value if z > 5 else AlertSeverity.WARNING.value,
                message=f"Pic de volume: {int(row['Quantité']):,} (z={z:.1f}σ)",
                current_value=row["Quantité"], threshold=threshold,
                details=f"Moy={mean_v:,.0f} Std={std_v:,.0f} Dernier={row['Dernier']:.2f}",
            ))

    # ── 2. Price Anomalies ───────────────────────────────────────
    print("\n▶ Analyse des variations de prix...")
    price_anomalies = active[abs(active["Variation %"]) >= PRICE_CHANGE_THRESHOLD]
    for _, row in price_anomalies.iterrows():
        direction = "HAUSSE" if row["Variation %"] > 0 else "BAISSE"
        sev = AlertSeverity.CRITICAL if abs(row["Variation %"]) >= 8 else AlertSeverity.WARNING
        alert_mgr.emit(Alert(
            timestamp=now, isin=row["ISIN"], valeur=row["Valeur"],
            anomaly_type=AnomalyType.PRICE_ANOMALY.value,
            severity=sev.value,
            message=f"Prix anormal: {direction} de {abs(row['Variation %']):.2f}%",
            current_value=abs(row["Variation %"]), threshold=PRICE_CHANGE_THRESHOLD,
            details=f"Réf={row['Cours de référence']:.2f} Dernier={row['Dernier']:.2f} "
                    f"P.Haut={row['P.Haut']:.2f} P.Bas={row['P.Bas']:.2f}",
        ))

    # ── 3. Suspicious Patterns ───────────────────────────────────
    print("\n▶ Analyse des patterns suspects...")

    # Order imbalance
    for _, row in active.iterrows():
        ask_q = row.get("Qté.A", 0) or 0
        bid_q = row.get("Qté.V", 0) or 0
        if ask_q > 0 and bid_q > 0:
            ratio = bid_q / ask_q
            inv_ratio = ask_q / bid_q
            if ratio > ORDER_IMBALANCE_RATIO:
                alert_mgr.emit(Alert(
                    timestamp=now, isin=row["ISIN"], valeur=row["Valeur"],
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre: pression VENTE (ratio {ratio:.1f}x)",
                    current_value=ratio, threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.A={int(ask_q):,} Qté.V={int(bid_q):,}",
                ))
            elif inv_ratio > ORDER_IMBALANCE_RATIO:
                alert_mgr.emit(Alert(
                    timestamp=now, isin=row["ISIN"], valeur=row["Valeur"],
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre: pression ACHAT (ratio {inv_ratio:.1f}x)",
                    current_value=inv_ratio, threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.A={int(ask_q):,} Qté.V={int(bid_q):,}",
                ))

    # Spread analysis
    spreads_data = []
    for _, row in active.iterrows():
        ask = row.get("Achat", 0) or 0
        bid = row.get("Vente", 0) or 0
        if ask > 0 and bid > ask:
            spread_pct = (bid - ask) / ask * 100
            spreads_data.append((row, spread_pct))

    if len(spreads_data) >= 3:
        spread_values = [s[1] for s in spreads_data]
        mean_sp = statistics.mean(spread_values)
        std_sp = statistics.stdev(spread_values)
        if std_sp > 0:
            for row, sp in spreads_data:
                z = (sp - mean_sp) / std_sp
                if z > SPREAD_SIGMA_THRESHOLD:
                    alert_mgr.emit(Alert(
                        timestamp=now, isin=row["ISIN"], valeur=row["Valeur"],
                        anomaly_type=AnomalyType.SPREAD_ANOMALY.value,
                        severity=AlertSeverity.INFO.value,
                        message=f"Spread anormal: {sp:.2f}% (z={z:.1f}σ)",
                        current_value=sp,
                        threshold=mean_sp + SPREAD_SIGMA_THRESHOLD * std_sp,
                        details=f"Achat={row['Achat']:.2f} Vente={row['Vente']:.2f}",
                    ))

    # Summary
    alert_mgr.summary()
    return alert_mgr


# ─────────────────────────────────────────────────────────────────────
# Live streaming monitor
# ─────────────────────────────────────────────────────────────────────
def run_live_monitor(duration_minutes: int = 30, poll_seconds: int = POLL_INTERVAL):
    """
    Run quasi real-time anomaly detection by polling the API.
    Press Ctrl+C to stop gracefully.
    """
    print("=" * 60)
    print("  MODULE 3 — DÉTECTION D'ANOMALIES (Live Monitor)")
    print("=" * 60)
    print(f"  Intervalle: {poll_seconds}s | Durée max: {duration_minutes}min")
    print(f"  Seuils: Volume>{VOLUME_SIGMA_THRESHOLD}σ | Prix>{PRICE_CHANGE_THRESHOLD}%")
    print(f"  Déséquilibre ordres>{ORDER_IMBALANCE_RATIO}x")
    print("  Ctrl+C pour arrêter")
    print("=" * 60)

    stream = MarketStream()
    alert_mgr = AlertManager(log_file="anomaly_alerts_live.csv")
    engine = AnomalyEngine(alert_mgr)

    start_time = datetime.now()
    end_time = start_time + timedelta(minutes=duration_minutes)
    poll_count = 0

    try:
        while datetime.now() < end_time:
            poll_count += 1
            now = datetime.now().strftime("%H:%M:%S")
            print(f"\n  [{now}] Poll #{poll_count} — fetching data...", end="")

            snapshots = stream.fetch()
            if snapshots:
                print(f" {len(snapshots)} stocks", end="")
                engine.ingest(snapshots)

                active = sum(1 for s in snapshots if s.volume > 0)
                print(f" | Active: {active} | Alerts: {alert_mgr.alert_count}")
            else:
                print(" (no data)")

            time.sleep(poll_seconds)

    except KeyboardInterrupt:
        print("\n\n  Monitoring stopped by user.")

    elapsed = (datetime.now() - start_time).total_seconds() / 60
    print(f"\n  Duration: {elapsed:.1f} minutes | Polls: {poll_count}")
    alert_mgr.summary()
    return alert_mgr


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────
def _wrap(text: str, width: int) -> list[str]:
    """Simple text wrapper"""
    lines = []
    while len(text) > width:
        idx = text.rfind(" ", 0, width)
        if idx == -1:
            idx = width
        lines.append(text[:idx])
        text = text[idx:].lstrip()
    if text:
        lines.append(text)
    return lines


# ─────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "csv"

    if mode == "live":
        duration = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        run_live_monitor(duration_minutes=duration)
    elif mode == "csv":
        csv_file = sys.argv[2] if len(sys.argv) > 2 else "bvmt_market_data.csv"
        analyze_csv(csv_file)
    else:
        print("Usage:")
        print("  python anomaly_detector.py csv [file.csv]   — Analyze CSV data")
        print("  python anomaly_detector.py live [minutes]   — Live monitoring")
