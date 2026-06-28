# s07: Subagent -- 用独立 Context 承接子任务

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s06](../s06_todo_write/) → `s07` → [s08](../s08_skill_loading/) → ... → s21

> 大任务要拆，小任务要有干净的 `messages[]`。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

主 Agent 为了追踪一个 bug 可能读几十个文件、跑很多命令。中间过程会挤满 Context，让模型越来越难抓住最初目标。

这一章增加 `task` Tool：主 Agent 可以把一个子任务交给 Subagent。Subagent 使用全新的 `messages[]` 独立工作，结束后只把结论返回给主 Agent。

![Subagent Overview](images/subagent-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 把调研、扫描、局部修改等子任务从主对话中隔离出去。
- 理解 Subagent 的价值：减少 Context 污染，而不是神奇提高准确率。
- 设计“只回传结论”的子任务接口。
- 判断哪些任务应该委派，哪些应该留在主 Agent。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


| 概念 | PM 视角解释 |
|------|-------------|
| Subagent | 为子任务启动的独立 Agent。 |
| Context isolation | 子 Agent 有自己的 `messages[]`，中间过程不进入主对话。 |
| summary return | 子 Agent 完成后只返回摘要或结果。 |
| Tool scope | 子 Agent 可以有更小的 Tool 集合，降低递归和风险。 |

核心流程：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
def spawn_subagent(description: str) -> str:
    messages = [{"role": "user", "content": description}]

    for _ in range(30):
        response = client.messages.create(
            model=MODEL,
            system=SUB_SYSTEM,
            messages=messages,
            tools=SUB_TOOLS,
            max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            break

        results = []
        for block in response.content:
            if block.type == "tool_use":
                blocked = trigger_hooks("PreToolUse", block)
                if blocked:
                    results.append({... "content": str(blocked)})
                    continue
                output = SUB_HANDLERS[block.name](**block.input)
                trigger_hooks("PostToolUse", block, output)
                results.append({... "content": output})
        messages.append({"role": "user", "content": results})

    return extract_text(messages[-1]["content"])
```

主 Agent 看到的只是 `task` 的 `tool_result`，而不是子 Agent 的完整过程。

## 怎么用在真实工作流

适合委派给 Subagent 的任务：

- “帮我扫一遍某目录，总结风险点。”
- “读这些文件，找出相关入口。”
- “在隔离范围内完成一个小修改并回报结果。”

不适合委派的任务：

- 需要主 Agent 持续掌握全部细节的核心决策。
- 权限高、影响大的操作，例如发布、删除、大规模迁移。
- 描述不清的任务。子任务输入越模糊，回传摘要越难验收。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：让主 Agent 派一个子 Agent 单独调研某个文件或主题。

**预期现象**：你会看到子 Agent 返回摘要，而不是把所有中间过程塞回主对话。

**为什么会这样**：Subagent 用干净 Context 处理子任务，降低主线被噪音淹没的概率。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s07_subagent/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Use a subtask to find what testing framework this project uses`
2. `Delegate: read all .py files in agents/ and summarize what each one does`
3. `Use a task to create s07_subagent/example/string_tools.py with a slugify(text: str) function, then verify it from the parent agent`

对照预期现象：是否出现 `[Subagent spawned]` / `[Subagent done]`？子 Agent 的 Tool 调用是否带 `[sub]` 标记？主 Agent 是否只拿到摘要继续工作？

## 给产品经理的判断标准

先用一个具体例子判断：竞品分析 Agent 可以让子 Agent 分别看价格页、功能页、客户评价。


- 子任务描述是否具体到可独立完成。
- Subagent 的 Tool 权限是否小于或等于主 Agent。
- 返回结果是否包含证据，而不是只说“已完成”。
- 主 Agent 是否能基于摘要继续，而不需要完整中间过程。
- 是否有轮次上限、错误返回和权限冒泡策略。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版展示同步 Subagent：父 Agent 等子 Agent 完成。真实系统还可能支持异步后台 Subagent、prompt cache 共享、父子 abort 传播、权限冒泡和递归保护。

教学版通过“不把 `task` Tool 给子 Agent”避免递归委派。生产实现通常会有更精细的 depth、mode、Tool scope 和安全策略。

## 下一章

s08 Skill Loading 会解决另一个问题：不是所有任务都需要同一套知识。技能应该按需加载，而不是全部塞进 System Prompt。

<!-- translation-sync: zh@v2, en@v0, ja@v0 -->
