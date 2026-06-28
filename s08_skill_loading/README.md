# s08: Skill Loading -- 让专业知识按需进入 Context

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s07](../s07_subagent/) → `s08` → [s09](../s09_context_compact/) → ... → s21

> 不是所有知识都该常驻 System Prompt。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

项目里可能有 React 规范、SQL 风格、API 设计约定、发布流程。如果全部放进 System Prompt，每次请求都带几千行文档，即使用不到也会占 Context 和成本。

这一章增加 `load_skill` Tool：启动时只把技能目录放进 System Prompt，完整 `SKILL.md` 在需要时才通过 Tool 加载。

![Skill Overview](images/skill-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 把长期规范从 System Prompt 中拆出来。
- 让 Agent 先看到技能目录，再按需加载完整内容。
- 理解技能是 Context 管理机制，不只是“提示词模板”。
- 判断哪些知识适合做 Skill，哪些应该做 Tool 或 Memory。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


| 概念 | PM 视角解释 |
|------|-------------|
| Skill | 某类任务的操作指南，通常写在 `SKILL.md`。 |
| skill catalog | 启动时注入的技能目录，只含名称和描述。 |
| `load_skill` | 按需加载完整技能内容的 Tool。 |
| System Prompt | 只放目录和使用规则，不塞完整文档。 |
| Context | 加载后的 Skill 内容会进入当前对话历史。 |

两层加载：

| 层级 | 位置 | 内容 | 成本 |
|------|------|------|------|
| 目录 | System Prompt | 技能名称和描述 | 每轮少量 token |
| 内容 | `tool_result` | 完整 `SKILL.md` | 只有调用时产生 |

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
def build_system() -> str:
    catalog = list_skills()
    return (
        f"You are a coding agent at {WORKDIR}.\n"
        f"Skills available:\n{catalog}\n"
        "Use load_skill to get full details when needed."
    )

def load_skill(name: str) -> str:
    skill = SKILL_REGISTRY.get(name)
    if not skill:
        return f"Skill not found: {name}"
    return skill["content"]
```

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
python3 s08_skill_loading/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `What skills are available?`
2. `Load the code-review skill and follow its instructions`
3. `I need to do a code review -- load the relevant skill first`

对照预期现象：Agent 是否能先从目录知道有哪些 Skill？需要完整规范时是否调用 `load_skill`？加载后回答是否遵循 Skill 内容？

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

Claude Code 的 Skill 加载不一定直接把完整内容作为普通 `tool_result` 展示；可能通过附加消息、forked context、allowed-tools、model 覆盖和 Hook 配置参与执行。教学版保留“两级加载”的核心心智模型。

## 下一章

s09 Context Compact 会处理长时间运行后的 Context 膨胀。按需加载减少了不必要输入，压缩解决已经进入历史的内容如何腾出空间。

<!-- translation-sync: zh@v3, en@v2, ja@v2 -->
