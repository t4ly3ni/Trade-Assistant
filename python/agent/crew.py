"""
BVMT Investment Advisor Crew — CrewAI orchestration.

Implements Scenario 1: Beginner investor (Ahmed) seeking personalised
investment guidance on the Bourse de Tunis.

Flow:
  1. Profile assessment  → risk profile + allocation strategy
  2. Market analysis     → current market snapshot + stock picks
  3. News research       → sentiment + catalysts for target stocks
  4. Anomaly detection   → risk flags
  5. Portfolio build     → concrete recommendations
  6. Explanation         → beginner-friendly answer to "why?"
"""

import os
import yaml
from typing import Any

from dotenv import load_dotenv

# Load .env from python/ directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from crewai import Agent, Crew, Process, Task, LLM
from crewai.tools import BaseTool

# ─── Tools ──────────────────────────────────────────────────────────────────
from .tools.market_data import MarketDataTool
from .tools.anomaly_detection import AnomalyDetectionTool
from .tools.sentiment import SentimentAnalysisTool
from .tools.news_search import TunisiaNewsSearchTool
from .tools.portfolio import PortfolioCalculatorTool


CONFIG_DIR = os.path.join(os.path.dirname(__file__), "config")


def _load_yaml(name: str) -> dict:
    path = os.path.join(CONFIG_DIR, name)
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


class BVMTInvestmentCrew:
    """
    CrewAI crew that guides a beginner investor through the BVMT.

    Usage:
        crew = BVMTInvestmentCrew()
        result = crew.run(
            investor_name="Ahmed",
            investor_age=28,
            investor_occupation="ingénieur",
            investment_amount=5000,
            investment_horizon="moyen terme (1-3 ans)",
            risk_answers="Je préfère un rendement modéré avec peu de risque. "
                         "Je peux tolérer une perte de 10% maximum.",
            focus_stock="TUNTEL",
            investor_question="Pourquoi devrais-je acheter Tunisie Telecom ?",
        )
    """

    def __init__(self, model: str = "openrouter/google/gemini-2.0-flash-001") -> None:
        self.agents_config = _load_yaml("agents.yaml")
        self.tasks_config = _load_yaml("tasks.yaml")

        # LLM via OpenRouter
        self.llm = LLM(
            model=model,
            api_key=os.environ.get("OPENROUTER_API_KEY", ""),
            base_url="https://openrouter.ai/api/v1",
        )

        # Instantiate tools (shared across agents)
        self.market_tool = MarketDataTool()
        self.anomaly_tool = AnomalyDetectionTool()
        self.sentiment_tool = SentimentAnalysisTool()
        self.news_tool = TunisiaNewsSearchTool()
        self.portfolio_tool = PortfolioCalculatorTool()

    # ─── Agent factories ────────────────────────────────────────────────

    def _make_agent(self, key: str, tools: list[BaseTool] | None = None) -> Agent:
        cfg = self.agents_config[key]
        return Agent(
            role=cfg["role"].strip(),
            goal=cfg["goal"].strip(),
            backstory=cfg["backstory"].strip(),
            tools=tools or [],
            verbose=True,
            allow_delegation=False,
            llm=self.llm,
        )

    def _build_agents(self) -> dict[str, Agent]:
        return {
            "profile_analyst": self._make_agent("profile_analyst"),
            "market_analyst": self._make_agent(
                "market_analyst",
                [self.market_tool],
            ),
            "news_researcher": self._make_agent(
                "news_researcher",
                [self.news_tool, self.sentiment_tool],
            ),
            "anomaly_detector": self._make_agent(
                "anomaly_detector",
                [self.anomaly_tool, self.market_tool],
            ),
            "portfolio_advisor": self._make_agent(
                "portfolio_advisor",
                [self.portfolio_tool, self.market_tool],
            ),
            "investment_chatbot": self._make_agent("investment_chatbot"),
        }

    # ─── Task factories ────────────────────────────────────────────────

    def _build_tasks(
        self,
        agents: dict[str, Agent],
        inputs: dict[str, Any],
    ) -> list[Task]:
        tc = self.tasks_config

        # 1. Profile assessment
        t1 = Task(
            description=tc["assess_investor_profile"]["description"].format(**inputs),
            expected_output=tc["assess_investor_profile"]["expected_output"],
            agent=agents["profile_analyst"],
        )

        # 2. Market analysis (depends on profile)
        t2 = Task(
            description=tc["analyze_market_data"]["description"].format(**inputs),
            expected_output=tc["analyze_market_data"]["expected_output"],
            agent=agents["market_analyst"],
            context=[t1],
        )

        # 3. News & sentiment (can run alongside market analysis conceptually,
        #    but we chain after t2 so the market analyst's picks feed the query)
        t3 = Task(
            description=tc["research_stock_news"]["description"].format(**inputs),
            expected_output=tc["research_stock_news"]["expected_output"],
            agent=agents["news_researcher"],
            context=[t2],
        )

        # 4. Anomaly detection
        t4 = Task(
            description=tc["detect_anomalies"]["description"].format(**inputs),
            expected_output=tc["detect_anomalies"]["expected_output"],
            agent=agents["anomaly_detector"],
            context=[t2],
        )

        # 5. Portfolio construction (needs all prior analyses)
        t5 = Task(
            description=tc["build_portfolio"]["description"].format(**inputs),
            expected_output=tc["build_portfolio"]["expected_output"],
            agent=agents["portfolio_advisor"],
            context=[t1, t2, t3, t4],
        )

        # 6. Explanation for the investor
        t6 = Task(
            description=tc["explain_recommendation"]["description"].format(**inputs),
            expected_output=tc["explain_recommendation"]["expected_output"],
            agent=agents["investment_chatbot"],
            context=[t1, t2, t3, t4, t5],
        )

        return [t1, t2, t3, t4, t5, t6]

    # ─── Public API ─────────────────────────────────────────────────────

    def run(
        self,
        investor_name: str = "Ahmed",
        investor_age: int = 28,
        investor_occupation: str = "ingénieur",
        investment_amount: float = 5000,
        investment_horizon: str = "moyen terme (1-3 ans)",
        risk_answers: str = (
            "Je préfère un rendement modéré avec peu de risque. "
            "Je peux tolérer une perte temporaire de 10-15% maximum. "
            "Je n'ai pas besoin de cet argent dans l'immédiat."
        ),
        focus_stock: str = "TUNTEL",
        stock_tickers: str = "TUNTEL, SFBT, BIAT, PGH, NAKL",
        investor_question: str = "Pourquoi devrais-je acheter Tunisie Telecom ?",
        investor_profile: str = "Modéré",
    ) -> Any:
        """
        Execute the full investment advisor crew.

        Returns the CrewOutput with all task results.
        """
        inputs = {
            "investor_name": investor_name,
            "investor_age": investor_age,
            "investor_occupation": investor_occupation,
            "investment_amount": investment_amount,
            "investment_horizon": investment_horizon,
            "risk_answers": risk_answers,
            "focus_stock": focus_stock,
            "stock_tickers": stock_tickers,
            "investor_question": investor_question,
            "investor_profile": investor_profile,
        }

        agents = self._build_agents()
        tasks = self._build_tasks(agents, inputs)

        crew = Crew(
            agents=list(agents.values()),
            tasks=tasks,
            process=Process.sequential,
            verbose=True,
        )

        return crew.kickoff()

    def run_single_stock_analysis(
        self,
        ticker: str,
        investor_name: str = "Ahmed",
        investor_profile: str = "Modéré",
        investment_amount: float = 5000,
    ) -> Any:
        """
        Quick analysis of a single stock — market data + sentiment + anomaly check.
        Lighter than the full crew run.
        """
        agents = self._build_agents()

        t_market = Task(
            description=(
                f"Get detailed market data for the stock '{ticker}' on BVMT. "
                f"Include current price, variation, volume, order book."
            ),
            expected_output="Detailed stock data with price, volume, and trend.",
            agent=agents["market_analyst"],
        )

        t_sentiment = Task(
            description=(
                f"Analyze news sentiment for '{ticker}'. Search for recent "
                f"headlines and assess whether sentiment is positive or negative."
            ),
            expected_output="Sentiment score and key news headlines.",
            agent=agents["news_researcher"],
            context=[t_market],
        )

        t_anomaly = Task(
            description=(
                f"Check if '{ticker}' has any anomaly alerts — volume spikes, "
                f"price anomalies, order imbalances."
            ),
            expected_output="Anomaly status: safe or flagged with details.",
            agent=agents["anomaly_detector"],
            context=[t_market],
        )

        t_explain = Task(
            description=(
                f"Based on the market data, sentiment, and anomaly analysis, "
                f"give {investor_name} (profil {investor_profile}, capital "
                f"{investment_amount} TND) a clear recommendation for '{ticker}'. "
                f"Should they BUY, HOLD, or AVOID? Explain simply."
            ),
            expected_output=(
                "Clear buy/hold/avoid recommendation with explanation "
                "a beginner can understand."
            ),
            agent=agents["investment_chatbot"],
            context=[t_market, t_sentiment, t_anomaly],
        )

        crew = Crew(
            agents=[
                agents["market_analyst"],
                agents["news_researcher"],
                agents["anomaly_detector"],
                agents["investment_chatbot"],
            ],
            tasks=[t_market, t_sentiment, t_anomaly, t_explain],
            process=Process.sequential,
            verbose=True,
        )

        return crew.kickoff()
