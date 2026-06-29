# s07: Subagent -- 用独立 Context 承接子任务

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s06](../s06_todo_write/) → `s07` → [s08](../s08_skill_loading/) → ... → s21

> 大任务要拆，小任务要有干净的 `messages[]`。

## 本页怎么学

<div class="learning-card">

1. **先记住 s06 的结论**：TODO 让当前计划可见，但所有中间过程仍在主对话里。
2. **再看 s07 的新增问题**：调研、扫描、局部验证会产生大量噪音，不一定都该进入主 Agent Context。
3. **重点理解隔离**：Subagent 有自己的 `messages[]`，结束后只把摘要返回给父 Agent。
4. **最后跑练习**：观察主 Agent 看到的是子任务结论，而不是子 Agent 的完整流水账。

</div>

## 这一章解决什么

### 从 s06 继承下来的能力

s06 让复杂任务有了轻量计划：先写 TODO，再逐步推进。这样用户能看到 Agent 正在做什么。

但 TODO 只解决“步骤可见”，不解决“上下文污染”。

### s06 留下的局限

主 Agent 为了追踪一个 bug，可能需要：

- 搜索很多文件。
- 阅读多个候选实现。
- 跑一串验证命令。
- 排除一堆无关路径。

这些中间过程如果全部进入主 `messages[]`，会带来两个问题：

1. **Context 被噪音挤满**：主 Agent 后面继续工作时，还要背着大量不再重要的搜索输出。
2. **主线目标被稀释**：模型越往后越容易被旧细节带偏，而不是围绕当前目标判断。

### s07 的解决方案

s07 增加 `task` Tool：主 Agent 可以把一个子任务交给 Subagent。Subagent 使用全新的 `messages[]` 独立工作，结束后只把结论返回给主 Agent。

![Subagent 机制概览](images/subagent-overview.svg)

可以把它理解成：

```text
主 Agent：我需要知道测试框架是什么
  → 调用 task Tool
      → 子 Agent 用自己的 messages[] 搜索、读取、判断
      → 子 Agent 返回摘要
  → 主 Agent 只把摘要放回主 messages[]
```

Subagent 的价值不是“模型突然更聪明”，而是把子任务的探索过程隔离出去。

## 这一章你要练会什么

- 理解 Subagent 的核心价值是上下文隔离，而不是神秘增强准确率。
- 判断哪些任务适合委派，哪些任务应该留在主 Agent。
- 设计清楚的子任务输入，让子 Agent 能独立完成。
- 理解子 Agent 的 Tool 范围应该可控，通常不应比主 Agent 更大。

## 核心概念（先看词，再看代码）

| 概念 | PM 视角解释 |
|------|-------------|
| Subagent | 为子任务启动的独立 Agent。 |
| 父 Agent | 发起委派、接收结果、继续主线判断的 Agent。 |
| 上下文隔离 | 子 Agent 有自己的 `messages[]`，中间过程不进入主对话。 |
| 摘要返回 | 子 Agent 完成后只返回摘要、证据或结果。 |
| Tool 范围 | 子 Agent 可以有更小的 Tool 集合，降低递归和风险。 |

## Subagent 怎么启动

核心流程：

```python
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
                output = SUB_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})

    return extract_text(messages[-1]["content"])
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `def spawn_subagent(...)` | 定义启动子 Agent 的函数。父 Agent 调用 `task` Tool 时会走到这里。 |
| `messages = [...]` | 给子 Agent 新建一份独立 `messages[]`。这就是隔离的关键。 |
| `for _ in range(30):` | 给子 Agent 设置最大轮次，防止无限执行。 |
| `client.messages.create(...)` | 子 Agent 自己调用模型。 |
| `system=SUB_SYSTEM` | 子 Agent 可以有更窄的系统指令。 |
| `tools=SUB_TOOLS` | 子 Agent 可以只拿到部分 Tool。 |
| `messages.append(...)` | 子 Agent 的输出只进入子 Agent 自己的历史。 |
| `if response.stop_reason != "tool_use"` | 子 Agent 不再请求 Tool 时，子任务结束。 |
| `output = SUB_HANDLERS[...]` | 子 Agent 的 Tool 调用由子 Agent 的 handler 集合执行。 |
| `messages.append({"role": "user", "content": results})` | Tool 结果回到子 Agent 自己的上下文。 |
| `return extract_text(...)` | 只把最终文本摘要返回给父 Agent。 |

主 Agent 看到的不是子 Agent 的完整搜索过程，而是 `task` Tool 的 `tool_result`。

## 为什么不能所有任务都委派

Subagent 会降低主上下文噪音，但它也有代价：

- 父 Agent 看不到完整中间过程，只能基于摘要继续。
- 子任务描述不清时，子 Agent 可能朝错误方向探索。
- 子 Agent 如果权限过大，风险会被放大。
- 子 Agent 运行也消耗模型调用和 Tool 调用成本。

所以委派适合“边界清楚、可以独立产出摘要”的任务，不适合需要父 Agent 持续掌握细节的核心决策。

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
source .venv/bin/activate
python3 s07_subagent/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `使用一个子任务找出这个项目使用什么测试框架。`
2. `委派一个子任务：读取 agents/ 下所有 .py 文件，并总结每个文件的作用。`
3. `使用 task 创建 s07_subagent/example/string_tools.py，里面实现 slugify(text: str) 函数，然后由父 Agent 验证。`

对照预期现象：

1. 是否出现 `[Subagent spawned]` / `[Subagent done]`。
2. 子 Agent 的 Tool 调用是否带 `[sub]` 标记。
3. 主 Agent 是否只拿到摘要继续工作。
4. 子任务结果是否包含证据，而不是只说“已完成”。

## 本章小结

s07 把“任务拆分”从 TODO 列表推进到 Context 结构。TODO 让计划可见，Subagent 让探索过程隔离。

它没有改变最小 Agent Loop：子 Agent 内部仍然是 LLM → `tool_use` → Tool → `tool_result` → LLM。区别只是这套 loop 运行在一份新的 `messages[]` 里。

## 给产品经理的判断标准

先用一个具体例子判断：竞品分析 Agent 可以让子 Agent 分别看价格页、功能页、客户评价。

- 子任务描述是否具体到可独立完成。
- Subagent 的 Tool 权限是否小于或等于主 Agent。
- 返回结果是否包含证据，而不是只说“已完成”。
- 主 Agent 是否能基于摘要继续，而不需要完整中间过程。
- 是否有轮次上限、错误返回和权限冒泡策略。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。

教学版展示同步 Subagent：父 Agent 等子 Agent 完成。真实系统还可能支持异步后台 Subagent、prompt cache 共享、父子中止信号传播、权限冒泡和递归保护。

教学版通过“不把 `task` Tool 给子 Agent”避免递归委派。生产实现通常会有更精细的深度、模式、Tool 范围和安全策略。

## 下一章

s08 Skill Loading 会解决另一个问题：不是所有任务都需要同一套知识。技能应该按需加载，而不是全部塞进 System Prompt。

<!-- translation-sync: zh@v3, en@v0, ja@v0 -->
