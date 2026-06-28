# s17: Team Protocols -- 让 Agent 协作有明确握手

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s16](../s16_agent_teams/) → `s17` → [s18](../s18_autonomous_agents/) → ... → s21

> 团队协作不能只靠自然语言消息；关键动作需要 request/response 和状态追踪。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

s15 的队友可以通信，但通信是松散文本。两个场景会出问题：

- Lead 想让队友关机，直接杀线程可能留下未完成写入。
- 队友想做高风险重构，应该先提交计划，等 Lead 审批。

本章把这类协作变成结构化协议：请求带 `request_id`，回复带同一个 `request_id`，Harness 更新请求状态。

![Team Protocols Overview](images/team-protocols-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 理解为什么 Agent 团队需要协议，而不只是聊天。
- 用同一套 request/response 模式表达关机和计划审批。
- 能判断协议是否可追踪、可拒绝、可恢复。
- 能把“让 Agent 自主”与“关键动作要审批”区分开。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


**ProtocolState**：记录请求 ID、类型、发送方、接收方、状态、payload 和创建时间。

**`request_id`**：请求与响应的关联键。没有它，Lead 很难知道哪个回复对应哪个请求。

**shutdown_request / shutdown_response**：Lead 请求队友体面退出，队友确认后再结束。

**plan_approval_request / plan_approval_response**：队友提交计划，Lead 审批通过或拒绝。

**dispatch_message**：按消息类型路由到对应处理器，而不是把所有 inbox 内容都当普通文本。

## 怎么用在真实工作流

PM 可以把协议用于所有“需要确认后才能继续”的节点：

- 关机前确认队友已收尾。
- 重构前提交计划。
- 高风险 Tool 调用前请求 permission。
- 大范围删除、部署、迁移前要求审批。

协议的价值是让协作可审计、可拒绝、可追踪。它不意味着所有动作都要审批；只应把关键风险点放进协议。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：让队友提交计划或请求关机。

**预期现象**：你会看到消息里有 request_id、类型和结构化字段。

**为什么会这样**：协议让协作动作可验证，避免自然语言误解。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s17_team_protocols/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Spawn alice as a backend dev. Ask her to create a file. Then request her shutdown.`
2. `Spawn bob with a refactoring task. Have him submit a plan first. Then review and approve it.`

对照预期现象：关机是否经历请求、确认、退出；`pending_requests` 是否从 `pending` 变成 `approved` 或 `rejected`；响应里的 `request_id` 是否和请求一致。

## 给产品经理的判断标准

先用一个具体例子判断：审批“是否上线”应是结构化 approve/reject，而不是一句模糊回复。


- 所有关联请求都要有 ID，不能靠文本猜测。
- 协议要允许拒绝，并记录拒绝原因。
- 审批通过不等于无限授权，应限定范围和后续动作。
- 队友 idle 时也应能处理 shutdown_request。
- 计划审批如果没有执行门控，只是提示，不是真正的控制。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版的协议状态：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
@dataclass
class ProtocolState:
    request_id: str
    type: str            # shutdown | plan_approval
    sender: str
    target: str
    status: str          # pending | approved | rejected
    payload: str
    created_at: float
```

请求流程是：创建 `ProtocolState` → 发送带 `request_id` 的消息 → 接收方按类型 dispatch → 回复带同一 `request_id` → `match_response()` 校验类型并更新状态。

教学版用 `shutdown_response` 加 `approve` 字段统一表示同意或拒绝。真实系统也可以拆成 `shutdown_approved` 和 `shutdown_rejected`。更重要的是执行门控：如果 plan 未批准，高风险 `bash`、`write_file` 或 destructive MCP Tool 应被 Harness 拦截。

## 下一章

s17 Autonomous Agents → 有协议后，下一章让队友在空闲时自己看任务板、自己认领任务。
