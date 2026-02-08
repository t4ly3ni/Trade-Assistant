#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BVMT Investment Advisor - Entry point.

Runs the CrewAI crew for Scenario 1: Beginner investor Ahmed.

Usage:
    cd python/
    python -m agent.main                       # Full crew run
    python -m agent.main --stock SFBT          # Single stock analysis
    python -m agent.main --quick               # Quick mode (single stock for TUNTEL)

Environment variables:
    OPENROUTER_API_KEY  - Required (LLM calls via OpenRouter)
    SERPER_API_KEY      - Optional, enables live web search for news
"""

import argparse
import json
import os
import sys

# Ensure the python/ root is on sys.path
_here = os.path.dirname(os.path.abspath(__file__))
_python_root = os.path.dirname(_here)
if _python_root not in sys.path:
    sys.path.insert(0, _python_root)

from agent.crew import BVMTInvestmentCrew


def print_banner():
    print()
    print("=" * 62)
    print("  BVMT Investment Advisor -- CrewAI System")
    print("  Bourse de Tunis Intelligent Assistant")
    print("-" * 62)
    print("  Scenario: Ahmed, 28 ans, ingenieur, 5000 TND")
    print("  Profile: Modere | Focus: Tunisie Telecom")
    print("=" * 62)
    print()


def run_full_scenario(args):
    """Execute the complete Scenario 1 crew."""
    crew = BVMTInvestmentCrew(model=args.model)

    print("\n🚀 Running full investment advisor crew...\n")
    print("  Step 1: Assessing investor profile")
    print("  Step 2: Analyzing BVMT market data")
    print("  Step 3: Researching stock news & sentiment")
    print("  Step 4: Detecting market anomalies")
    print("  Step 5: Building portfolio recommendation")
    print("  Step 6: Explaining recommendation to investor")
    print()

    result = crew.run(
        investor_name=args.name,
        investor_age=args.age,
        investor_occupation=args.occupation,
        investment_amount=args.capital,
        investment_horizon=args.horizon,
        risk_answers=args.risk_answers,
        focus_stock=args.focus,
        stock_tickers=args.tickers,
        investor_question=args.question,
        investor_profile=args.profile,
    )

    print("\n" + "=" * 60)
    print("  FINAL RESULT")
    print("=" * 60)
    print(result)
    return result


def run_stock_analysis(args):
    """Quick single-stock analysis."""
    crew = BVMTInvestmentCrew(model=args.model)

    print(f"\nAnalyzing stock: {args.stock}\n")

    result = crew.run_single_stock_analysis(
        ticker=args.stock,
        investor_name=args.name,
        investor_profile=args.profile,
        investment_amount=args.capital,
    )

    print("\n" + "=" * 60)
    print(f"  ANALYSIS: {args.stock}")
    print("=" * 60)
    print(result)
    return result


def main():
    parser = argparse.ArgumentParser(
        description="BVMT Investment Advisor - CrewAI multi-agent system"
    )

    parser.add_argument(
        "--model", default="openrouter/google/gemini-2.0-flash-001",
        help="OpenRouter model to use (default: google/gemini-2.0-flash-001)",
    )

    # Mode selection
    parser.add_argument(
        "--quick", action="store_true",
        help="Quick mode: single stock analysis for the focus stock",
    )
    parser.add_argument(
        "--stock", type=str, default="",
        help="Analyze a specific stock (e.g. --stock SFBT)",
    )

    # Investor details
    parser.add_argument("--name", default="Ahmed", help="Investor name")
    parser.add_argument("--age", type=int, default=28, help="Investor age")
    parser.add_argument("--occupation", default="ingenieur", help="Occupation")
    parser.add_argument("--capital", type=float, default=5000, help="Capital in TND")
    parser.add_argument(
        "--horizon", default="moyen terme (1-3 ans)",
        help="Investment horizon",
    )
    parser.add_argument(
        "--risk-answers",
        default=(
            "Je prefere un rendement modere avec peu de risque. "
            "Je peux tolerer une perte temporaire de 10-15% maximum. "
            "Je n'ai pas besoin de cet argent dans l'immediat."
        ),
        help="Risk tolerance description",
    )
    parser.add_argument("--focus", default="TUNTEL", help="Focus stock ticker")
    parser.add_argument(
        "--tickers", default="TUNTEL, SFBT, BIAT, PGH, NAKL",
        help="Comma-separated list of tickers to analyze",
    )
    parser.add_argument(
        "--question",
        default="Pourquoi devrais-je acheter Tunisie Telecom?",
        help="Investor question to answer",
    )
    parser.add_argument(
        "--profile", default="Modéré",
        help="Pre-set investor profile (Conservateur/Modéré/Dynamique)",
    )

    args = parser.parse_args()
    print_banner()

    # Check for API key
    if not os.environ.get("OPENROUTER_API_KEY"):
        print("WARNING: OPENROUTER_API_KEY not set. CrewAI needs an LLM API key.")
        print('   Set it with: $env:OPENROUTER_API_KEY = "sk-or-..."')
        print("   Or create a .env file in the python/ directory.\n")
        sys.exit(1)

    if args.stock:
        return run_stock_analysis(args)
    elif args.quick:
        args.stock = args.focus
        return run_stock_analysis(args)
    else:
        return run_full_scenario(args)


if __name__ == "__main__":
    main()
