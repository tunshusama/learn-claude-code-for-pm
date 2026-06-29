# s13: Task System -- 把大目标变成可恢复的任务图

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s12](../s12_error_recovery/) → `s13` → [s14](../s14_background_tasks/) → ... → s21

> Todo 是当前动作清单；Task System 是跨会话、可依赖、可协作的工作单元。

## 本页怎么学

<div class="learning-card">

1. **先记住 s12 的结论**：错误恢复让一次运行遇到常见失败时可以继续。
2. **再看 s13 的新增问题**：项目级目标不是一次模型调用能完成的，需要可持久化的任务结构。
3. **重点区分 Todo 和 Task**：Todo 管当前怎么做，Task System 管项目有哪些工作、依赖是什么、谁在做。
4. **最后跑练习**：创建有依赖的任务，观察完成上游后下游如何解锁。

</div>

## 这一章解决什么

### 从 s12 继承下来的能力

s12 让 Agent 在常见失败后可以恢复：输出截断时续写，Context 超限时压缩，服务限流时退避重试。

这解决的是“当前这轮执行失败后怎么办”。但很多需求不是一轮能完成的。

### 现有机制留下的问题

Agent 接到下面这种目标时，单靠 TodoWrite 很容易不够：

```text
搭数据库、写 API、补测试、写文档，并让多个 Agent 分工推进。
```

TodoWrite 是当前会话内的计划列表。它适合指导一个 Agent 做当前任务，但它缺少：

- 跨会话持久化。
- 任务依赖关系。
- 负责人或认领状态。
- 被阻塞任务的表达方式。
- 项目级恢复入口。

### s13 的解决方案

s13 引入 Task System：每个任务有状态、负责人、依赖关系，并持久化到 `.tasks/`。这让 Agent 可以跨会话恢复，也让多个 Agent 以后能围绕同一个任务图协作。

![Task System 机制概览](images/task-system-overview.svg)

![任务依赖图](images/task-dag.svg)

## 这一章你要练会什么

- 区分 TodoWrite 和 Task System 的职责。
- 用 `blockedBy` 表达任务依赖，避免 Agent 乱序开工。
- 理解 `pending → in_progress → completed` 这类简单状态机。
- 能判断一个 Agent 工作流是否有“可恢复的项目管理层”。

## 核心概念（先看词，再看代码）

| 概念 | PM 视角解释 |
|------|-------------|
| Task | 一个可追踪的工作单元。 |
| `blockedBy` | 当前任务依赖的上游任务 ID 列表。 |
| owner | 认领任务的 Agent 或人。 |
| 持久化 | 教学版把每个任务写成 `.tasks/{id}.json`，进程结束后仍保留。 |
| 任务图 | 由任务和依赖关系组成的有向图。 |

## Task 模型长什么样

教学版的任务模型：

```python
@dataclass
class Task:
    id: str
    subject: str
    description: str
    status: str          # pending | in_progress | completed
    owner: str | None
    blockedBy: list[str]
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `@dataclass` | 用 Python dataclass 定义一个结构化任务对象。 |
| `id` | 任务唯一编号。其它任务可以用它表达依赖。 |
| `subject` | 任务标题，适合列表展示。 |
| `description` | 更详细的任务说明和完成标准。 |
| `status` | 任务状态：待处理、进行中、已完成。 |
| `owner` | 当前认领者。多 Agent 场景里能减少重复开工。 |
| `blockedBy` | 上游依赖任务列表。依赖未完成时不能开始。 |

## 依赖如何防止乱序

如果任务图是：

```text
定义数据库 schema
  → 实现 API 接口
      → 写测试
  → 写文档
```

那么“实现 API 接口”应该 `blockedBy` “定义数据库 schema”。只有 schema 完成后，API 任务才可认领。

教学版里的 `claim_task` 会检查两件事：

1. 任务本身必须是 `pending`。
2. `blockedBy` 里的所有任务都必须是 `completed`。

如果依赖没完成，Agent 会得到“任务被阻塞”的结果，而不是提前开工。

## TodoWrite vs Task System

| 对比项 | TodoWrite（s06） | Task System（s13） |
|--------|------------------|--------------------|
| 生命周期 | 当前会话内 | 可持久化、跨会话 |
| 重点 | 我现在怎么做 | 项目有哪些任务 |
| 结构 | 简单列表 | 状态、依赖、负责人、任务文件 |
| 使用方式 | Agent 自己更新当前计划 | Agent 创建、认领、完成任务 |
| 适合场景 | 单次复杂请求 | 多阶段项目、多 Agent 协作、可恢复任务图 |

两者不是互相替代。真实工作里，一个 Task 里面仍然可以用 TodoWrite 管当前步骤。

## 怎么用在真实工作流

产品经理可以把一个需求拆成任务图，而不是给 Agent 一段笼统指令。例如：

- 先创建“定义数据库 schema”。
- “实现 API 接口” blockedBy schema。
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
source .venv/bin/activate
python3 s13_task_system/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `创建这些任务：设计数据库 schema；实现 API 接口，依赖 schema；编写测试，依赖 API；编写文档，依赖 schema。`
2. `列出所有任务和它们的状态。`
3. `认领第一个没有被阻塞的任务，并把它标记为完成。`
4. `再次列出任务，看看哪些任务现在解锁了。`

对照预期现象：

1. `.tasks/` 目录下是否生成 JSON 文件。
2. 完成上游任务后，下游任务是否从 blocked 变成可认领。
3. 任务状态是否从 `pending` 变成 `in_progress` 再变成 `completed`。
4. 任务文件是否在程序退出后仍然存在。

## 本章小结

s13 把“计划”提升成“项目级任务图”。TodoWrite 适合当前执行步骤，Task System 适合跨会话、带依赖、可协作的工作。

它也为后面的 Agent Teams 铺路：多个 Agent 要协作，必须先有一套共同理解的任务状态。

## 给产品经理的判断标准

先用一个具体例子判断：产品发布可以拆成文案、设计、开发、测试、上线，每步有负责人和依赖。

- 任务要足够小，能被一个 Agent 在有限 Context 内完成。
- 每个任务要有明确完成标准，不只是“优化一下”。
- 依赖关系要表达真实前后顺序，不要把所有任务都串成一条线。
- 状态要能跨会话恢复，不能只存在当前聊天窗口里。
- 任务系统不等于项目管理软件，但至少要能支撑认领、状态和依赖。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。

关键函数包括 `create_task`、`list_tasks`、`get_task`、`claim_task`、`complete_task`。`claim_task` 需要先检查任务是 `pending`，再检查 `blockedBy` 中所有任务是否已完成；`complete_task` 会更新状态，并扫描哪些下游任务刚刚解锁。

教学版没有实现环检测、文件锁、release 回退和并发认领保护。真实系统应在任务文件读改写时加锁，避免两个 Agent 同时认领同一任务；也应处理队友退出后把未完成任务释放回 `pending` 的情况。

## 下一章

s14 Background Tasks 会处理慢 Tool 调用。有些操作会跑很久，不能让 Agent 原地等待。
