#!/usr/bin/env python3
"""s00: environment check helper."""

from pathlib import Path
import os

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=True)


def check_file(name: str) -> str:
    path = ROOT / name
    return "ok" if path.exists() else "missing"


def check_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        return "missing"
    if value.endswith("xxx") or value.startswith("your_") or value == "placeholder":
        return "placeholder"
    return "ok"


def check_api_key() -> str:
    candidates = ("ANTHROPIC_API_KEY", "OPENAI_API_KEY")
    results = [(name, check_env(name)) for name in candidates]
    for name, status in results:
        if status == "ok":
            return f"ok ({name})"
    placeholders = [name for name, status in results if status == "placeholder"]
    if placeholders:
        return f"placeholder ({', '.join(placeholders)})"
    return "missing"


if __name__ == "__main__":
    print("s00: setup check")
    print(f"project root: {ROOT}")
    print(f"requirements.txt: {check_file('requirements.txt')}")
    print(f".env.example: {check_file('.env.example')}")
    print(f".env: {check_file('.env')}")
    print(f"API_KEY: {check_api_key()}")
    print(f"MODEL_ID: {check_env('MODEL_ID')}")
