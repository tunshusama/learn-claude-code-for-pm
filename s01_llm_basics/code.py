#!/usr/bin/env python3
"""s01: minimal stateless LLM chat loop."""

import os

from anthropic import Anthropic
from dotenv import load_dotenv


load_dotenv(override=True)

if os.getenv("ANTHROPIC_BASE_URL"):
    os.environ.pop("ANTHROPIC_AUTH_TOKEN", None)

client = Anthropic(base_url=os.getenv("ANTHROPIC_BASE_URL"))
MODEL = os.getenv("MODEL_ID")
SYSTEM = "你是一个简洁、耐心的 AI 基础课助教。"


def require_setup() -> None:
    missing = []
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key or api_key.endswith("xxx") or api_key.startswith("your_"):
        missing.append("ANTHROPIC_API_KEY")
    if not MODEL:
        missing.append("MODEL_ID")
    if missing:
        names = ", ".join(missing)
        raise SystemExit(
            f"请先在项目根目录的 .env 里配置 {names}，然后重新运行本课。"
        )


def call_model(messages: list[dict]) -> str:
    chunks = []
    with client.messages.stream(
        model=MODEL,
        system=SYSTEM,
        messages=messages,
        max_tokens=1200,
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
            chunks.append(text)
    return "".join(chunks)


if __name__ == "__main__":
    require_setup()
    print("s01: LLM basics")
    print("输入 /exit 退出。试试先说“我叫小王”，再问“我叫什么名字？”。\n")

    messages: list[dict] = []
    while True:
        user_input = input("你: ").strip()
        if user_input == "/exit":
            print("再见！")
            break
        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})
        print("模型: ", end="", flush=True)
        answer = call_model(messages)
        print("\n")
        messages.append({"role": "assistant", "content": answer})
