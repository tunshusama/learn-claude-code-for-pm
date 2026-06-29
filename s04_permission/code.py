#!/usr/bin/env python3
"""s04: permission gate before tool execution."""

import glob
import os
import subprocess
from pathlib import Path
from typing import Any, Callable, Optional

from anthropic import Anthropic
from dotenv import load_dotenv


load_dotenv(override=True)

if os.getenv("ANTHROPIC_BASE_URL"):
    os.environ.pop("ANTHROPIC_AUTH_TOKEN", None)

WORKDIR = Path.cwd()
client = Anthropic(base_url=os.getenv("ANTHROPIC_BASE_URL"))
MODEL = os.getenv("MODEL_ID")
SYSTEM = (
    f"你是运行在 {WORKDIR} 的教学版 coding agent。"
    "优先使用专用文件工具完成读写查找任务；需要 shell 时再使用 bash。"
    "工具真正执行前会经过 Harness 的权限判断。"
    "行动后用简洁中文汇报结果。"
)


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


def safe_path(path: str) -> Path:
    file_path = (WORKDIR / path).resolve()
    if not file_path.is_relative_to(WORKDIR):
        raise ValueError(f"路径不能离开当前项目目录: {path}")
    return file_path


def path_escapes_workspace(path: str) -> bool:
    return not (WORKDIR / path).resolve().is_relative_to(WORKDIR)


def run_bash(command: str) -> str:
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=WORKDIR,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        output = (result.stdout + result.stderr).strip()
        return output[:50000] if output else "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: Timeout (120s)"
    except (FileNotFoundError, OSError) as error:
        return f"Error: {error}"


def run_read(path: str, limit: Optional[int] = None) -> str:
    try:
        lines = safe_path(path).read_text(encoding="utf-8").splitlines()
        if limit and limit < len(lines):
            hidden = len(lines) - limit
            lines = lines[:limit] + [f"... ({hidden} more lines)"]
        return "\n".join(lines)
    except Exception as error:
        return f"Error: {error}"


def run_write(path: str, content: str) -> str:
    try:
        file_path = safe_path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        return f"Wrote {len(content)} characters to {path}"
    except Exception as error:
        return f"Error: {error}"


def run_edit(path: str, old_text: str, new_text: str) -> str:
    try:
        file_path = safe_path(path)
        text = file_path.read_text(encoding="utf-8")
        if old_text not in text:
            return f"Error: text not found in {path}"
        file_path.write_text(text.replace(old_text, new_text, 1), encoding="utf-8")
        return f"Edited {path}"
    except Exception as error:
        return f"Error: {error}"


def run_glob(pattern: str) -> str:
    try:
        matches = []
        for match in glob.glob(pattern, root_dir=WORKDIR, recursive=True):
            if (WORKDIR / match).resolve().is_relative_to(WORKDIR):
                matches.append(match)
        return "\n".join(sorted(matches)) if matches else "(no matches)"
    except Exception as error:
        return f"Error: {error}"


TOOLS = [
    {
        "name": "bash",
        "description": "Run a shell command.",
        "input_schema": {
            "type": "object",
            "properties": {"command": {"type": "string"}},
            "required": ["command"],
        },
    },
    {
        "name": "read_file",
        "description": "Read a file from the current project.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "limit": {"type": "integer"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write text to a file in the current project.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "edit_file",
        "description": "Replace exact text in a file once.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old_text": {"type": "string"},
                "new_text": {"type": "string"},
            },
            "required": ["path", "old_text", "new_text"],
        },
    },
    {
        "name": "glob",
        "description": "Find project files matching a glob pattern.",
        "input_schema": {
            "type": "object",
            "properties": {"pattern": {"type": "string"}},
            "required": ["pattern"],
        },
    },
]

TOOL_HANDLERS: dict[str, Callable[..., str]] = {
    "bash": run_bash,
    "read_file": run_read,
    "write_file": run_write,
    "edit_file": run_edit,
    "glob": run_glob,
}


DENY_LIST = ["rm -rf /", "sudo", "shutdown", "reboot", "mkfs", "dd if=", "> /dev/sda"]
DESTRUCTIVE_COMMAND_HINTS = ["rm ", "mv ", "chmod 777", "> /etc/", "curl ", "wget "]


def check_deny_list(command: str) -> Optional[str]:
    for pattern in DENY_LIST:
        if pattern in command:
            return f"Blocked: '{pattern}' is on the deny list."
    return None


def check_rules(tool_name: str, tool_input: dict[str, Any]) -> Optional[str]:
    if tool_name in ("write_file", "edit_file"):
        path = str(tool_input.get("path", ""))
        if path_escapes_workspace(path):
            return f"Writing outside the workspace: {path}"

    if tool_name == "bash":
        command = str(tool_input.get("command", ""))
        if any(hint in command for hint in DESTRUCTIVE_COMMAND_HINTS):
            return f"Potentially destructive shell command: {command}"

    return None


def ask_user(tool_name: str, tool_input: dict[str, Any], reason: str) -> str:
    print(f"\n\033[33m权限确认: {reason}\033[0m")
    print(f"工具: {tool_name}")
    print(f"参数: {tool_input}")
    choice = input("允许执行吗？[y/N] ").strip().lower()
    return "allow" if choice in ("y", "yes") else "deny"


def check_permission(tool_name: str, tool_input: dict[str, Any]) -> tuple[bool, str]:
    if tool_name == "bash":
        reason = check_deny_list(str(tool_input.get("command", "")))
        if reason:
            return False, reason

    reason = check_rules(tool_name, tool_input)
    if reason:
        decision = ask_user(tool_name, tool_input, reason)
        if decision == "deny":
            return False, f"Permission denied by user: {reason}"

    return True, "Permission allowed."


def dispatch_tool(name: str, tool_input: dict[str, Any]) -> str:
    handler = TOOL_HANDLERS.get(name)
    if handler is None:
        return f"Error: unknown tool {name}"
    return handler(**tool_input)


def agent_loop(messages: list[dict[str, Any]]) -> None:
    while True:
        response = client.messages.create(
            model=MODEL,
            system=SYSTEM,
            messages=messages,
            tools=TOOLS,
            max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue

            tool_input = dict(block.input)
            print(f"\033[33m工具: {block.name} {tool_input}\033[0m")

            allowed, reason = check_permission(block.name, tool_input)
            if not allowed:
                print(f"\033[31m拦截: {reason}\033[0m\n")
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": reason,
                    }
                )
                continue

            output = dispatch_tool(block.name, tool_input)
            print(f"结果: {output[:200]}\n")
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                }
            )

        messages.append({"role": "user", "content": results})


def print_final_text(messages: list[dict[str, Any]]) -> None:
    content = messages[-1]["content"]
    if isinstance(content, str):
        print(content)
        return
    for block in content:
        if getattr(block, "type", None) == "text":
            print(block.text)


if __name__ == "__main__":
    require_setup()
    print("s04: Permission")
    print("输入 /exit 退出。试试读文件、创建文件、删除文件、写入 /etc。\n")

    history: list[dict[str, Any]] = []
    while True:
        user_input = input("你: ").strip()
        if user_input == "/exit":
            print("再见！")
            break
        if not user_input:
            continue

        history.append({"role": "user", "content": user_input})
        agent_loop(history)
        print("模型: ", end="")
        print_final_text(history)
        print()
