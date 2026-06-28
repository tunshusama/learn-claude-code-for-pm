# s05: Hooks -- 让工作流扩展不挤进主循环

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s04](../s04_permission/) → `s05` → [s06](../s06_todo_write/) → ... → s21

> 稳定的 Agent Loop 负责流转，变化的业务逻辑挂到 Hook 上。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

到 s03，权限检查已经插进 Tool 执行前。接下来你可能还想加日志、通知、自动格式检查、操作后 git add、退出前统计。如果每加一个能力都改 `agent_loop`，主循环会越来越难维护。

这一章引入 Hooks：在固定事件点触发扩展逻辑，让主循环保持稳定。

![Hooks Overview](images/hooks-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 理解 Hook 是 Agent Harness 的扩展点。
- 把权限、日志、通知等横切逻辑从主循环移出去。
- 判断哪些流程适合做 Hook，哪些应该做成 Tool。
- 看懂 Stop Hook 如何影响 Agent 是否继续。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


| 概念 | PM 视角解释 |
|------|-------------|
| Hook | 某个事件发生时自动运行的扩展逻辑。 |
| UserPromptSubmit | 用户输入进入模型前。 |
| PreToolUse | Tool 执行前，适合权限和日志。 |
| PostToolUse | Tool 执行后，适合检查、通知、同步副作用。 |
| Stop | Agent 准备结束时，适合收尾或要求继续修正。 |

教学版的 Hook 注册表很小：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
HOOKS = {
    "UserPromptSubmit": [],
    "PreToolUse": [],
    "PostToolUse": [],
    "Stop": [],
}

def register_hook(event: str, callback):
    HOOKS[event].append(callback)

def trigger_hooks(event: str, *args):
    for callback in HOOKS[event]:
        result = callback(*args)
        if result is not None:
            return result
    return None
```

循环里不再直接写 `check_permission()`，而是触发事件：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
blocked = trigger_hooks("PreToolUse", block)
if blocked:
    results.append({
        "type": "tool_result",
        "tool_use_id": block.id,
        "content": str(blocked),
    })
    continue

output = TOOL_HANDLERS[block.name](**block.input)
trigger_hooks("PostToolUse", block, output)
```

## 怎么用在真实工作流

Hook 适合承载“围绕 Tool 调用发生”的流程：

- PreToolUse：权限审批、敏感信息检查、操作日志。
- PostToolUse：格式检查、结果校验、自动同步状态。
- Stop：验收检查、提醒未完成事项、生成摘要。
- UserPromptSubmit：注入当前工作区、环境、工单上下文。

PM 需要关注的是：Hook 不应该变成隐形业务流程。任何会改变用户结果的 Hook，都要可见、可配置、可解释。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：让 Agent 执行一个会触发前后处理的 Tool。

**预期现象**：你会看到 Tool 执行前后多出日志、提醒或拦截，而主循环结构不变。

**为什么会这样**：Hook 让产品策略挂在循环周围，避免每加一个策略就改核心代码。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s05_hooks/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Read the file README.md`
2. `Create a file called test.txt`
3. `Delete all temporary files in /tmp`

对照预期现象：每次 Tool 执行前是否出现 `[HOOK]` 日志？权限拒绝来自 Hook 还是主循环硬编码？Stop 时是否打印收尾统计？

## 给产品经理的判断标准

先用一个具体例子判断：企业版 Agent 可用 Hook 注入合规提示、记录审计日志、拦截敏感动作。


- 主循环是否仍然只负责 LLM 调用、Tool 执行和消息流转。
- Hook 的触发时机是否能被用户和团队理解。
- Hook 的副作用是否可审计，特别是写文件、发通知、提交代码。
- 权限类 Hook 是否不能被低优先级逻辑绕过。
- Stop Hook 是否有防止无限续跑的策略。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版只保留 4 个核心事件。生产系统里的 Hook 会更多，例如会话开始/结束、压缩前后、权限请求、子 Agent 开始/结束、文件变化等。

真实 HookResult 也不只是“None 或字符串”，通常会包含阻塞错误、权限决策、修改后的输入、附加 Context、是否阻止继续等字段。重要约束是：Hook 可以扩展流程，但不能破坏上层权限和安全策略。

## 下一章

s06 TodoWrite 会给 Agent 一个计划工具。复杂任务不应该一上来就执行，先把步骤列清楚，后续才更容易验收。

<!-- translation-sync: zh@v2, en@v0, ja@v0 -->
