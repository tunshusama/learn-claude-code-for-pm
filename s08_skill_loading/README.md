# s08: Skill Loading -- 让专业知识按需进入 Context

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s07](../s07_subagent/) → `s08` → [s09](../s09_context_compact/) → ... → s21

> 不是所有知识都该常驻 System Prompt；该用时加载，才是 Context 管理。

## 本页怎么学

<div class="learning-card">

1. **先记住 s07 的结论**：Subagent 用独立 `messages[]` 隔离子任务过程。
2. **再看 s08 的新问题**：不同任务需要不同专业知识，但不能把所有规范都塞进 System Prompt。
3. **重点理解两层加载**：常驻的是技能目录，完整 `SKILL.md` 只有需要时才进入 Context。
4. **最后跑练习**：观察 Agent 什么时候只看目录，什么时候调用 `load_skill`。

</div>

## 这一章解决什么

### 从 s07 继承下来的能力

s07 让主 Agent 可以把子任务交给 Subagent，减少主 `messages[]` 的噪音。它解决的是“中间过程不要都塞进主 Context”。

s08 处理另一个 Context 问题：专业知识本身也不能全部常驻。

### 现有机制留下的问题

项目里可能有很多长期规范：

- React 组件规范。
- SQL 风格约定。
- API 设计流程。
- 发布检查清单。
- 代码审查标准。

如果把这些都写进 System Prompt，每一次请求都会带上它们。结果是：

- 用不到也占 Context。
- 成本增加。
- 真正重要的当前任务被大量规则稀释。
- 规范更新时 System Prompt 越来越难维护。

这不是“prompt 不够强”的问题，而是知识加载策略的问题。

### s08 的解决方案

s08 增加 `load_skill` Tool：启动时只把技能目录放进 System Prompt，完整 `SKILL.md` 在需要时才通过 Tool 加载。

![Skill Loading 机制概览](images/skill-overview.svg)

两层加载：

| 层级 | 位置 | 内容 | 成本 |
|------|------|------|------|
| 目录 | System Prompt | 技能名称和描述 | 每轮少量 token |
| 内容 | `tool_result` | 完整 `SKILL.md` | 只有调用时产生 |

这不是“增强 prompt 玄学”。它是一个明确的 Context 管理机制：先让模型知道有哪些知识可用，再让模型按任务需要取完整内容。

## 这一章你要练会什么

- 把长期规范从 System Prompt 中拆出来。
- 让 Agent 先看到技能目录，再按需加载完整内容。
- 理解 Skill 是任务流程知识，不是实时数据，也不是 Tool 本身。
- 判断哪些知识适合做 Skill，哪些应该做 Tool 或 Memory。

## 核心概念（先看词，再看代码）

| 概念 | PM 视角解释 |
|------|-------------|
| Skill | 某类任务的操作指南，通常写在 `SKILL.md`。 |
| 技能目录 | 启动时注入的技能目录，只含名称和描述。 |
| `load_skill` | 按需加载完整技能内容的 Tool。 |
| System Prompt | 只放目录和使用规则，不塞完整文档。 |
| Context | 加载后的 Skill 内容会进入当前对话历史。 |

## Skill 目录怎么进入 System Prompt

教学版启动时扫描本地 `skills/` 目录，然后拼出目录：

```python
def build_system() -> str:
    catalog = list_skills()
    return (
        f"You are a coding agent at {WORKDIR}.\n"
        f"Skills available:\n{catalog}\n"
        "Use load_skill to get full details when needed."
    )
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `catalog = list_skills()` | 扫描技能，只拿名称和描述。 |
| `You are a coding agent...` | 仍然保留基础身份和工作区信息。 |
| `Skills available:\n{catalog}` | 把技能目录放进 System Prompt。 |
| `Use load_skill...` | 明确告诉模型：需要完整细节时调用 Tool，而不是凭目录猜。 |

这里常驻的是目录，不是完整技能内容。目录越短，模型越容易判断“是否需要加载”，也越不容易污染每轮上下文。

## 完整 Skill 怎么加载

```python
def load_skill(name: str) -> str:
    skill = SKILL_REGISTRY.get(name)
    if not skill:
        return f"Skill not found: {name}"
    return skill["content"]
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `def load_skill(name: str)` | 定义 Tool handler。模型调用 `load_skill` 时会执行它。 |
| `SKILL_REGISTRY.get(name)` | 按技能名查找已扫描到的 Skill。 |
| `if not skill` | 如果模型请求了不存在的技能，就返回错误。 |
| `return skill["content"]` | 返回完整 `SKILL.md` 内容，作为 `tool_result` 进入对话。 |

加载后，模型下一轮才能基于完整技能继续工作。这个过程仍然符合 s02 的原则：模型能看到什么，取决于 Harness 往 `messages[]` 里放了什么。

## Skill、Tool、Memory 的区别

| 类型 | 解决什么 | 例子 |
|------|----------|------|
| Tool | 获取数据或执行动作 | 读文件、写文件、跑命令、查任务 |
| Skill | 某类任务应该怎么做 | 代码审查流程、发布清单、写作规范 |
| Memory | 以后还会用到的事实或偏好 | 用户偏好、项目背景、常用入口 |

如果内容是“做这类任务的流程”，适合 Skill。如果内容需要实时读取或执行，适合 Tool。如果内容是跨会话长期有效的事实，适合 Memory。

## 怎么用在真实工作流

Skill 适合承载“完成某类任务的方法”：

- 代码审查标准。
- 内容发布规范。
- 数据分析流程。
- 特定团队的上线检查清单。

Skill 不适合承载实时数据或需要执行的动作。实时数据应通过 Tool 获取；跨会话偏好和项目事实更适合 Memory。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：让 Agent 使用某个专门技能完成任务。

**预期现象**：你会看到一开始只有技能摘要，真正需要时才加载完整技能内容。

**为什么会这样**：知识不应全部塞进 System Prompt；按需加载能节省 Context，也让模型更专注。

</div>

```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
source .venv/bin/activate
python3 s08_skill_loading/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `现在有哪些可用技能？`
2. `加载 code-review 技能，并按照它的说明执行。`
3. `我需要做一次代码审查，请先加载相关技能。`

对照预期现象：

1. Agent 是否能先从目录知道有哪些 Skill。
2. 需要完整规范时是否调用 `load_skill`。
3. 加载后回答是否遵循 Skill 内容。
4. Agent 是否避免一次性加载所有 Skill。

## 本章小结

s08 的重点不是“多写一些提示词”，而是把专业知识变成可发现、可按需加载的资源。

目录常驻，内容按需。这个模式会在后面的 Memory、System Prompt 组装里反复出现：稳定且短的信息可以常驻，长而任务相关的信息应该延迟加载。

## 给产品经理的判断标准

先用一个具体例子判断：客服 Agent 不必每轮背完整手册，只有处理退款时才加载退款规则。

- Skill 名称和描述是否足够让 Agent 判断何时使用。
- Skill 内容是否是可执行流程，而不是泛泛原则。
- 是否避免把所有 Skill 全部常驻 System Prompt。
- Skill 是否有版本和责任人，避免过期规范继续影响输出。
- Skill 加载后是否能在产出中体现，而不是只被读取。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。

教学版只从本地 `skills/` 目录扫描 `SKILL.md`，只解析 `name` 和 `description`。真实系统可能有用户级、项目级、插件级、MCP 远程、条件激活和内置技能等来源。

Claude Code 的 Skill 加载不一定直接把完整内容作为普通 `tool_result` 展示；可能通过附加消息、分叉上下文、允许工具列表、模型覆盖和 Hook 配置参与执行。教学版保留“两级加载”的核心心智模型。

## 下一章

s09 Context Compact 会处理长时间运行后的 Context 膨胀。按需加载减少了不必要输入，压缩解决已经进入历史的内容如何腾出空间。

<!-- translation-sync: zh@v4, en@v2, ja@v2 -->
