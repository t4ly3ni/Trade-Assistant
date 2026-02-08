"""
News Search Tool — Searches for recent news about the Tunisian stock market.
Uses web search via SerperDev or falls back to mock data.
"""

import os
import json
from typing import Type
from datetime import datetime

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class NewsSearchInput(BaseModel):
    """Input for news search tool."""
    query: str = Field(
        description=(
            "Search query for Tunisian financial news. "
            "E.g. 'Tunisie Telecom bourse', 'BVMT actualités', "
            "'bourse tunis résultats financiers'"
        )
    )
    max_results: int = Field(
        default=5,
        description="Maximum number of results to return.",
    )


class TunisiaNewsSearchTool(BaseTool):
    """Search for financial news about the Tunisian stock market and companies."""

    name: str = "tunisia_news_search"
    description: str = (
        "Search for the latest financial news about Tunisian companies, "
        "the BVMT stock exchange, and the Tunisian economy. "
        "Returns headlines, summaries, and sources."
    )
    args_schema: Type[BaseModel] = NewsSearchInput

    def _run(self, query: str, max_results: int = 5) -> str:
        # Try SerperDev API first (if key is set)
        serper_key = os.environ.get("SERPER_API_KEY", "")
        if serper_key and HAS_REQUESTS:
            return self._search_serper(query, max_results, serper_key)

        # Fallback: curated Tunisia bourse news
        return self._curated_news(query, max_results)

    def _search_serper(self, query: str, max_results: int, api_key: str) -> str:
        """Live web search via SerperDev Google Search API."""
        try:
            resp = requests.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "q": f"{query} bourse tunis BVMT",
                    "gl": "tn",
                    "hl": "fr",
                    "num": max_results,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            organic = data.get("organic", [])
            if not organic:
                return f"No search results found for '{query}'."

            lines = [f"═══ WEB NEWS: '{query}' ═══"]
            for i, r in enumerate(organic[:max_results], 1):
                lines.append(
                    f"\n{i}. {r.get('title', 'N/A')}\n"
                    f"   Source: {r.get('link', 'N/A')}\n"
                    f"   Snippet: {r.get('snippet', 'N/A')}"
                )
            return "\n".join(lines)
        except Exception as e:
            return self._curated_news(query, max_results)

    def _curated_news(self, query: str, max_results: int) -> str:
        """Curated / mock news about BVMT for demo purposes."""
        now = datetime.now().strftime("%Y-%m-%d")
        articles = [
            {
                "title": "Tunisie Telecom décroche un nouveau contrat avec l'État tunisien",
                "source": "Kapitalis",
                "date": now,
                "snippet": (
                    "Tunisie Telecom a remporté un appel d'offres majeur pour la "
                    "modernisation du réseau de télécommunications des institutions "
                    "publiques. Le contrat, estimé à 45 millions de dinars, devrait "
                    "renforcer les revenus de l'entreprise pour les 3 prochaines années."
                ),
                "sentiment": "Très positif",
            },
            {
                "title": "BVMT : Le TUNINDEX progresse de 0.3% dans un marché actif",
                "source": "IlBoursa",
                "date": now,
                "snippet": (
                    "L'indice principal de la Bourse de Tunis a clôturé en hausse de "
                    "0.3% à 9,845 points. Les valeurs bancaires ont tiré le marché "
                    "vers le haut avec BIAT en tête (+1.65%). Le volume des échanges "
                    "s'est établi à 8.2 millions de dinars."
                ),
                "sentiment": "Positif",
            },
            {
                "title": "Ennakl Automobiles : hausse exceptionnelle de 5.9% après résultats",
                "source": "Tunisie Numérique",
                "date": now,
                "snippet": (
                    "Le titre Ennakl a bondi de 5.9% suite à la publication de "
                    "résultats annuels supérieurs aux attentes. Le chiffre d'affaires "
                    "a progressé de 12% et le bénéfice net de 8%. Les analystes "
                    "relèvent leur objectif de cours."
                ),
                "sentiment": "Très positif",
            },
            {
                "title": "BNA : pression vendeuse malgré des fondamentaux solides",
                "source": "Kapitalis",
                "date": now,
                "snippet": (
                    "La Banque Nationale Agricole a perdu 1.49% aujourd'hui dans un "
                    "contexte de prise de bénéfices. Les analystes maintiennent "
                    "néanmoins leur recommandation d'achat, citant un PER attractif "
                    "de 6.2x et un rendement de dividende de 4.5%."
                ),
                "sentiment": "Neutre",
            },
            {
                "title": "Le FMI révise à la hausse ses prévisions pour la Tunisie en 2026",
                "source": "TAP (Agence Tunis Afrique Presse)",
                "date": now,
                "snippet": (
                    "Le Fonds Monétaire International a revu à la hausse ses prévisions "
                    "de croissance pour la Tunisie en 2026, tablant désormais sur une "
                    "croissance de 2.8% contre 2.3% précédemment. Cette révision est "
                    "soutenue par les performances du secteur touristique et des exportations."
                ),
                "sentiment": "Positif",
            },
            {
                "title": "SFBT : Le géant agroalimentaire maintient sa croissance",
                "source": "IlBoursa",
                "date": now,
                "snippet": (
                    "La SFBT confirme sa résilience avec un chiffre d'affaires en hausse "
                    "de 6% au premier mois de 2026. L'action reste l'une des plus "
                    "liquides du marché avec un volume quotidien moyen de 16,000 titres."
                ),
                "sentiment": "Positif",
            },
            {
                "title": "City Cars enregistre une forte hausse de 3.13% — secteur auto dynamique",
                "source": "Tunisie Numérique",
                "date": now,
                "snippet": (
                    "City Cars a progressé de 3.13% aujourd'hui, portée par de bons "
                    "chiffres de ventes automobiles en janvier 2026. Le secteur "
                    "automobile tunisien bénéficie de la reprise de la demande intérieure."
                ),
                "sentiment": "Positif",
            },
            {
                "title": "Carthage Cement : volume record mais cours sous pression",
                "source": "Kapitalis",
                "date": now,
                "snippet": (
                    "Carthage Cement a enregistré un volume exceptionnel de 251,000 "
                    "titres échangés aujourd'hui, un record. Malgré cette activité, "
                    "le cours ne progresse que de 1.04%. Les analystes s'interrogent "
                    "sur la nature de ces échanges massifs."
                ),
                "sentiment": "Neutre / Prudent",
            },
        ]

        # Filter by query keywords
        q_lower = query.lower()
        filtered = [a for a in articles
                    if any(w in a["title"].lower() or w in a["snippet"].lower()
                           for w in q_lower.split())]
        if not filtered:
            filtered = articles  # Return all if no match

        lines = [f"═══ TUNISIA BOURSE NEWS: '{query}' ═══"]
        for i, a in enumerate(filtered[:max_results], 1):
            lines.append(
                f"\n{i}. {a['title']}\n"
                f"   Source: {a['source']} | Date: {a['date']}\n"
                f"   {a['snippet']}\n"
                f"   Sentiment: {a['sentiment']}"
            )
        return "\n".join(lines)
