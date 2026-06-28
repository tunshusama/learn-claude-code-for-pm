# s06: TodoWrite -- 让复杂任务先有计划再执行

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s05](../s05_hooks/) → `s06` → [s07](../s07_subagent/) → ... → s21

> 计划不是为了好看，而是为了让 Agent 不忘目标。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

复杂任务往往不是一步完成。比如“给所有 Python 文件补类型、跑测试、修失败”。如果 Agent 直接开始改文件，很容易被中途的测试失败、工具输出或临时发现带偏。

这一章增加 `todo_write` Tool，让 Agent 先把任务拆成可跟踪的步骤，再逐项执行。它不增加执行能力，但增加规划能力和过程可见性。

![Todo Overview](images/todo-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 让 Agent 在多步骤任务前先列计划。
- 用 `pending`、`in_progress`、`completed` 跟踪进度。
- 观察 Agent 是否按计划推进，而不是即兴执行。
- 理解计划工具和真实任务系统的区别。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


| 概念 | PM 视角解释 |
|------|-------------|
| `todo_write` | 一个只管理计划的 Tool，不直接读写业务文件。 |
| task status | 每个步骤的状态：待处理、进行中、已完成。 |
| reminder | Agent 长时间不更新计划时，Harness 可以提醒它。 |
| Context | TODO 会进入当前 `messages[]`，帮助模型保持任务焦点。 |

核心实现是保存一个带状态的列表：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
CURRENT_TODOS: list[dict] = []

def run_todo_write(todos: list) -> str:
    global CURRENT_TODOS
    CURRENT_TODOS = todos

    lines = ["\n## Current Tasks"]
    for t in CURRENT_TODOS:
        icon = {"pending": " ", "in_progress": ">", "completed": "x"}[t["status"]]
        lines.append(f"  [{icon}] {t['content']}")
    print("\n".join(lines))
    return f"Updated {len(CURRENT_TODOS)} tasks"
```

Tool 仍然通过 dispatch map 注册：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
TOOL_HANDLERS["todo_write"] = run_todo_write
```

教学版还加入一个简单 reminder：连续几轮没有调用 `todo_write` 时，向 `messages[]` 注入提醒。

## 怎么用在真实工作流

`todo_write` 适合以下场景：

- 多文件修改、迁移、测试修复、内容批量更新。
- 需要用户或 reviewer 看过程，而不只是看最终结果。
- 任务有明显阶段，例如调研、修改、验证、总结。

不要把 TODO 当作自动保证。它只是让计划显性化，仍需要验收标准、权限控制和结果验证。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：给 Agent 一个需要多步完成的小任务。

**预期现象**：你会看到它先写 TODO，再把任务状态从 pending 推进到 in_progress / completed。

**为什么会这样**：计划让复杂任务变得可见，用户能知道 Agent 在做哪一步。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s06_todo_write/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Refactor s06_todo_write/example/hello.py: add type hints, docstrings, and a main guard`
2. `Create a Python package under s06_todo_write/example/demo_pkg with __init__.py, utils.py, and tests/test_utils.py`
3. `Review Python files under s06_todo_write/example and fix any style issues`

对照预期现象：第一次 Tool 调用是否是 `todo_write`？计划是否覆盖主要步骤？执行过程中状态是否从 `pending` 变成 `in_progress` / `completed`？

## 给产品经理的判断标准

先用一个具体例子判断：“重写落地页”应拆成审阅现状、改文案、检查移动端、总结风险，而不是一句话带过。


- 复杂任务开始前是否有清晰计划。
- TODO 粒度是否可执行，避免“完成项目”这种空泛步骤。
- 每个完成项是否有可观察证据，例如文件修改、测试结果、摘要。
- Agent 偏离计划时是否会更新计划，而不是假装仍在执行旧计划。
- 用户是否能从 TODO 判断任务进度和剩余风险。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版的 TODO 存在进程内存里，退出后清空。真实产品通常需要持久化、并发锁、依赖关系、负责人、任务事件和 Hook。

Claude Code 中既有简单的 TodoWrite，也有更完整的 Task System。前者适合当前会话内的轻量计划，后者适合跨会话、可依赖、可并发的任务管理。教学版先讲 V1，因为它能直接说明“计划也是一种 Tool”。

## 下一章

s07 Subagent 会把大任务拆给独立 Agent 执行。TODO 解决“步骤可见”，Subagent 解决“上下文隔离”。

<!-- translation-sync: zh@v2, en@v1, ja@v1 -->
