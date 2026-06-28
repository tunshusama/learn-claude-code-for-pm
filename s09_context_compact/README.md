# s09: Context Compact -- 让长任务不被历史拖垮

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s08](../s08_skill_loading/) → `s09` → [s10](../s10_memory/) → ... → s21

> Context 会满，产品要设计“丢什么、留什么、怎么恢复”。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

Agent 连续工作一段时间后，`messages[]` 会堆满文件内容、命令输出、旧计划和中间推理。上下文窗口有限，超过后 API 会拒绝请求，常见表现是 `prompt_too_long`。

这一章加入 Context Compact：先用便宜的结构化裁剪和占位处理，再在必要时用 LLM 总结历史。

![Compact Overview](images/compact-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 理解为什么长任务必须管理 Context，而不是只扩大窗口。
- 区分裁消息、压旧结果、大结果落盘、LLM 摘要四类策略。
- 判断哪些信息可以丢、哪些必须保留、哪些需要可恢复。
- 看懂 reactive compact 如何应对已经发生的超限错误。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


| 概念 | PM 视角解释 |
|------|-------------|
| Context | 模型当前能看到的 `messages[]` 和 System Prompt。 |
| compact | 把历史变短，同时尽量保留继续任务所需信息。 |
| tool_result budget | 大 Tool 输出不能无限留在上下文。 |
| transcript | 完整历史可落盘保存，但不等于模型还能直接看到。 |
| reactive compact | API 已经报超限后触发的应急压缩。 |

![四层压缩管线](images/compaction-layers.svg)

四层策略：

1. `snip_compact`：消息太多时裁掉中间旧消息，但避免拆散 `tool_use` / `tool_result` 对。
2. `micro_compact`：旧 `tool_result` 用占位符替换，必要时可重新读取。
3. `tool_result_budget`：单次大输出落盘，只在 Context 留预览和路径。
4. `compact_history`：用 LLM 把完整历史总结成当前目标、已完成、关键发现、剩余工作。

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
def agent_loop(messages):
    while True:
        messages[:] = tool_result_budget(messages)
        messages[:] = snip_compact(messages)
        messages[:] = micro_compact(messages)

        if estimate_token_count(messages) > THRESHOLD:
            messages[:] = compact_history(messages)

        try:
            response = client.messages.create(...)
        except PromptTooLongError:
            messages[:] = reactive_compact(messages)
            continue
```

![旧结果占位](images/micro-compact.svg)

![大结果落盘](images/layer1-budget.svg)

![LLM 全量摘要](images/auto-compact.svg)

## 怎么用在真实工作流

Context Compact 是产品连续性的基础：

- 调研型任务会产生大量旧读数，适合压缩旧 `tool_result`。
- 大日志、大文件、大测试输出要落盘并保留预览。
- 长任务压缩后，摘要必须包含当前目标、约束、已改内容、未完成事项。
- 用户应该能知道“发生了压缩”，避免误以为 Agent 仍保留全部细节。

压缩是有损的。不要承诺“无限记住所有细节”。要提供恢复路径，例如重新读取文件、查看 transcript、让用户补充关键约束。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：让 Agent 读取较多内容或执行多轮任务。

**预期现象**：你会看到旧 Tool 结果被压缩、摘要或裁剪，任务仍能继续。

**为什么会这样**：长任务一定会遇到 Context 限制，产品必须有整理历史的机制。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s09_context_compact/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Read the file README.md, then read code.py, then read s02_agent_loop/README.md`
2. `Read every file in s09_context_compact/`
3. 反复对话 20+ 轮，观察是否出现 `[auto compact]` 或 `[reactive compact]`

对照预期现象：旧 `tool_result` 是否被占位？大输出是否落盘？超过阈值时是否生成摘要？压缩后 Agent 是否还能说清当前任务。

## 给产品经理的判断标准

先用一个具体例子判断：研究 Agent 连续读 20 篇资料时，需要保留结论和引用，而不是保留所有原文。


- 压缩是否优先处理低价值信息，而不是直接丢最近上下文。
- 大输出是否有可恢复路径，例如文件路径或重新读取方式。
- 摘要是否保留用户约束、当前目标和剩余工作。
- 压缩触发是否对用户可见。
- reactive compact 是否有重试上限，避免无限循环和费用失控。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版用字符数估算 token，用简单规则裁剪和占位。生产系统会有更精确的 tokenizer、prompt cache 约束、读文件状态恢复、压缩失败熔断、压缩后恢复最近文件等机制。

真实执行顺序通常会先处理大 Tool 输出，再裁剪消息，再微压缩旧结果，最后才做 LLM 摘要。原因是：如果先把大输出替换成占位符，就失去了落盘完整内容的机会。

## 下一章

s10 Memory 会处理“压缩之后还要长期记住什么”。Compact 管当前会话能否继续，Memory 管跨压缩、跨会话的稳定知识。

<!-- translation-sync: zh@v2, en@v1, ja@v1 -->
