# s13: Task System -- 把大目标变成可恢复的任务图

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s12](../s12_error_recovery/) → `s13` → [s14](../s14_background_tasks/) → ... → s21

> Todo 是当前动作清单；Task System 是跨会话、可依赖、可协作的工作单元。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

Agent 接到“搭数据库、写 API、补测试、写文档”这类目标时，单靠 TodoWrite 很容易乱序：先写接口，后来发现 schema 没定；先写测试，后来接口又变了。

本章引入任务系统：每个任务有状态、负责人、依赖关系，并持久化到 `.tasks/`。这让 Agent 可以跨会话恢复，也让多个 Agent 以后能围绕同一个任务图协作。

![Task System Overview](images/task-system-overview.svg)

![Task DAG](images/task-dag.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 区分 TodoWrite 和 Task System 的职责。
- 用 `blockedBy` 表达任务依赖，避免 Agent 乱序开工。
- 理解 `pending → in_progress → completed` 这类简单状态机。
- 能判断一个 Agent 工作流是否有“可恢复的项目管理层”。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


**Task**：一个可追踪的工作单元，包含 `id`、`subject`、`description`、`status`、`owner`、`blockedBy`。

**blockedBy**：当前任务依赖的上游任务 ID 列表。只有依赖全部 `completed`，任务才能开始。

**owner**：认领任务的 Agent。多 Agent 场景里，它能减少重复开工。

**持久化**：教学版把每个任务写成 `.tasks/{id}.json`。进程结束后，任务记录仍然保留。

**TodoWrite vs Task System**：TodoWrite 管“我当前怎么做”；Task System 管“这个项目有哪些任务、谁在做、依赖是什么”。

## 怎么用在真实工作流

产品经理可以把一个需求拆成任务图，而不是给 Agent 一段笼统指令。例如：

- 先创建“定义数据库 schema”。
- “实现 API endpoints” blockedBy schema。
- “写测试” blockedBy API。
- “写文档” blockedBy schema。

这样 Agent 或 Agent 团队看到的不只是任务列表，而是可执行顺序。PM 也能检查：哪些任务被阻塞、哪些任务已认领、哪些任务完成后会解锁后续工作。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：创建多个有依赖关系的任务。

**预期现象**：你会看到任务被持久化，并按依赖关系决定哪些可以先做。

**为什么会这样**：Task System 把目标变成可恢复、可协作的工作图。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s13_task_system/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Create tasks: setup database schema, create API endpoints (depends on schema), write tests (depends on endpoints), write docs (depends on schema)`
2. `List all tasks and their statuses`
3. `Claim the first unblocked task and complete it`
4. `List tasks again — which ones are now unblocked?`

对照预期现象：`.tasks/` 目录下是否生成 JSON 文件；完成上游任务后，下游任务是否从 blocked 变成可认领。

## 给产品经理的判断标准

先用一个具体例子判断：产品发布可以拆成文案、设计、开发、测试、上线，每步有负责人和依赖。


- 任务要足够小，能被一个 Agent 在有限 Context 内完成。
- 每个任务要有明确完成标准，不只是“优化一下”。
- 依赖关系要表达真实前后顺序，不要把所有任务都串成一条线。
- 状态要能跨会话恢复，不能只存在当前聊天窗口里。
- 任务系统不等于项目管理软件，但至少要能支撑认领、状态和依赖。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版的任务模型：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
@dataclass
class Task:
    id: str
    subject: str
    description: str
    status: str          # pending | in_progress | completed
    owner: str | None
    blockedBy: list[str]
```

关键函数包括 `create_task`、`list_tasks`、`get_task`、`claim_task`、`complete_task`。`claim_task` 需要先检查任务是 `pending`，再检查 `blockedBy` 中所有任务是否已完成；`complete_task` 会更新状态，并扫描哪些下游任务刚刚解锁。

教学版没有实现环检测、文件锁、release 回退和并发认领保护。真实系统应在任务文件读改写时加锁，避免两个 Agent 同时认领同一任务；也应处理队友退出后把未完成任务释放回 `pending` 的情况。

## 下一章

s13 Background Tasks → 有些 Tool 调用会跑很久。下一章把慢操作放到后台，让 Agent 不必原地等待。
