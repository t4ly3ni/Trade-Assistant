"""
Entry point for the BVMT Market API server.

Usage:
    py run.py              # Start on default port 8000
    py run.py --port 3001  # Custom port
    py run.py --reload     # Auto-reload on code changes (dev)
"""

import argparse
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="BVMT Market API Server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev mode)")
    args = parser.parse_args()

    print(f"\n  BVMT Market API")
    print(f"  ───────────────────────────────")
    print(f"  Server:  http://{args.host}:{args.port}")
    print(f"  Docs:    http://{args.host}:{args.port}/docs")
    print(f"  Reload:  {'ON' if args.reload else 'OFF'}")
    print(f"  ───────────────────────────────\n")

    uvicorn.run(
        "bvmt.api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
