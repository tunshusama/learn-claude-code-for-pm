# s11: System Prompt -- 按运行状态组装 Agent 行为

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s10](../s10_memory/) → `s11` → [s12](../s12_error_recovery/) → ... → s21

> System Prompt 是运行时配置，不是一段越写越长的口号。

## 本页怎么学

<div class="learning-card">

1. **先记住 s10 的结论**：Memory 有索引和内容，相关记忆会按需进入当前 Context。
2. **再看 s11 的新增问题**：Tool、Skill、Memory、工作区状态都变多后，System Prompt 不能继续写成一段硬编码字符串。
3. **重点理解分段组装**：稳定 section 常驻，动态 section 根据真实运行状态加入。
4. **最后跑练习**：观察工作区、Memory 或 Tool 状态变化时，Prompt 如何重新组装。

</div>

## 这一章解决什么

从 s01 到 s10，Agent 增加了很多能力：

- Tool 和 dispatch。
- Permission 和 Hooks。
- TodoWrite 和 Subagent。
- Skill Loading。
- Context Compact。
- Memory。

如果 System Prompt 仍然是一大段硬编码字符串，每加一个能力都容易引入冲突，也难以按项目状态调整。

s11 把 System Prompt 拆成 sections，并在运行时根据真实状态组装：启用了哪些 Tool、当前工作区是什么、是否有 Memory。

![System Prompt 机制概览](images/system-prompt-overview.svg)

## 这一章你要练会什么

- 把 System Prompt 拆成可维护的模块。
- 根据运行时 Context 加载必要 section。
- 区分本地字符串缓存和 API 级 prompt cache。
- 判断哪些内容应该稳定常驻，哪些应该动态注入。

## 核心概念（先看词，再看代码）

| 概念 | PM 视角解释 |
|------|-------------|
| System Prompt | Agent 的基础行为约束和能力说明。 |
| section 段落 | System Prompt 的独立段落，例如身份、工具、工作区、Memory。 |
| 运行时组装 | 根据当前状态拼接 Prompt。 |
| prompt cache | 稳定内容可复用，动态内容要谨慎放置。 |
| Context | 组装 Prompt 时使用的真实运行状态。 |

## 分段定义

```python
PROMPT_SECTIONS = {
    "identity": "You are a coding agent. Act, don't explain.",
    "tools": "Available tools: bash, read_file, write_file.",
    "workspace": f"Working directory: {WORKDIR}",
    "memory": "Relevant memories are injected below when available.",
}
```

这段代码里保留英文，因为它模拟的是实际发给模型的 System Prompt。中文读法是：

| section | 作用 |
|---------|------|
| `identity` | 说明 Agent 身份和基础行为。 |
| `tools` | 说明可用工具。真实系统应由实际注册的 Tool 生成。 |
| `workspace` | 注入当前工作目录。 |
| `memory` | 说明相关记忆会在下方注入。 |

## 按需组装

```python
def assemble_system_prompt(context: dict) -> str:
    sections = [
        PROMPT_SECTIONS["identity"],
        PROMPT_SECTIONS["tools"],
        PROMPT_SECTIONS["workspace"],
    ]

    memories = context.get("memories", "")
    if memories:
        sections.append(f"Relevant memories:\n{memories}")

    return "\n\n".join(sections)
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `def assemble_system_prompt(...)` | 定义 Prompt 组装函数。输入是当前运行状态。 |
| `sections = [...]` | 先放入稳定基础 section。 |
| `memories = context.get(...)` | 从当前 Context 里取相关 Memory。 |
| `if memories:` | 只有真的有相关记忆时，才加入 Memory section。 |
| `sections.append(...)` | 把动态内容追加到 Prompt。 |
| `return "\n\n".join(sections)` | 用空行拼接成最终 System Prompt。 |

这里的重点是“根据真实状态组装”，而不是按用户关键词硬猜。

## 缓存组装结果

```python
def get_system_prompt(context: dict) -> str:
    global _last_context_key, _last_prompt
    key = json.dumps(context, sort_keys=True, ensure_ascii=False, default=str)
    if key == _last_context_key and _last_prompt:
        return _last_prompt
    _last_context_key = key
    _last_prompt = assemble_system_prompt(context)
    return _last_prompt
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `key = json.dumps(...)` | 把当前运行状态转成稳定字符串，作为缓存 key。 |
| `if key == _last_context_key` | 如果状态没变，就复用上次组装结果。 |
| `return _last_prompt` | 返回本地缓存的字符串。 |
| `_last_prompt = assemble_system_prompt(context)` | 状态变化时重新组装 Prompt。 |

注意：教学版的缓存只是避免重复拼接字符串，不等同于 API prompt cache。真实 API 级缓存还要考虑哪些内容稳定、哪些内容动态、缓存边界放在哪里。

## 怎么用在真实工作流

System Prompt 组装适合产品化 Agent：

- 不同项目有不同工作目录、工具集合、记忆索引。
- 不同模式有不同指令，例如审查模式、执行模式、只读模式。
- 动态信息要尽量短，避免破坏缓存和稀释核心行为。
- Tool 的真实注册状态应驱动 Prompt，而不是靠手写描述猜测。

PM 需要把 System Prompt 当作产品配置面：哪些指令稳定、哪些可变、哪些由用户或团队策略控制。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：改变工作区、Memory 或可用 Tool 后再运行。

**预期现象**：你会看到 System Prompt 由不同 section 重新组装，而不是一段固定文本。

**为什么会这样**：Prompt 是产品运行状态的结果，应该由配置、能力和上下文共同生成。

</div>

```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
source .venv/bin/activate
python3 s11_system_prompt/code.py
```

对照预期现象：

1. 输出中能看到哪些 section 被加载了，例如 `[assembled] sections: ...`。
2. 连续对话时是否显示 `[cache hit]`。
3. 创建 `.memory/MEMORY.md` 后，下一轮是否自动加载 Memory section。

练习 prompt（逐条输入，不要一次全贴）：

1. `读取 README.md`
2. `创建一个 .memory/MEMORY.md 文件，内容为 "- [test](test.md) — 测试记忆"`
3. `读取 s11_system_prompt/code.py`

## 本章小结

s11 的机制很单一：把 System Prompt 从硬编码长字符串，变成根据运行状态组装出来的 sections。

它为后面的错误恢复和任务系统做铺垫：当状态越来越多时，Prompt 必须能稳定、可控地反映当前能力边界。

## 给产品经理的判断标准

先用一个具体例子判断：不同团队、项目、权限模式下，同一个 Agent 应看到不同的规则和工具说明。

- Prompt 是否按能力和状态分段，而不是一整段不可维护文本。
- 动态 section 是否基于真实状态加载，而不是关键词猜测。
- Tool 列表是否与实际注册 Tool 一致。
- Memory、Skill、工作区等动态信息是否控制长度。
- Prompt 修改是否能局部评估影响。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。

教学版的缓存只避免重复拼接字符串，不等同于 API prompt cache。生产系统通常会把稳定 section 和动态 section 分开，尽量让身份、基础规则、常驻工具说明命中缓存，而把 Memory、MCP 状态、环境信息等动态内容放在边界之后。

真实 Claude Code 的 System Prompt section 数量会随模式、工具、MCP、用户类型、输出风格和功能开关变化。还会区分 system context 与 user context，例如工作区信息、日期、CLAUDE.md、git 状态等。教学版只保留最小的分段和运行时组装模型。

## 下一章

s12 Error Recovery 会处理 Agent 运行中的常见失败：限流、网络错误、输出截断、上下文超限。能组装 Prompt 只是开始，能从失败中恢复才接近可用工作流。

<!-- translation-sync: zh@v3, en@v1, ja@v1 -->
