# s00: 前置准备 -- 让 AI 帮你配置环境

目标：

- 确保项目文件目录是：`~/learn-claude-code-main`
- 在你的 Coding Agent 里打开 `learn-claude-code-main` 这个工作区
- 按照依赖：`requirements.txt`
- 完成配置：根目录有 `.env`，按照要求完成

本页只需要在 Coding Agent 对话里完成。标着 `TEXT` 的代码块是要复制给 Coding Agent 的话；里面即使出现终端命令，也是让 Agent 执行，不是让你自己切到终端执行。

## 复制给你的 coding agent

把下面这段完整复制给你的 Coding Agent。它会负责检查目录、创建 `.env`、安装依赖、运行检查脚本。

如果不担心 API Key 泄露，可以把你使用的模型服务、API Key 和模型名一起告诉 Agent，让它帮你写入 `.env`。如果担心，就不要把完整 API Key 发给 Agent，让它先创建 `.env` 并告诉你需要填写哪些项；你填好后再让它继续。

```text
请帮我完成这个项目的前置环境配置：

全程请你在当前 Coding Agent 里帮我完成，不要让我在终端和对话之间来回切换。每一步先说明目的，再执行。

1. 确认当前工作区是不是 ~/learn-claude-code-main。
2. 检查根目录是否有 README-zh.md、requirements.txt、.env.example、s00_setup/code.py。
3. 如果当前不是项目根目录，请切换到 ~/learn-claude-code-main，或者告诉我应该在 Coding Agent 里打开哪个工作区。
4. 检查根目录是否有 .env。如果没有，请从 .env.example 复制一份。
5. 帮我完成 .env 配置：
   - 先问我使用哪个模型服务：Anthropic、OpenAI，还是 Kimi / DeepSeek / 智谱等 Anthropic-compatible provider。
   - 如果我愿意提供 API Key 和模型名，请帮我写入 .env。
   - 如果我不愿意提供完整 API Key，请只告诉我需要填写哪些配置项，然后暂停，等我说“已填写”再继续。
   - 不要打印完整 API Key。
   - 检查 .env 时，只告诉我哪些配置项缺失，或者是否还是 sk-ant-xxx、sk-xxx、your_api_key_here、placeholder 这类占位符。
6. .env 至少需要满足：
   - Anthropic 或 Anthropic-compatible provider：ANTHROPIC_API_KEY + MODEL_ID；如果服务商需要兼容接口，还要 ANTHROPIC_BASE_URL。
   - OpenAI：OPENAI_API_KEY + MODEL_ID。
7. 如果 .env 仍然缺失或包含明显占位符，请先停下来告诉我需要修改什么，不要继续跑后面的 Python 检查。
8. 如果 .env 已经配置好，按顺序执行下面这些命令，并在执行前说明目的：

cd ~/learn-claude-code-main
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 s00_setup/code.py

每一步先给出命令，再执行。报错时先判断原因，不要直接重装全部环境。
```

这组命令的目的分别是：进入项目根目录、创建 Python 虚拟环境、激活虚拟环境、安装 `requirements.txt` 里的依赖、最后运行 s00 检查脚本。你不需要自己复制这些命令到终端，让 Coding Agent 执行和诊断即可。

检查结果类似：

```text
s00: setup check
project root: /Users/moonshot/learn-claude-code-main
requirements.txt: ok
.env.example: ok
.env: ok
API_KEY: ok (ANTHROPIC_API_KEY)
MODEL_ID: ok
```

## 报错时继续问 Agent

```text
我运行命令后看到这个错误。请先判断是目录问题、Python 问题、依赖问题，还是 .env 配置问题。

错误如下：
粘贴你的报错
```

常见错误：

- `zsh: command not found: pip`：让 Agent 改用 `python3 -m pip install -r requirements.txt`。
- `cp: .env.example: No such file or directory`：让 Agent 确认当前是否在项目根目录。
- `python3: command not found`：先安装 Python 3。macOS 可以从 `https://www.python.org/downloads/` 下载安装，安装后重新打开终端或 Coding Agent。

## 完成标志

Coding Agent 跑完 `python3 s00_setup/code.py`，并且 `API_KEY` 和 `MODEL_ID` 都是 `ok`，就可以进入 s01。
