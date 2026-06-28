# s14: Background Tasks -- 慢操作不阻塞 Agent

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s13](../s13_task_system/) → `s14` → [s15](../s15_cron_scheduler/) → ... → s21

> 慢 Tool 应该进入后台，Agent 继续推进其它工作；完成后再把结果送回 `messages[]`。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

有些命令天然很慢：安装依赖、跑完整测试、构建镜像、部署服务。同步等待会让 Agent 卡住，用户也不知道它是在工作、等待还是失败。

本章给 Harness 加后台任务能力：慢 bash 命令先返回一个占位 `tool_result`，真正的执行在线程里继续跑；完成后再通过 `<task_notification>` 注入后续对话。

![Background Tasks Overview](images/background-tasks-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 判断哪些 Tool 调用应该同步执行，哪些适合后台执行。
- 理解 `run_in_background` 这类参数的产品意义。
- 理解后台结果为什么不能复用原始 `tool_use_id`。
- 能设计“后台执行中 / 已完成 / 失败”的用户可见状态。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


**同步 Tool**：调用后立即等待结果，比如 `read_file`、`git status`。

**后台 Tool**：调用后先返回“已启动”，实际任务继续执行，比如 `npm install`、`pytest`、`docker build`。

**占位 `tool_result`**：每个 `tool_use` 都必须有对应的 `tool_result`，所以后台任务启动时也要先回一个结果，说明任务已进入后台。

**`<task_notification>`**：后台任务完成后的独立通知，不伪装成原始 Tool 的结果。

**Harness 调度**：后台任务不是模型自己“记得去看”，而是 Harness 收集完成事件并注入给模型。

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
python3 s14_background_tasks/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Run pip list in the background and find all Python files in this directory`
2. `Run npm install (use run_in_background) and while waiting, read package.json`
3. `Create a task to setup the project, then run pip list in the background`

对照预期现象：慢操作是否返回 `bg_id`；Agent 是否继续处理其它请求；后台完成后是否出现 `<task_notification>`。

## 给产品经理的判断标准

先用一个具体例子判断：构建、安装依赖、批量抓取资料都适合后台化。


- 后台任务必须可追踪，不能只是“我去跑了”。
- 后台任务完成后要重新进入 Agent 的 Context，否则模型无法基于结果行动。
- 同步和后台的边界要清晰，避免小任务被后台化导致体验变慢。
- 占位 `tool_result` 只能表示任务已启动，不能暗示任务成功。
- 对高风险 Tool，后台执行不能绕过 permission 或审批。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版用线程和内存字典保存后台状态：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
background_tasks: dict[str, dict] = {}
background_results: dict[str, str] = {}

def start_background_task(block) -> str:
    bg_id = next_background_id()
    background_tasks[bg_id] = {"status": "running", "tool_use_id": block.id}
    threading.Thread(target=worker, daemon=True).start()
    return bg_id
```

执行路径分两类：同步 Tool 直接执行并返回 `tool_result`；后台 Tool 先返回占位 `tool_result`，完成后由 `collect_background_results()` 生成 `<task_notification>`。这保持了 Messages API 的 `tool_use` / `tool_result` 配对语义。

教学版用关键词启发式识别慢操作，同时支持模型显式传 `run_in_background`。真实系统通常会提供更完整的后台任务生命周期：日志文件、停止任务、读取增量输出、超时检测、交互式提示检测和并发限制。

## 下一章

s14 Cron Scheduler → 后台任务解决“慢操作”。下一章解决“按时间自动触发工作”。
