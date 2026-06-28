# s12: Error Recovery -- 让 Agent 遇到常见失败时可恢复

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s11](../s11_system_prompt/) → `s12` → [s13](../s13_task_system/) → ... → s21

> 错误恢复不是让 Agent 永远不失败，而是让 Harness 能识别常见失败，并选择合理的下一步。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

当 Agent 调用模型时，真实工作流里经常会遇到三类问题：输出太长被截断、Context 超限、服务临时限流或过载。没有恢复策略时，任务会直接中断，PM 很难判断是需求错了、工具错了，还是只是一次临时失败。

本章把错误恢复放进 Agent loop：LLM 调用外面加 Harness 级处理，让 Agent 在有限范围内重试、压缩或切换策略。

![Error Recovery Overview](images/error-recovery-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 识别 `max_tokens`、`prompt_too_long`、429/529 这类高频失败。
- 理解为什么 Harness 要管理重试、退避、Context 压缩和续写。
- 能判断一个 Agent 产品是否只是“能跑 demo”，还是具备基础恢复能力。
- 能向工程同事说明：错误恢复应在 Harness 层处理，而不是靠用户反复重新提问。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


**Agent loop**：每轮调用 LLM，检查是否有 `tool_use`，执行 Tool，再把 `tool_result` 写回 `messages[]`。

**Harness**：包住模型调用和 Tool 执行的运行时。它负责重试、权限、Context、错误恢复、日志和状态管理。

**输出截断**：模型还没说完就触达输出 token 上限。常见处理是先提高 `max_tokens`，如果仍然不够，再追加续写提示。

**Context 超限**：`messages[]`、System Prompt、Tool 定义、文件内容等合起来超过模型窗口。常见处理是 reactive compact，然后重试一次。

**瞬态故障**：429 限流、529 过载、网络短暂失败。常见处理是指数退避加随机抖动，避免所有请求同时重试。

## 怎么用在真实工作流

产品经理不需要设计每个异常码的代码实现，但需要定义恢复边界：

- 对用户可见的状态：正在重试、正在压缩 Context、需要用户缩小任务。
- 对任务的影响：重试是否会重复执行 Tool？是否会重复写文件？是否需要幂等设计？
- 对成本的影响：续写和大 token 输出会增加调用成本，不能无限循环。
- 对安全的影响：恢复策略不应绕过权限审批，也不应自动执行更高风险操作。

一个合理的 PM 需求描述可以是：当模型输出被截断时，系统最多尝试续写 3 次；当 Context 超限时，先压缩历史再重试一次；当服务过载时，最多退避重试 10 次，并在 UI 中显示可理解的状态。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：触发长输出、Context 过长或临时失败场景。

**预期现象**：你会看到 Harness 尝试续写、压缩或退避重试，而不是直接崩溃。

**为什么会这样**：可靠性不是“永不失败”，而是失败后能分类、恢复、有上限。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s12_error_recovery/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. 让 Agent 生成一段很长的代码，观察是否出现 `[max_tokens] escalating` 日志，以及续写是否接上前文。
2. 连续读取大量文件撑大 Context，观察 reactive compact 是否触发。
3. 如果遇到 429/529，观察日志中的退避等待时间是否逐步增加。

对照预期现象时，不要只看“永不报错”，而是：失败是否被分类，恢复是否有上限，最终失败时是否清楚退出。

## 给产品经理的判断标准

先用一个具体例子判断：报表 Agent 生成到一半被截断时，应自动续写并提示用户恢复状态。


- 好的错误恢复有明确上限，不会无限重试。
- 重试前要确认 Tool 是否可能产生副作用，尤其是写文件、部署、发消息。
- Context 压缩后可能丢细节，关键决策和用户约束要尽量保留。
- fallback model 可以提高可用性，但不应默认改变安全边界或能力承诺。
- 用户应该看到“系统在恢复什么”，而不是只看到长时间无响应。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版只实现三条主路径：`max_tokens` 升级与续写、`prompt_too_long` 后 reactive compact、429/529 指数退避。实际系统还会处理连接错误、流式中断、图片错误、hook 阻断、最大轮次、token budget continuation 等更多状态。

核心伪代码：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
while True:
    try:
        response = with_retry(lambda: client.messages.create(
            model=state.current_model,
            system=system,
            messages=messages,
            tools=TOOLS,
            max_tokens=max_tokens,
        ), state)
    except PromptTooLongError:
        if not state.has_attempted_reactive_compact:
            messages[:] = reactive_compact(messages)
            state.has_attempted_reactive_compact = True
            continue
        return

    if response.stop_reason == "max_tokens":
        if not state.has_escalated:
            max_tokens = 64000
            state.has_escalated = True
            continue
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": CONTINUATION_PROMPT})
        continue

    messages.append({"role": "assistant", "content": response.content})
    if response.stop_reason != "tool_use":
        return
```

退避可以使用 `min(500 * 2^attempt, 32000)` 毫秒，再加 0-25% 随机抖动；如果服务端返回 `Retry-After`，优先尊重服务端建议。关键点是：`tool_use` 和 `tool_result` 的配对语义不能被恢复逻辑打乱。

## 下一章

s12 Task System → 任务不只是 Todo。下一章把大目标拆成可持久化、可依赖、可恢复的任务图。
