# s04: Permission -- 把自动执行变成可控执行

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[s03](../s03_tool_use/) → `s04` → [s05](../s05_hooks/) → ... → s21

> 自动化不是默认放行，而是默认可判断。

## 本页怎么学

<div class="learning-card">

1. **先看上方机制演示**：不用记英文标签，先看箭头和状态变化。
2. **再读“这一章解决什么”**：确认它解决的是哪个产品问题。
3. **运行“动手练习”**：逐条输入 prompt，对照预期现象。
4. **最后看代码证据**：只看本章机制对应的关键代码，不需要从头背源码。

</div>

## 这一章解决什么

s02 的 Agent 已经有多个 Tool。文件 Tool 有路径保护，但 bash 仍然可能执行高风险命令。用户说“清理项目”，模型可能选择删除文件；用户说“部署一下”，模型可能触发线上操作。

这一章在 Tool 执行前加入 Permission 判断：允许、拒绝，或暂停让用户确认。目标不是承诺绝对安全，而是让风险动作进入明确的决策流程。

![Permission Overview](images/permission-overview.svg)

## 这一章你要练会什么

这里的“练会”不是靠阅读完成。建议你先看上方机制演示，再运行本章 demo，对照后面的预期现象检查自己是否理解。


- 给 Agent 的 Tool 调用加上执行前审批。
- 区分硬拒绝、规则命中、用户确认三类策略。
- 设计 PM 可理解的权限分层：哪些自动放行，哪些询问，哪些禁止。
- 理解权限系统为什么必须在 Harness 层实现，而不能只靠 System Prompt。

## 核心概念（先看词，再看代码）

遇到 Bash、Harness、dispatch、tool_use 这类词时，先把鼠标悬停在词上，看右侧解释。不要急着背代码，先理解它在产品里负责什么。


| 概念 | PM 视角解释 |
|------|-------------|
| Permission | Tool 执行前的决策层。 |
| deny list | 永远不允许执行的操作。 |
| ask rule | 需要用户确认的操作，例如删除、写工作区外文件。 |
| allow | 通过权限检查后才真正执行 Tool。 |
| Harness | 权限判断必须由 Harness 执行，不能只让模型“自觉”。 |

![Permission Pipeline](images/permission-pipeline.svg)

教学版使用三道门：

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
def check_permission(block) -> bool:
    if block.name == "bash":
        reason = check_deny_list(block.input.get("command", ""))
        if reason:
            print(reason)
            return False

    reason = check_rules(block.name, block.input)
    if reason:
        decision = ask_user(block.name, block.input, reason)
        if decision == "deny":
            return False

    return True
```

插入位置很关键：必须在 handler 执行前。

```python
# 读法提示：先看函数名和数据流，再看细节。注释说明每段代码在 Harness 里负责什么。
for block in response.content:
    if block.type == "tool_use":
        if not check_permission(block):
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": "Permission denied.",
            })
            continue
        output = TOOL_HANDLERS[block.name](**block.input)
```

## 怎么用在真实工作流

把权限设计成产品策略，而不是工程补丁：

- 只读查询通常可自动放行，例如读文件、搜索、查看状态。
- 写入、删除、发布、付费、外部发送等动作通常需要确认。
- 明确高风险动作要硬拒绝，例如系统级删除、绕过安全策略、泄露密钥。
- 权限提示要展示 Tool、参数、原因和影响范围，让用户能做判断。
- 被拒绝的动作也要作为 `tool_result` 回传，让 Agent 能改用低风险方案。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：尝试安全命令和危险命令各一次。

**预期现象**：安全动作会继续执行；越界写入、删除、发布等动作会被拦住或要求确认。

**为什么会这样**：Agent 的自由度来自 Tool，但产品可信度来自执行前的权限门。

</div>


```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
python3 s04_permission/code.py
```

练习 prompt（逐条输入，不要一次全贴）：

1. `Create a file called test.txt in the current directory`
2. `Delete all temporary files in /tmp`
3. `What files are in the current directory?`
4. `Try to write a file to /etc/something`

对照预期现象：哪些操作直接通过？哪些触发确认？哪些被直接拒绝？被拒绝后 Agent 是否能继续解释或调整方案？

## 给产品经理的判断标准

先用一个具体例子判断：让 Agent 改网页可以自动保存草稿，但上线发布必须审批。


- 权限规则是否围绕真实业务风险，而不是围绕技术实现细节。
- 用户确认弹窗是否说明“为什么问你”。
- 被拒绝后是否有清晰的替代路径。
- 是否避免把危险能力藏在一个宽泛 Tool 里。
- 权限策略是否可审计、可配置、可随团队成熟度调整。

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。


教学版用字符串匹配演示 deny list，这不是生产级安全机制。真实系统需要更强的命令解析、参数校验、路径规范化、策略来源合并和审计记录。

Claude Code 的权限结果不只是 allow/deny/ask，还包括 passthrough；权限来源也可能来自用户配置、项目配置、企业策略、命令行参数和会话临时授权。Hook 可以参与权限判断，但不能绕过更高优先级的 deny/ask 规则。

## 下一章

s05 Hooks 会把权限检查从循环里抽出来。你会看到如何在不污染 Agent Loop 的前提下扩展日志、权限、通知和收尾逻辑。

<!-- translation-sync: zh@v2, en@v1, ja@v1 -->
