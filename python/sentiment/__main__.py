"""
Package entrypoint — allows `python -m sentiment` to start the API.

Usage (from the repo root):
    python -m sentiment
"""

import sys
import os

# Ensure the repo root is on sys.path so `sentiment` resolves as a package
_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from sentiment.api import main  # noqa: E402

if __name__ == "__main__":
    main()
