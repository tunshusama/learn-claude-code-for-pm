# s14: Background Tasks -- 慢操作不阻塞 Agent

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s13](../s13_task_system/) → `s14` → [s15](../s15_cron_scheduler/) → ... → s21

> 慢 Tool 应该进入后台，Agent 继续推进其它工作；完成后再把结果送回 `messages[]`。

## 本页怎么学

<div class="learning-card">

1. **先记住 s13 的结论**：Task System 让项目级工作可以持久化、可依赖、可恢复。
2. **再看 s14 的新增问题**：有些 Tool 调用很慢，同步等待会让 Agent 和用户都卡住。
3. **重点理解占位结果**：后台任务启动时也必须先返回一个 `tool_result`，完成后再发通知。
4. **最后跑练习**：观察慢命令如何先返回任务 ID，完成后再注入结果。

</div>

## 这一章解决什么

### 从 s13 继承下来的能力

s13 让 Agent 可以围绕任务图工作：创建任务、认领任务、完成任务、解锁后续任务。

但任务图只说明“有哪些工作”。真正执行某些工作时，Tool 可能会跑很久。

### 现有机制留下的问题

有些命令天然很慢：

- 安装依赖。
- 跑完整测试。
- 构建镜像。
- 部署服务。
- 批量抓取资料。

如果这些 Tool 同步执行，Agent 会卡在原地等待。用户也不知道它是在工作、等待还是失败。更糟的是，Agent 原本可以一边等待测试，一边读文档、更新 TODO 或处理其它任务。

### s14 的解决方案

s14 给 Harness 加后台任务能力：慢 bash 命令先返回一个占位 `tool_result`，真正的执行在线程里继续跑；完成后再通过 `<task_notification>` 注入后续对话。

![Background Tasks 机制概览](images/background-tasks-overview.svg)

这个机制是 s15 Cron Scheduler 的前置铺垫：s14 解决“一个慢任务如何不阻塞”，s15 解决“未来某个时间如何自动触发任务”。

## 这一章你要练会什么

- 判断哪些 Tool 调用应该同步执行，哪些适合后台执行。
- 理解 `run_in_background` 这类参数的产品意义。
- 理解后台结果为什么不能复用原始 `tool_use_id`。
- 能设计“后台执行中 / 已完成 / 失败”的用户可见状态。

## 核心概念（先看词，再看代码）

| 概念 | PM 视角解释 |
|------|-------------|
| 同步 Tool | 调用后立即等待结果，比如 `read_file`、`git status`。 |
| 后台 Tool | 调用后先返回“已启动”，实际任务继续执行。 |
| 占位 `tool_result` | 每个 `tool_use` 都必须有对应结果，所以后台任务启动时也要先回一个结果。 |
| `bg_id` | 后台任务 ID，用来追踪状态和结果。 |
| `<task_notification>` | 后台任务完成后的独立通知，不伪装成原始 Tool 结果。 |

## 为什么需要占位 `tool_result`

Messages API 里，模型返回的每个 `tool_use` 都需要对应的 `tool_result`。如果模型请求运行一个后台命令，Harness 不能等十分钟后才回这个配对结果。

所以后台执行分两步：

```text
模型返回 tool_use
  → Harness 判断应该后台执行
  → 立即返回占位 tool_result：任务已启动，bg_id 是 bg_001
  → 后台线程继续执行真实命令
  → 完成后生成 <task_notification>
  → 下一轮对话把通知注入 messages[]
```

占位 `tool_result` 只表示“已启动”，不表示“已成功”。

## 后台任务核心代码

教学版用线程和内存字典保存后台状态：

```python
background_tasks: dict[str, dict] = {}
background_results: dict[str, str] = {}

def start_background_task(block) -> str:
    bg_id = next_background_id()
    background_tasks[bg_id] = {"status": "running", "tool_use_id": block.id}
    threading.Thread(target=worker, daemon=True).start()
    return bg_id
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `background_tasks` | 保存后台任务状态，例如 running、done、failed。 |
| `background_results` | 保存已完成任务的输出，等待注入对话。 |
| `bg_id = next_background_id()` | 给后台任务生成一个独立 ID。 |
| `background_tasks[bg_id] = ...` | 记录任务已经开始，并关联原始 `tool_use_id`。 |
| `threading.Thread(...)` | 启动后台线程执行真实 Tool。 |
| `daemon=True` | 教学版让线程随进程退出而结束。 |
| `return bg_id` | 把后台任务 ID 交给占位结果。 |

执行路径分两类：

| 路径 | 行为 |
|------|------|
| 同步 Tool | 直接执行并返回真实 `tool_result`。 |
| 后台 Tool | 先返回占位 `tool_result`，完成后由 `collect_background_results()` 生成通知。 |

## 为什么完成后不用原始 `tool_use_id`

原始 `tool_use` 的配对已经在启动时完成了：占位 `tool_result` 告诉模型“后台任务已启动”。

后台任务完成是一个新的事件，不是原始 Tool 调用的延迟配对。所以教学版用 `<task_notification>` 注入：

```text
<task_notification bg_id="bg_001" status="completed">
pytest 结束，有 2 个失败
</task_notification>
```

这样既保持了 Tool 配对语义，又让模型下一轮能看到后台结果。

## 怎么用在真实工作流

PM 需要定义哪些操作可以后台化，以及后台化后用户能看到什么：

- 安装、构建、测试、部署通常适合后台执行。
- 读取配置、查看短文件、列目录通常应该同步返回。
- 后台任务必须有任务 ID，方便后续追踪、取消或展示日志。
- 如果后台任务失败，Agent 应该拿到失败摘要，而不是只看到“没有结果”。

真实产品里，后台执行可以让 Agent 一边跑测试，一边阅读代码、更新计划或准备下一步。但它不代表可以忽略副作用，部署、删除、写生产数据等操作仍然需要权限边界。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：让 Agent 运行一个慢命令，同时继续处理别的事。

**预期现象**：你会看到先返回后台占位结果，完成后再注入通知。

**为什么会这样**：后台任务让 Agent 不必阻塞等待，也让用户知道慢任务还在跑。

</div>

```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
source .venv/bin/activate
python3 s14_background_tasks/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `在后台运行 pip list，同时查找当前目录下所有 Python 文件。`
2. `运行 npm install，请使用 run_in_background；等待时读取 package.json。`
3. `创建一个“设置项目”的任务，然后在后台运行 pip list。`

对照预期现象：

1. 慢操作是否返回 `bg_id`。
2. Agent 是否继续处理其它请求。
3. 后台完成后是否出现 `<task_notification>`。
4. 占位结果是否只表示“已启动”，没有误报成功。

## 本章小结

s14 的重点是把慢操作从同步等待里拆出来。它不改变 Tool 的安全边界，也不改变任务系统；它只让 Harness 能管理“正在后台发生的事”。

作为 s15 的前置章节，你只需要抓住一件事：后台任务完成后，结果必须重新进入 Agent Context。否则模型不会知道后台世界发生了什么。

## 给产品经理的判断标准

先用一个具体例子判断：构建、安装依赖、批量抓取资料都适合后台化。

- 后台任务必须可追踪，不能只是“我去跑了”。
- 后台任务完成后要重新进入 Agent 的 Context，否则模型无法基于结果行动。
- 同步和后台的边界要清晰，避免小任务被后台化导致体验变慢。
- 占位 `tool_result` 只能表示任务已启动，不能暗示任务成功。
- 对高风险 Tool，后台执行不能绕过权限或审批。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。

教学版用关键词启发式识别慢操作，同时支持模型显式传 `run_in_background`。真实系统通常会提供更完整的后台任务生命周期：日志文件、停止任务、读取增量输出、超时检测、交互式提示检测和并发限制。

## 下一章

s15 Cron Scheduler 会解决“按时间自动触发工作”。后台任务解决慢操作不阻塞；调度器解决未来某个时间点由谁唤醒 Agent。
