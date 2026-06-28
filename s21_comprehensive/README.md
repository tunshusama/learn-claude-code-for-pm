# s21: Comprehensive Agent -- 把完整 Harness 放回一个循环

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s20](../s20_mcp_plugin/) → `s21`

> 机制很多，但核心循环仍然是：模型决定、Harness 执行、结果回到 `messages[]`。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

前面章节每章只讲一个机制，适合学习，但真实 Agent 不会只带单一能力运行。一个可长期工作的 coding Agent 通常同时需要 Tool、permission、hooks、Todo、Task System、memory、skills、Context 压缩、错误恢复、后台任务、cron、团队、worktree 和 MCP。

本章把这些机制放回同一个 Agent loop，帮助你看清每个机制挂在哪个位置。

![System Architecture](images/system-architecture.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 从 PM 视角理解完整 Agent Harness 的组成。
- 判断一个 Agent 产品缺的是模型能力、Tool 能力，还是 Harness 能力。
- 看懂 `tool_use`、`tool_result`、`messages[]` 在完整系统里的位置。
- 能把前面章节组合成一个可运行的端到端工作流。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


**Agent loop**：调用 LLM，检查响应里的 `tool_use`，执行 Tool，把 `tool_result` 写回 `messages[]`，继续下一轮。

**Harness**：围绕 Agent loop 的运行时，负责权限、hooks、Context、错误恢复、后台、调度、团队和外部 Tool。

**Tool pool**：内置 Tool 加已连接的 MCP Tool，由 `assemble_tool_pool()` 每轮组装。

**Context 管线**：在 LLM 前整理 System Prompt、memory、skills、MCP 状态、历史消息和压缩结果。

**控制点**：`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Stop` 等 hooks，是产品策略和工程策略插入 Harness 的位置。

## 怎么用在真实工作流

PM 可以用 s21 的结构检查一个 Agent 功能是否完整：

- 用户输入进来后，是否会触发审计、注入和限制？
- 调用模型前，是否有 memory、skills、MCP 状态和 Context 压缩？
- 调用模型失败时，是否有错误恢复边界？
- 执行 Tool 前，是否有 permission 和风险判断？
- 慢任务、定时任务、队友消息是否能回到 `messages[]`？
- 最后没有 `tool_use` 时，是否有 Stop hooks 做收尾？

这套检查比“模型够不够聪明”更接近真实产品质量。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：连续使用 Todo、MCP、后台任务、队友和 worktree。

**预期现象**：你会看到所有机制最终仍回到同一个 messages[] 和 tool_result 流。

**为什么会这样**：完整 Agent 产品不是 20 个孤立功能，而是一套围绕 Agent Loop 的 Harness。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s21_comprehensive/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Create a todo list for inspecting this repo, then list Python files`
2. `Connect to the docs MCP server and search for agent loop`
3. `Create two tasks, create worktrees for them, then spawn alice and bob. Ask them to submit plans before claiming tasks.`
4. `remind me of the meeting in 3 minutes.`
5. `Run npm install in the background and continue reading README.md`

对照预期现象：Tool 调用前是否经过 hooks / permission；`connect_mcp` 后下一轮是否出现 MCP Tool；慢操作是否返回 background placeholder；定时提醒是否到点注入；队友是否提交 plan；worktree 绑定后是否切换目录。

## 给产品经理的判断标准

先用一个具体例子判断：一个真实 coding Agent 需要同时具备计划、权限、记忆、恢复、协作和外部工具。


- 完整 Agent 不是功能堆叠，而是每个机制在 loop 中有明确位置。
- 所有外部动作都应通过 Tool 和 Harness 控制，不应让模型直接“想象结果”。
- `tool_use` 和 `tool_result` 的配对关系必须保持清楚。
- 自动化要有边界：重试有上限、权限有审批、后台有状态、任务有验收。
- 多 Agent、cron、MCP、worktree 都应服务于真实工作流，不应为了复杂而复杂。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


s20 的主循环可以概括为：

```text
用户输入
  → UserPromptSubmit hooks
  → cron/background/team notifications 注入
  → Context compact
  → memory + skills + MCP state 组装 System Prompt
  → LLM(messages, tools)
  → 是否存在 tool_use block?
      否 → Stop hooks → 返回
      是 → PreToolUse hooks + permission
          → builtin handlers / MCP handlers / background dispatch
          → PostToolUse hooks
          → tool_result 写回 messages[]
          → 下一轮
```

内置 Tool 池覆盖前面章节的能力：文件、bash、编辑、glob、todo、一次性 subagent、skill、compact、Task System、cron、团队协议、worktree 和 `connect_mcp`。MCP Tool 在每轮由 `assemble_tool_pool()` 动态加入。

s20 同时保留两层计划：`todo_write` 管当前会话内的短期步骤，Task System 管跨会话、可依赖、可认领的任务图。一次性 subagent 用于上下文隔离；持久 teammate 用于长期并行协作。后台任务和 cron 最终都通过通知回到 `messages[]`，而不是绕开 Agent loop。

## 下一章

这是本教程的收束章。继续扩展时，可以从三个方向推进：更严格的 permission、更可靠的持久化状态、更贴近真实组织流程的 MCP Tool 和团队协议。
