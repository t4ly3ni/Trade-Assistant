"""
Configuration constants for the BVMT Sentiment Analysis module.
Centralizes keywords, stock data, thresholds, and source definitions.
"""

from typing import Dict, List

# ── Analysis thresholds ─────────────────────────────────────────────────────

POSITIVE_THRESHOLD: float = 0.3
NEGATIVE_THRESHOLD: float = -0.3
SCORE_SOFTENING_THRESHOLD: float = 0.8
SCORE_SOFTENING_FACTOR: float = 0.9
LOW_KEYWORD_COUNT: int = 3
LOW_KEYWORD_DAMPENING: float = 0.85
CONTEXT_DAMPENING_FACTOR: float = 0.7
MAX_KEYWORD_OCCURRENCES: int = 3
MAX_CONFIDENCE: float = 0.95
BASE_CONFIDENCE: float = 0.5

# ── API settings ────────────────────────────────────────────────────────────

API_HOST: str = "0.0.0.0"
API_PORT: int = 8001
API_VERSION: str = "2.0"

# ── Stock symbols ───────────────────────────────────────────────────────────

STOCK_SYMBOLS: List[str] = [
    "ATB", "TUNTEL", "BH", "STB", "AB",
    "ADWYA", "AMS", "CELL", "SIPHAT", "UIB",
]

# ── Company data ────────────────────────────────────────────────────────────

COMPANY_DATA: Dict[str, Dict[str, str]] = {
    "ATB":    {"fr": "Arab Tunisian Bank",                 "ar": "البنك العربي التونسي",  "sector": "bancaire"},
    "TUNTEL": {"fr": "Tunisie Telecom",                    "ar": "تونسيّة للإتصالات",      "sector": "télécommunications"},
    "BH":     {"fr": "Banque de l'Habitat",                "ar": "البنك العقاري",          "sector": "bancaire"},
    "STB":    {"fr": "Société Tunisienne de Banque",        "ar": "البنك التونسي",          "sector": "bancaire"},
    "AB":     {"fr": "Amen Bank",                          "ar": "بنك آمن",                "sector": "bancaire"},
    "ADWYA":  {"fr": "Adwya Assurances",                   "ar": "أضواء للتأمين",           "sector": "assurances"},
    "AMS":    {"fr": "Assurances Maghrébines",              "ar": "التأمينات المغاربية",     "sector": "assurances"},
    "CELL":   {"fr": "Cellulose",                          "ar": "السللوز",                "sector": "industrie"},
    "SIPHAT": {"fr": "Société Industrielle Pharmaceutique", "ar": "الصناعات الدوائية",       "sector": "pharmaceutique"},
    "UIB":    {"fr": "Union Internationale de Banques",     "ar": "الاتحاد الدولي للبنوك",  "sector": "bancaire"},
}

# ── News sources ────────────────────────────────────────────────────────────

NEWS_SOURCES: Dict[str, Dict[str, str]] = {
    "kapitalis":        {"name": "Kapitalis",         "url": "https://kapitalis.com",        "language": "fr"},
    "ilboursa":         {"name": "IlBoursa",          "url": "https://ilboursa.com",         "language": "ar"},
    "tunisienumerique": {"name": "Tunisie Numérique", "url": "https://tunisienumerique.com", "language": "fr"},
}

# ── Sentiment keywords (duplicates removed) ────────────────────────────────

FR_POSITIVE: List[str] = [
    "bon", "excellent", "positif", "hausse", "croissance",
    "profit", "réussite", "fort", "solide", "augmentation",
    "bénéfice", "dividende", "record", "meilleur", "performance",
    "progrès", "avancée", "succès", "rentable", "gain",
    "supérieur", "excédent", "solde positif", "boni", "excédentaire",
]

FR_POSITIVE_STRONG: List[str] = [
    "excellent", "exceptionnel", "exceptionnels", "record", "records",
    "profit", "profits", "croissance", "succès", "réussite",
]

FR_NEGATIVE: List[str] = [
    "mauvais", "négatif", "baisse", "perte", "échec",
    "problème", "crise", "faible", "déclin", "chute",
    "déficit", "ralentissement", "risque", "avertissement",
    "difficulté", "challenge", "dette",
    "inférieur", "déficitaire", "solde négatif", "mali", "dégressif",
]

AR_POSITIVE: List[str] = [
    "جيد", "ممتاز", "إيجابي", "ارتفاع", "نمو", "ربح", "نجاح",
    "قوي", "متين", "زيادة", "مكسب", "أداء", "قياسي", "توزيع",
    "أفضل", "تقدم", "تطور", "فوز", "مربح", "ربحية",
    "متفوق", "فائض", "رصيد إيجابي", "فائضي",
]

AR_NEGATIVE: List[str] = [
    "سيء", "سلبي", "انخفاض", "خسارة", "فشل", "مشكلة", "أزمة",
    "ضعيف", "تراجع", "سقوط", "عجز", "تباطؤ", "خطر", "تحذير",
    "صعوبة", "تحدي", "دين", "خسائر", "إخفاق",
    "أدنى", "عاجز", "رصيد سلبي", "منخفض",
]

EN_POSITIVE: List[str] = [
    "good", "excellent", "positive", "rise", "growth", "profit",
    "success", "strong", "solid", "increase", "gain", "dividend",
    "record", "improvement", "advance", "achievement", "profitable",
    "superior", "surplus", "positive balance", "bonus", "excess",
]

EN_NEGATIVE: List[str] = [
    "bad", "negative", "fall", "loss", "failure", "problem",
    "crisis", "weak", "decline", "drop", "deficit", "slowdown",
    "risk", "warning", "difficulty", "challenge", "debt",
    "inferior", "negative balance", "deficient",
]

NEUTRAL_WORDS: List[str] = [
    "stable", "stables", "stabilité", "مستقر", "maintain", "maintenir",
    "maintien", "mixed", "mixte", "مختلط", "significatif", "changement",
    "equal", "équilibré", "balance", "maintained", "maintenue", "stability",
    "overall", "résultats", "results", "context",
]

CONTEXT_MODIFIERS: List[str] = [
    "pas de", "pas d'", "sans", "aucun", "aucune",
    "لا يوجد", "no ", "not ", "ni ", "ne ", "n'", "jamais", "never",
]

POSITIVE_NEUTRAL_CONTEXT_WORDS: List[str] = ["performance", "performances", "أداء"]

# ── Company-specific keywords ──────────────────────────────────────────────

COMPANY_KEYWORDS: Dict[str, Dict[str, List[str]]] = {
    "ATB": {
        "positive": ["banque", "bank", "finance", "crédit", "prêt", "dépôt"],
        "negative": ["faillite", "bankruptcy", "défaut", "dette", "crise bancaire"],
    },
    "TUNTEL": {
        "positive": ["télécom", "telecom", "mobile", "data", "internet", "5g"],
        "negative": ["concurrence", "competition", "satellite", "fibre", "interruption"],
    },
    "BH": {
        "positive": ["immobilier", "real estate", "property", "logement", "construction"],
        "negative": ["bulle", "bubble", "marché immobilier", "property crash", "vacant"],
    },
}
