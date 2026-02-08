"""
Anomaly Detection Tool — Reads anomaly alerts from CSV data.
Checks for volume spikes, price anomalies, order imbalances.
"""

import csv
import os
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


class AnomalyDetectionInput(BaseModel):
    """Input for the anomaly detection tool."""
    ticker: str = Field(
        default="",
        description=(
            "Optional stock ticker to filter anomalies for. "
            "Leave empty to get all anomalies."
        ),
    )
    severity: str = Field(
        default="",
        description=(
            "Optional severity filter: 'CRITICAL', 'WARNING', or 'INFO'. "
            "Leave empty for all severities."
        ),
    )


class AnomalyDetectionTool(BaseTool):
    """Check BVMT market anomaly alerts from surveillance data."""

    name: str = "bvmt_anomaly_detection"
    description: str = (
        "Check for anomalies in BVMT trading data — volume spikes, "
        "price anomalies, order imbalances, spread anomalies. "
        "Filter by ticker or severity."
    )
    args_schema: Type[BaseModel] = AnomalyDetectionInput

    def _run(self, ticker: str = "", severity: str = "") -> str:
        path = os.path.join(DATA_DIR, "anomaly_alerts.csv")
        if not os.path.exists(path):
            return "No anomaly data available."

        with open(path, "r", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))

        if not rows:
            return "No anomaly alerts found — market appears normal."

        # Apply filters
        if ticker:
            t = ticker.upper()
            rows = [r for r in rows
                    if t in r.get("Valeur", "").upper()
                    or t in r.get("ISIN", "").upper()]
        if severity:
            rows = [r for r in rows
                    if r.get("Severity", "").upper() == severity.upper()]

        if not rows:
            msg = "No anomalies found"
            if ticker:
                msg += f" for '{ticker}'"
            if severity:
                msg += f" with severity '{severity}'"
            return msg + ". The stock appears safe."

        # Summary
        by_sev = {}
        by_type = {}
        for r in rows:
            sev = r.get("Severity", "UNKNOWN")
            typ = r.get("Type", "UNKNOWN")
            by_sev[sev] = by_sev.get(sev, 0) + 1
            by_type[typ] = by_type.get(typ, 0) + 1

        lines = [
            f"═══ ANOMALY REPORT ({len(rows)} alerts) ═══",
            "",
            "── By Severity ──",
        ]
        for s, c in sorted(by_sev.items()):
            lines.append(f"  {s}: {c}")
        lines.append("\n── By Type ──")
        for t, c in sorted(by_type.items()):
            lines.append(f"  {t}: {c}")
        lines.append("\n── Alert Details ──")

        for r in rows:
            lines.append(
                f"\n  [{r.get('Severity', '')}] {r.get('Valeur', '')} "
                f"({r.get('ISIN', '')})\n"
                f"    Type: {r.get('Type', '')}\n"
                f"    Message: {r.get('Message', '')}\n"
                f"    Value: {r.get('Current Value', '')} "
                f"(Threshold: {r.get('Threshold', '')})\n"
                f"    Details: {r.get('Details', '')}\n"
                f"    Time: {r.get('Timestamp', '')}"
            )

        return "\n".join(lines)
