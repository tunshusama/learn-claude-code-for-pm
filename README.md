# Learn Claude Code for PM -- Agent 产品架构课

[中文](./README.md) | [原中文备份](./README-zh.md) | [日本語](./README-ja.md)

> 本项目 fork 自 [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)，是在官方课程基础上整理出的 **产品经理 / Agent 产品设计视角版本**。

## 这个项目是做什么的

这个项目用 Claude Code 作为拆解对象，帮助你理解一个真正可用的 Agent 产品是怎样被设计出来的。

它不是一套“提示词技巧合集”，也不是简单教你调用 API。它更关注 Agent 产品背后的系统结构：模型如何决定行动，工具如何执行动作，权限如何约束风险，上下文如何管理，长期任务如何恢复，多 Agent 如何协作，以及这些机制在产品设计里分别解决什么问题。

如果你是产品经理、创业者、设计师、运营，或者正在用 AI 辅助写 PRD、搭原型、做自动化，这个版本会尽量把每个技术机制翻译成产品问题和产品判断标准。

## 和官方项目的区别

官方项目更像一套面向工程读者的 Claude Code / Agent Harness 教程，重点是从代码和架构角度理解 Agent Loop、Tool Use、权限、Hooks、Context、Memory、Task System、MCP 等机制。

这个 fork 在官方基础上做了几件事：

- **读者定位更偏 PM**：减少“先懂代码再理解产品”的门槛，先解释每个机制解决的产品问题。
- **章节说明更中文化**：将关键概念、流程解释、实践提示改成更适合中文读者阅读的表达。
- **更强调产品判断**：不是只问“怎么实现”，而是问“什么时候需要这个机制”“它解决什么风险”“它会增加什么复杂度”。
- **保留可运行代码**：代码仍然作为机制证据存在，方便你用 Claude Code 跑起来、观察现象、再反推产品设计。
- **面向 Agent 产品设计学习**：更适合用来建立 Agent PM 的架构直觉，而不是逐行复刻 Claude Code。

简单说：**官方版偏工程拆解，这个版本偏产品经理学习路径。**

## 给想学 Agent、做 Agent 产品的人

这是一套用 Claude Code 做标本的 Agent 产品架构课。

它不要求你先成为程序员。你可以是产品经理、创业者、运营、设计师，或者只是已经开始用 AI 写 PRD、改网页、生成原型、做自动化的人。只要你想把“让模型帮我做事”变成一个更稳定、更可控、可交付的产品系统，这个仓库就适合你。

这门课的重点不是教你背 Claude Code 的源码，而是让你看懂一个可用 Agent 产品背后的机制：

- 模型怎样决定下一步要做什么
- Tool 怎样把模型的意图变成真实动作
- Harness 怎样提供上下文、权限、记忆和协作环境
- 为什么复杂任务需要计划、子 Agent、任务系统和错误恢复
- 你作为 Agent PM，应该如何判断一个机制是否值得加进产品

你可以把代码当作“证据”：它证明这些机制不是概念，而是可以跑起来的最小实现。你不需要逐行读懂所有 Python，也可以理解每一章解决的产品问题。

---

## 一句话主线

**Agent 的行动能力来自模型，Agent 产品的可用性来自 Harness。**

模型负责感知、推理和决策。Harness 负责给模型一个能工作的环境：工具、知识、上下文、权限、记忆、任务系统、团队协作和外部能力接入。

```text
Agent Product = Model + Harness

Harness = Tools
        + Knowledge
        + Observation
        + Action Interfaces
        + Permissions
        + Memory
        + Tasks
        + Collaboration
```

Claude Code 是一个很好的学习对象，因为它没有把 Agent 做成固定流程图，也没有用大量规则替模型做判断。它做的是更关键的事：给模型工具、边界、上下文和工作空间，然后让模型自己规划和行动。

这也是本课程的核心：**不要只学“怎么写提示词”，要学“怎么给 Agent 设计工作环境”。**

---

## 这不是反对工作流

固定流程和 Agent Harness 解决的是不同问题。

| 场景 | 更适合的形态 |
|---|---|
| 步骤稳定、输入输出固定、审批路径清楚 | 工作流编排 |
| 目标明确但路径不确定，需要边看结果边调整 | Agent Harness |
| 任务中需要读文件、跑命令、查资料、修错误 | Agent Harness |
| 多角色协作、长期任务、跨会话记忆 | Agent Harness + 任务系统 |

很多 no-code / low-code 平台适合做稳定流程，这没有问题。真正的区别在于：当任务路径开放、需要判断、需要持续观察环境时，你需要的不是更长的流程图，而是一个让模型可以行动、受控、恢复和协作的 Harness。

---

## 22 课学习路径

每一课只加一个机制。你会先把项目环境放对，再补上 LLM API、`messages[]`、模型无状态和 `while` 循环这些基础，之后再进入 Agent Loop，逐步看到 Claude Code 这类产品为什么需要工具、权限、计划、记忆、任务、并发、团队和 MCP。

### 1. 先把地基补齐

| 章节 | 主题 | 产品问题 |
|---|---|---|
| [s00](./s00_setup/) | 前置准备 | 把项目放到正确位置，在 coding agent 中打开根目录，并配好 `.env` |
| [s01](./s01_llm_basics/) | LLM 基础 | 理解模型无状态、`messages[]`、`system prompt` 和 `while` 循环 |

### 2. 让模型真正动起来

| 章节 | 主题 | 产品问题 |
|---|---|---|
| [s02](./s02_agent_loop/) | Agent Loop | 模型不只是回答，还能执行工具并继续推理 |
| [s03](./s03_tool_use/) | Tool Use | 给 Agent 增加读文件、写文件、搜索等动作能力 |
| [s04](./s04_permission/) | Permission | 在执行前判断哪些动作能自动做，哪些必须拦住 |
| [s05](./s05_hooks/) | Hooks | 在不改主循环的情况下扩展日志、审计、注入和拦截 |

### 3. 让复杂任务不失控

| 章节 | 主题 | 产品问题 |
|---|---|---|
| [s06](./s06_todo_write/) | TodoWrite | 让 Agent 在动手前先列计划，过程中可追踪 |
| [s07](./s07_subagent/) | Subagent | 把大任务拆成小任务，避免一个上下文装下所有噪音 |
| [s08](./s08_skill_loading/) | Skill Loading | 用到知识时再加载，不把所有规则都塞进 prompt |
| [s09](./s09_context_compact/) | Context Compact | 上下文满了还能继续工作，不丢掉关键目标 |
| [s10](./s10_memory/) | Memory | 让稳定偏好、项目事实和用户约束跨会话保留下来 |
| [s11](./s11_system_prompt/) | System Prompt | prompt 不是写死的，而是根据当前能力和状态组装 |

### 4. 让 Agent 更可靠

| 章节 | 主题 | 产品问题 |
|---|---|---|
| [s12](./s12_error_recovery/) | Error Recovery | 失败、限流、上下文超限时知道如何恢复 |
| [s13](./s13_task_system/) | Task System | 把大目标拆成可持久化、可认领、可恢复的任务图 |
| [s14](./s14_background_tasks/) | Background Tasks | 慢任务后台跑，Agent 不必停在原地等待 |
| [s15](./s15_cron_scheduler/) | Cron Scheduler | 定时产生任务，让 Agent 不只被动等人输入 |

### 5. 让多个 Agent 一起工作

| 章节 | 主题 | 产品问题 |
|---|---|---|
| [s16](./s16_agent_teams/) | Agent Teams | 一个 Agent 不够时，如何让多个角色并行工作 |
| [s17](./s17_team_protocols/) | Team Protocols | Agent 之间需要结构化协议，不只靠自然语言闲聊 |
| [s18](./s18_autonomous_agents/) | Autonomous Agents | 队友能自己看任务板、认领任务、推进工作 |
| [s19](./s19_worktree_isolation/) | Worktree Isolation | 多个 Agent 并行改项目时，文件系统也要隔离 |
| [s20](./s20_mcp_plugin/) | MCP Tools | 把外部工具和服务接入统一 Tool 池 |
| [s21](./s21_comprehensive/) | Comprehensive Agent | 把前 21 章机制放回一个完整可运行的 Harness |

---

## 你会学会什么

学完后，你应该能回答这些 Agent PM 经常会遇到的问题：

- 为什么一个“会调用工具的模型”还不是一个完整产品？
- 什么能力适合做成 Tool，什么能力应该放进知识或记忆？
- 什么时候需要权限审批，什么时候可以自动执行？
- 为什么长任务会丢上下文，产品上应该如何设计恢复机制？
- 子 Agent、任务系统、多 Agent 团队分别解决什么问题？
- MCP 这类外部工具协议应该接在产品架构的哪一层？
- 怎么判断一个 Agent 产品只是固定工作流，还是具备开放任务处理能力？

---

## 怎么学习

如果你不懂代码：

1. 先读每章的“这一章解决什么”和“给产品经理的判断标准”。
2. 看图和流程，理解机制在 Agent 工作流里的位置。
3. 把代码块当作实现证据，不必逐行理解。
4. 进入每章的“动手练习”，逐条输入 prompt，对照预期现象和差异说明。

如果你会 vibe coding：

1. 每章先看产品问题，再跑 `code.py`。
2. 让 Claude Code 解释你没看懂的代码片段。
3. 尝试改一个小机制，例如新增 Tool、加权限规则、换一个任务场景。
4. 把机制迁移到你自己的产品原型里。

如果你是工程师：

1. 直接读 `s00` 到 `s21` 的 `code.py`。
2. 把章节里的“代码证据与工程读者附录”当作 Claude Code 源码对照。
3. 注意教学实现和生产实现的边界，不要把 demo 当成完整安全系统。

---

## 快速开始

准备环境：

```sh
cd ~/learn-claude-code-main
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
[ -f .env ] || cp .env.example .env
```

在 `.env` 中填写你的 Anthropic API Key：

```sh
ANTHROPIC_API_KEY=your_api_key_here
```

先运行前置检查：

```sh
python3 s00_setup/code.py
```

再运行 LLM 基础课：

```sh
python3 s01_llm_basics/code.py
```

进入 Agent Loop 后，再运行：

```sh
python3 s02_agent_loop/code.py
```

从 Agent Loop 开始，教学代码会执行模型生成的命令。建议在临时目录里运行，避免影响真实项目。权限、审批和边界会在 s04 之后逐步加入。

---

## Web 版本

这个仓库包含一个 Next.js 课程站：

```sh
cd web
npm install
npm run dev
```

当前主线内容来自根目录 `s00_setup`、`s01_llm_basics` 和新 `s02_*` 到 `s21_*` 的章节。`docs/`、`agents/` 是旧 12 课轨道，保留用于兼容旧链接和历史内容。

---

## 给产品经理的核心判断

设计 Agent 产品时，不要先问“我要写多少 prompt”。先问这些问题：

| 问题 | 对应机制 |
|---|---|
| Agent 能看见什么？ | Observation、Context、Memory |
| Agent 能做什么？ | Tools、Action Interfaces、MCP |
| Agent 不能做什么？ | Permission、Sandbox、Approval |
| Agent 如何知道自己在做什么？ | TodoWrite、Task System |
| Agent 出错后怎么办？ | Error Recovery、Context Compact |
| Agent 如何长期工作？ | Memory、Background Tasks、Cron |
| Agent 如何和其他 Agent 协作？ | Subagent、Agent Teams、Protocols、Worktree |

你不是在给模型写一段更长的咒语。你是在设计一个让模型能够可靠行动的工作环境。

**Agent 来自模型。产品来自 Harness。**
