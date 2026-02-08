"""
bvmt.anomaly — Anomaly detection engine
Pure functions & classes returning typed models — no print, no file I/O, no sound.
All side effects (logging, console, sound) are handled by the API layer.
"""

import statistics
from collections import defaultdict, deque
from datetime import datetime

from .config import (
    VOLUME_SIGMA_THRESHOLD,
    PRICE_CHANGE_THRESHOLD,
    ORDER_IMBALANCE_RATIO,
    SPREAD_SIGMA_THRESHOLD,
    MIN_HISTORY,
)
from .models import (
    Alert,
    AnomalyReport,
    StockData,
    StockSnapshot,
    AlertSeverity,
    AnomalyType,
)


# ─────────────────────────────────────────────────────────────────────
# Stateless CSV / snapshot analysis
# ─────────────────────────────────────────────────────────────────────

def detect_anomalies(stocks: list[StockData]) -> AnomalyReport:
    """
    Run all anomaly detectors on a single snapshot of market data.
    Returns an AnomalyReport with all alerts.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    alerts: list[Alert] = []

    active = [s for s in stocks if s.quantite > 0]

    # ── 1. Volume Spikes (cross-sectional) ───────────────────────
    volumes = [s.quantite for s in active]
    if len(volumes) >= 2:
        mean_v = statistics.mean(volumes)
        std_v = statistics.stdev(volumes)
        if std_v > 0:
            threshold = mean_v + VOLUME_SIGMA_THRESHOLD * std_v
            for s in active:
                if s.quantite > threshold:
                    z = (s.quantite - mean_v) / std_v
                    alerts.append(Alert(
                        timestamp=now,
                        isin=s.isin,
                        valeur=s.valeur,
                        anomaly_type=AnomalyType.VOLUME_SPIKE.value,
                        severity=(AlertSeverity.CRITICAL.value if z > 5
                                  else AlertSeverity.WARNING.value),
                        message=f"Pic de volume: {s.quantite:,} (z={z:.1f}σ)",
                        current_value=s.quantite,
                        threshold=threshold,
                        details=f"Moy={mean_v:,.0f} Std={std_v:,.0f} Dernier={s.dernier:.2f}",
                    ))

    # ── 2. Price Anomalies (>5% variation) ───────────────────────
    for s in active:
        pct = abs(s.variation)
        if pct >= PRICE_CHANGE_THRESHOLD:
            direction = "HAUSSE" if s.variation > 0 else "BAISSE"
            alerts.append(Alert(
                timestamp=now,
                isin=s.isin,
                valeur=s.valeur,
                anomaly_type=AnomalyType.PRICE_ANOMALY.value,
                severity=(AlertSeverity.CRITICAL.value if pct >= 8
                          else AlertSeverity.WARNING.value),
                message=f"Prix anormal: {direction} de {pct:.2f}%",
                current_value=pct,
                threshold=PRICE_CHANGE_THRESHOLD,
                details=f"Réf={s.reference:.2f} Dernier={s.dernier:.2f} "
                        f"P.Haut={s.p_haut:.2f} P.Bas={s.p_bas:.2f}",
            ))

    # ── 3. Suspicious Patterns ───────────────────────────────────

    # 3a. Order imbalance
    for s in active:
        if s.qty_a > 0 and s.qty_v > 0:
            ratio = s.qty_v / s.qty_a
            inv_ratio = s.qty_a / s.qty_v
            if ratio > ORDER_IMBALANCE_RATIO:
                alerts.append(Alert(
                    timestamp=now,
                    isin=s.isin,
                    valeur=s.valeur,
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre: pression VENTE (ratio {ratio:.1f}x)",
                    current_value=round(ratio, 2),
                    threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.A={s.qty_a:,} Qté.V={s.qty_v:,}",
                ))
            elif inv_ratio > ORDER_IMBALANCE_RATIO:
                alerts.append(Alert(
                    timestamp=now,
                    isin=s.isin,
                    valeur=s.valeur,
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre: pression ACHAT (ratio {inv_ratio:.1f}x)",
                    current_value=round(inv_ratio, 2),
                    threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.A={s.qty_a:,} Qté.V={s.qty_v:,}",
                ))

    # 3b. Spread anomaly
    spreads: list[tuple[StockData, float]] = []
    for s in active:
        if s.achat > 0 and s.vente > s.achat:
            spread_pct = (s.vente - s.achat) / s.achat * 100
            spreads.append((s, spread_pct))

    if len(spreads) >= 3:
        spread_vals = [sp for _, sp in spreads]
        mean_sp = statistics.mean(spread_vals)
        std_sp = statistics.stdev(spread_vals)
        if std_sp > 0:
            for s, sp in spreads:
                z = (sp - mean_sp) / std_sp
                if z > SPREAD_SIGMA_THRESHOLD:
                    alerts.append(Alert(
                        timestamp=now,
                        isin=s.isin,
                        valeur=s.valeur,
                        anomaly_type=AnomalyType.SPREAD_ANOMALY.value,
                        severity=AlertSeverity.INFO.value,
                        message=f"Spread anormal: {sp:.2f}% (z={z:.1f}σ)",
                        current_value=round(sp, 2),
                        threshold=round(mean_sp + SPREAD_SIGMA_THRESHOLD * std_sp, 2),
                        details=f"Achat={s.achat:.2f} Vente={s.vente:.2f}",
                    ))

    # Build report
    by_type: dict[str, int] = defaultdict(int)
    by_severity: dict[str, int] = defaultdict(int)
    stock_counts: dict[str, int] = defaultdict(int)
    for a in alerts:
        by_type[a.anomaly_type] += 1
        by_severity[a.severity] += 1
        stock_counts[a.valeur] += 1

    top_flagged = [
        {"valeur": name, "count": count}
        for name, count in sorted(stock_counts.items(), key=lambda x: -x[1])[:10]
    ]

    return AnomalyReport(
        timestamp=now,
        total_alerts=len(alerts),
        alerts=alerts,
        by_type=dict(by_type),
        by_severity=dict(by_severity),
        top_flagged=top_flagged,
    )


# ─────────────────────────────────────────────────────────────────────
# Stateful streaming engine (for live monitoring)
# ─────────────────────────────────────────────────────────────────────

class AnomalyEngine:
    """
    Maintains rolling history per stock and runs time-series detectors.
    Call .ingest(snapshots) on each poll; read .alerts for accumulated results.
    """

    def __init__(self):
        self.history: dict[str, deque[StockSnapshot]] = defaultdict(
            lambda: deque(maxlen=200)
        )
        self.snapshot_count = 0
        self.alerts: list[Alert] = []

    def ingest(self, snapshots: list[StockSnapshot]) -> list[Alert]:
        """
        Ingest a batch of snapshots, run detectors, return NEW alerts only.
        """
        self.snapshot_count += 1
        new_alerts: list[Alert] = []

        for snap in snapshots:
            self.history[snap.isin].append(snap)

        if self.snapshot_count >= MIN_HISTORY:
            for snap in snapshots:
                hist = list(self.history[snap.isin])
                if len(hist) >= MIN_HISTORY:
                    new_alerts += self._detect_volume_spike(snap, hist)
                    new_alerts += self._detect_price_anomaly(snap, hist)
                    new_alerts += self._detect_suspicious_patterns(snap, hist)

        self.alerts.extend(new_alerts)
        return new_alerts

    def get_report(self) -> AnomalyReport:
        """Build a summary report from all accumulated alerts."""
        by_type: dict[str, int] = defaultdict(int)
        by_severity: dict[str, int] = defaultdict(int)
        stock_counts: dict[str, int] = defaultdict(int)
        for a in self.alerts:
            by_type[a.anomaly_type] += 1
            by_severity[a.severity] += 1
            stock_counts[a.valeur] += 1

        top_flagged = [
            {"valeur": name, "count": count}
            for name, count in sorted(stock_counts.items(), key=lambda x: -x[1])[:10]
        ]

        return AnomalyReport(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            total_alerts=len(self.alerts),
            alerts=self.alerts,
            by_type=dict(by_type),
            by_severity=dict(by_severity),
            top_flagged=top_flagged,
        )

    # ── Detector 1: Volume Spikes ────────────────────────────────

    def _detect_volume_spike(
        self, current: StockSnapshot, history: list[StockSnapshot]
    ) -> list[Alert]:
        alerts: list[Alert] = []
        if len(history) < MIN_HISTORY + 1:
            return alerts

        deltas = []
        for i in range(1, len(history)):
            d = history[i].volume - history[i - 1].volume
            if d >= 0:
                deltas.append(d)

        if len(deltas) < MIN_HISTORY:
            return alerts

        mean_v = statistics.mean(deltas)
        std_v = statistics.stdev(deltas) if len(deltas) >= 2 else 0
        if std_v == 0:
            return alerts

        current_delta = current.volume - history[-2].volume if len(history) >= 2 else 0
        if current_delta <= 0:
            return alerts

        z = (current_delta - mean_v) / std_v
        if z > VOLUME_SIGMA_THRESHOLD:
            alerts.append(Alert(
                timestamp=current.timestamp,
                isin=current.isin,
                valeur=current.valeur,
                anomaly_type=AnomalyType.VOLUME_SPIKE.value,
                severity=(AlertSeverity.CRITICAL.value if z > 5
                          else AlertSeverity.WARNING.value),
                message=f"Volume spike: {current_delta:,} units (z={z:.1f}σ)",
                current_value=current_delta,
                threshold=round(mean_v + VOLUME_SIGMA_THRESHOLD * std_v, 2),
                details=f"Mean={mean_v:,.0f} Std={std_v:,.0f} TotalVol={current.volume:,}",
            ))
        return alerts

    # ── Detector 2: Price Anomalies ──────────────────────────────

    def _detect_price_anomaly(
        self, current: StockSnapshot, history: list[StockSnapshot]
    ) -> list[Alert]:
        alerts: list[Alert] = []

        # Large variation from reference
        if current.close > 0 and current.last > 0:
            pct = abs(current.change)
            if pct >= PRICE_CHANGE_THRESHOLD:
                direction = "HAUSSE" if current.change > 0 else "BAISSE"
                alerts.append(Alert(
                    timestamp=current.timestamp,
                    isin=current.isin,
                    valeur=current.valeur,
                    anomaly_type=AnomalyType.PRICE_ANOMALY.value,
                    severity=(AlertSeverity.CRITICAL.value if pct >= 8
                              else AlertSeverity.WARNING.value),
                    message=f"Prix anormal: {direction} de {pct:.2f}%",
                    current_value=pct,
                    threshold=PRICE_CHANGE_THRESHOLD,
                    details=f"Réf={current.close:.2f} Dernier={current.last:.2f}",
                ))

        # Rapid intra-session move
        if len(history) >= 2:
            prev = history[-2]
            if prev.last > 0 and current.last > 0:
                rapid = abs(current.last - prev.last) / prev.last * 100
                if rapid >= 2.0:
                    alerts.append(Alert(
                        timestamp=current.timestamp,
                        isin=current.isin,
                        valeur=current.valeur,
                        anomaly_type=AnomalyType.RAPID_PRICE_MOVE.value,
                        severity=AlertSeverity.WARNING.value,
                        message=f"Mouvement rapide: {rapid:.2f}% entre 2 relevés",
                        current_value=round(rapid, 2),
                        threshold=2.0,
                        details=f"Avant={prev.last:.2f} Après={current.last:.2f}",
                    ))
        return alerts

    # ── Detector 3: Suspicious Patterns ──────────────────────────

    def _detect_suspicious_patterns(
        self, current: StockSnapshot, history: list[StockSnapshot]
    ) -> list[Alert]:
        alerts: list[Alert] = []

        # Order imbalance
        if current.ask_qty > 0 and current.bid_qty > 0:
            ratio = current.bid_qty / current.ask_qty
            inv = current.ask_qty / current.bid_qty
            if ratio > ORDER_IMBALANCE_RATIO:
                alerts.append(Alert(
                    timestamp=current.timestamp,
                    isin=current.isin,
                    valeur=current.valeur,
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre ordres: pression VENTE ({ratio:.1f}x)",
                    current_value=round(ratio, 2),
                    threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.A={current.ask_qty:,} Qté.V={current.bid_qty:,}",
                ))
            elif inv > ORDER_IMBALANCE_RATIO:
                alerts.append(Alert(
                    timestamp=current.timestamp,
                    isin=current.isin,
                    valeur=current.valeur,
                    anomaly_type=AnomalyType.ORDER_IMBALANCE.value,
                    severity=AlertSeverity.WARNING.value,
                    message=f"Déséquilibre ordres: pression ACHAT ({inv:.1f}x)",
                    current_value=round(inv, 2),
                    threshold=ORDER_IMBALANCE_RATIO,
                    details=f"Qté.A={current.ask_qty:,} Qté.V={current.bid_qty:,}",
                ))

        # Spread anomaly
        if current.ask > 0 and current.bid > current.ask:
            spread_pct = (current.bid - current.ask) / current.ask * 100
            hist_spreads = [
                (h.bid - h.ask) / h.ask * 100
                for h in history[:-1]
                if h.ask > 0 and h.bid > h.ask
            ]
            if len(hist_spreads) >= MIN_HISTORY:
                m = statistics.mean(hist_spreads)
                s = statistics.stdev(hist_spreads) if len(hist_spreads) >= 2 else 0
                if s > 0:
                    z = (spread_pct - m) / s
                    if z > SPREAD_SIGMA_THRESHOLD:
                        alerts.append(Alert(
                            timestamp=current.timestamp,
                            isin=current.isin,
                            valeur=current.valeur,
                            anomaly_type=AnomalyType.SPREAD_ANOMALY.value,
                            severity=AlertSeverity.INFO.value,
                            message=f"Spread anormal: {spread_pct:.2f}% (z={z:.1f}σ)",
                            current_value=round(spread_pct, 2),
                            threshold=round(m + SPREAD_SIGMA_THRESHOLD * s, 2),
                            details=f"Ask={current.ask:.2f} Bid={current.bid:.2f}",
                        ))

        # Spoofing detection
        if len(history) >= 2:
            prev = history[-2]
            for side, curr_qty, prev_qty in [
                ("ACHAT", current.ask_qty, prev.ask_qty),
                ("VENTE", current.bid_qty, prev.bid_qty),
            ]:
                if prev_qty > 0 and curr_qty > 0:
                    r = curr_qty / prev_qty
                    if r > 10 and curr_qty > 1000:
                        alerts.append(Alert(
                            timestamp=current.timestamp,
                            isin=current.isin,
                            valeur=current.valeur,
                            anomaly_type=AnomalyType.PATTERN_SUSPECT.value,
                            severity=AlertSeverity.CRITICAL.value,
                            message=f"Spoofing potentiel côté {side}: x{r:.0f}",
                            current_value=curr_qty,
                            threshold=prev_qty * 10,
                            details=f"Avant={prev_qty:,} Après={curr_qty:,}",
                        ))

        return alerts
