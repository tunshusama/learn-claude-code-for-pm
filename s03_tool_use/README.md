# s03: Tool Use -- 把 Agent 的能力拆成可管理的工具

[s02](../s02_agent_loop/) → `s03` → [s04](../s04_permission/) → ... → s21

> s02 证明模型可以请求动作；s03 让这些动作从一条万能 bash，变成一组更清晰的专用 Tool。

## 本页怎么学

<div class="learning-card">

1. **先确认 s02 的结论**：Agent Loop 的本质是“模型判断 → Harness 执行 → 结果回到 `messages[]` → 模型再判断”。
2. **再理解 s03 的新问题**：只有一个 `bash` Tool 时，模型做任何事都得先翻译成 shell 命令，容易错、难管理。
3. **然后学习三个新角色**：Tool schema（给模型看的说明书）、Tool handler（真正执行的函数）、dispatch map（按名字找函数的路由表）。
4. **最后动手运行**：观察读文件、写文件、找文件分别走哪个 Tool。

</div>

## 这一章解决什么

### 从 s02 继承下来的能力

s02 已经实现了最小 Agent Loop：

- 用户输入进入 `messages[]`。
- 模型看到消息后，决定是“直接回答”还是“请求 Tool”。
- 如果请求 Tool，Harness 执行，把结果包装成 `tool_result` 追加回 `messages[]`。
- 模型下一轮看到 `tool_result`，再继续判断。

这个循环是 s03 的基础，**s03 不推翻它**。

### s02 留下的局限

s02 只给模型一个 Tool：`bash`。于是出现下面这些问题：

**（1）模型没有“读文件”这个工具，只能自己推理命令**

用户说“读一下 README.md 的前 20 行”时，模型不能直接使用“读文件”这个工具，而要先把它翻译成代码命令。每做一次任务都要翻译一次，既浪费 token，也容易在路径、引号、参数上出错。

**（2）Harness 看不出动作类型**

在 s02 里，所有动作都是 bash。Harness 只能看到一串字符串命令，无法区分：

- “读文件”和“删文件”风险完全不同。
- “搜索文件”和“修改文件”需要的后续处理不同。
- 产品想做权限、审计、UI 展示时，没有结构化信息可用。

**（3）结果不整齐**

bash 的输出可能带颜色代码、换行混乱、错误信息和正常输出混在一起。把这些 raw 输出直接塞回 `messages[]`，模型理解起来也更费劲。

### s03 的解决方案

s03 把能力拆成多个**专用 Tool**：

| 用户意图 | s02 只能用 bash | s03 可用专用 Tool |
|----------|----------------|-------------------|
| 读文件 | 模型想 `cat` / `head` | 模型可直接调用 `read_file(path, limit)` |
| 写文件 | 模型想 `echo ... > file` | 模型可直接调用 `write_file(path, content)` |
| 改文件 | 模型想 `sed` / 脚本 | 模型可直接调用 `edit_file(path, old_text, new_text)` |
| 找文件 | 模型想 `find` / `ls` | 模型可直接调用 `glob(pattern)` |
| 运行命令 | `bash(command)` | `bash(command)`（保留） |

核心变化不是“功能变多了”，而是**每个动作都有明确的名字、参数和职责**。这样模型不用猜命令，Harness 也能按名字路由到正确函数。

## 先复习两个 s02 概念

在深入 s03 之前，先确保下面两个概念是清楚的。如果忘记了，建议回到 s02 再看一眼。

### 1. `tool_use` 是什么？

`tool_use` 是模型写给 Harness 的一张“任务单”。它不是自然语言，而是一种结构化消息，长这样：

```json
{
  "type": "tool_use",
  "name": "read_file",
  "input": {
    "path": "README.md",
    "limit": 20
  },
  "id": "toolu_01A..."
}
```

三个字段的意思：

- `name`：Tool 的名字，例如 `read_file`。
- `input`：Tool 需要的参数，例如 `{"path": "README.md", "limit": 20}`。
- `id`：这张任务单的唯一编号，后面 `tool_result` 要对应它。

### 2. `tool_result` 是什么？

`tool_result` 是 Harness 执行完 Tool 后，把结果交还给模型的回执。它也会被追加到 `messages[]` 里，长这样：

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A...",
  "content": "# s03: Tool Use ..."
}
```

- `tool_use_id`：对应哪一张 `tool_use` 任务单。
- `content`：Tool 执行后返回的实际内容。

s01 已经证明：模型下一轮能看到什么，取决于 `messages[]` 里有什么。所以 Tool 结果必须回到 `messages[]`，模型才能继续。

## s03 新增：一个 Tool 的三层结构

s03 里每个 Tool 都分成三层。可以用一个餐厅点餐的类比来理解：

| 层级 | 餐厅类比 | 代码里的角色 | 作用 |
|------|----------|--------------|------|
| Tool schema | 菜单 | `TOOLS` 数组里的一个条目 | 告诉模型：有哪些 Tool、每个 Tool 做什么、需要什么参数 |
| Tool handler | 后厨厨师 | `run_read`、`run_write` 等函数 | 真正执行动作：读文件、写文件、运行命令 |
| dispatch map | 服务员/路由表 | `TOOL_HANDLERS` 字典 | 根据 Tool 名称，把任务单交给对应 handler |

下面用 `read_file` 作为例子，逐层解释。

### 第一层：Tool schema（给模型看的菜单）

```python
{
    "name": "read_file",
    "description": "Read a file from the current project.",
    "input_schema": {
        "type": "object",
        "properties": {
            "path": {"type": "string"},
            "limit": {"type": "integer"},
        },
        "required": ["path"],
    },
}
```

这段 schema 会被发给模型。模型看到它之后，就知道：

- 有一个 Tool 叫 `read_file`。
- 它的作用是“读当前项目里的文件”。
- 调用时必须告诉它要读哪个文件，也就是 `path`（例如 `"README.md"`）。
- `required: ["path"]` 表示：`path` 必须填，不填就不能调用这个 Tool。

**为什么需要 schema？**

因为模型不会读你的代码。它只能看到你发给它的 `TOOLS` 列表。schema 就是 Tool 的“说明书”。

**模型怎么知道该写 tool name？**

> 当用户输入“读取 README.md 前 20 行”时，模型为什么知道要输出 `tool_use: read_file {"path": "README.md", "limit": 20}`，而不是随机生成个 `check file`、`read document` 等词？

因为这里用到了模型本身的推理能力。模型不会凭空编 Tool 名字，它只能从 `TOOLS` 表单里挑。

`TOOLS` 里已经写了 `read_file`，它的描述是“读当前项目里的文件”。用户说“读 README 前 20 行”时，模型用它的语言理解能力，把“读文件”这个意图和 `read_file` 的名称、描述对应起来，选出最匹配的 Tool，然后写 `tool_use: read_file`。

它不会写 `check file`，也不会写 `read document`，因为 `TOOLS` 菜单里没有这些名字。就像你去餐厅只能点菜单上有的菜，不能点厨师没准备的菜。

### 第二层：Tool handler（真正执行的函数）

```python
def run_read(path: str, limit: int | None = None) -> str:
    lines = safe_path(path).read_text(encoding="utf-8").splitlines()
    if limit and limit < len(lines):
        hidden = len(lines) - limit
        lines = lines[:limit] + [f"... ({hidden} more lines)"]
    return "\n".join(lines)
```

这是 Harness 里的 Python 函数。它才是真正打开文件、读取内容、返回字符串的代码。

注意：**模型不执行这个函数**。模型只生成 `tool_use` 任务单；Harness 收到任务单后，调用对应的 handler。

这段代码是工具代码，和模型与 Agent 能力本身关系不大，所以在这里就不逐句讲解。感兴趣的小伙伴可以咨询 AI～

### 第三层：dispatch map（按名字路由）

```python
TOOL_HANDLERS = {
    "bash": run_bash,
    "read_file": run_read,
    "write_file": run_write,
    "edit_file": run_edit,
    "glob": run_glob,
}
```

这就是“Tool 名称 → handler 函数”的映射表。

当模型返回：

```text
tool_use: read_file {"path": "README.md", "limit": 20}
```

Harness 就会做：

```python
handler = TOOL_HANDLERS["read_file"]   # 找到 run_read
output = handler(path="README.md", limit=20)   # 执行它
```

`dispatch` 这个词的本意就是“分发”。在 s03 里，dispatch 就是“按 Tool 名称，把任务单分发给对应函数”。

## 为什么主循环不用改

这是 s03 最重要的结论。先看 `agent_loop()` 的核心部分：

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL,
            system=SYSTEM,
            messages=messages,
            tools=TOOLS,        # 把 Tool 菜单发给模型
            max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            output = dispatch_tool(block.name, dict(block.input))
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": output,
            })

        messages.append({"role": "user", "content": results})
```

逐行读：

| 代码 | 这一行在做什么 |
|------|----------------|
| `def agent_loop(messages):` | 定义 Agent Loop。它接过当前的 `messages[]`，负责持续调用模型、执行工具、写回结果。 |
| `while True:` | 开始循环。只要模型还在请求 Tool，这个循环就继续。 |
| `response = client.messages.create(` | 向模型发起一轮请求，并把模型返回放进 `response`。 |
| `model=MODEL,` | 告诉模型服务这轮使用哪个模型。 |
| `system=SYSTEM,` | 发送 system prompt，也就是这个 Agent 的基础规则。 |
| `messages=messages,` | 把当前对话记录本 `messages[]` 发给模型。 |
| `tools=TOOLS,` | 把 Tool 菜单发给模型。s03 的菜单里不只有 `bash`，还有 `read_file`、`write_file`、`edit_file`、`glob`。 |
| `max_tokens=8000,` | 限制模型这一轮最多生成多少内容。 |
| `)` | 这次模型请求的参数写完，开始等待模型返回。 |
| `messages.append({"role": "assistant", "content": response.content})` | 把模型这一轮输出记进 `messages[]`。这里可能包含自然语言，也可能包含一个或多个 `tool_use`。 |
| `if response.stop_reason != "tool_use":` | 判断模型这一轮是不是因为请求 Tool 而停下。如果不是，说明它已经给出最终回答或不需要继续行动。 |
| `return` | 退出 Agent Loop，把控制权交回外层程序。 |
| `results = []` | 准备一个列表，用来收集本轮所有 Tool 的执行结果。 |
| `for block in response.content:` | 遍历模型输出里的每一块内容。 |
| `if block.type != "tool_use":` | 如果这一块不是工具任务单，就不用交给 Harness 执行。 |
| `continue` | 跳过非 `tool_use` 内容，继续看下一块。 |
| `output = dispatch_tool(block.name, dict(block.input))` | 读取任务单里的 Tool 名称和参数，交给 `dispatch_tool()` 分发执行。这是 s03 相比 s02 最关键的变化。 |
| `results.append({` | 开始把 Tool 输出整理成一张 `tool_result` 回执。 |
| `"type": "tool_result",` | 标记这块内容是 Tool 执行结果。 |
| `"tool_use_id": block.id,` | 标记这张回执对应哪一张 `tool_use` 任务单。 |
| `"content": output,` | 把 handler 返回的真实输出放进回执。 |
| `})` | 这张 Tool 回执整理完成。 |
| `messages.append({"role": "user", "content": results})` | 把所有 Tool 回执放回 `messages[]`，下一轮模型才能看到刚才外部动作的结果。 |

这个循环里：

- 它不认识 `read_file`、`write_file`、`bash` 这些具体 Tool。
- 它只认识“模型返回了一个 `tool_use`，里面有 `name` 和 `input`”。
- 它把 `name` 和 `input` 交给 `dispatch_tool()`。
- `dispatch_tool()` 再去查 `TOOL_HANDLERS`。

所以，**新增一个 Tool 只需要做两件事**：

1. 在 `TOOLS` 里加一个 schema（让模型知道它）。
2. 在 `TOOL_HANDLERS` 里加一个映射（让 Harness 知道怎么执行）。

`agent_loop()` 一行都不用改。

### `dispatch_tool()` 长什么样

```python
def dispatch_tool(name: str, tool_input: dict[str, Any]) -> str:
    handler = TOOL_HANDLERS.get(name)
    if handler is None:
        return f"Error: unknown tool {name}"
    return handler(**tool_input)
```

这里 `handler(**tool_input)` 是 Python 的“把字典展开成关键字参数”语法。如果 `tool_input` 是 `{"path": "README.md", "limit": 20}`，那么 `handler(**tool_input)` 就等价于 `handler(path="README.md", limit=20)`。

如果你不熟悉 `**` 这个写法，可以先记住：**它把模型给的参数，按名字传给 handler 函数**。

## 多个 `tool_use` 怎么处理

模型一轮可能返回多个 `tool_use`。例如用户说：

```text
读取 README.md 和 requirements.txt，然后总结这个项目。
```

模型可能一次写出两张任务单：

```text
tool_use: read_file {"path": "README.md"}
tool_use: read_file {"path": "requirements.txt"}
```

教学版会按顺序逐个执行，然后把多个结果一起放回 `messages[]`：

```python
results = []
for block in response.content:
    if block.type == "tool_use":
        output = dispatch_tool(block.name, dict(block.input))
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": output,
        })

messages.append({"role": "user", "content": results})
```

这里 `results` 是一个列表，里面可能有多条 `tool_result`。把它们一次性追加到 `messages[]`，模型下一轮就能看到全部结果。

**为什么不并行执行？**

教学版按顺序执行，是为了让逻辑最简单。真实产品里，多个 Tool 调用可能是独立的，可以并行；但如果它们有依赖关系（例如先读后写），就必须按顺序。这个取舍会在更复杂的系统里专门设计。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：分别让 Agent 读文件、写文件、搜索文件。

**预期现象**：终端会打印 `工具: read_file`、`工具: write_file`、`工具: glob` 等不同 Tool 名称，而不是所有任务都走 bash。

**为什么会这样**：模型看到的 `TOOLS` 不再只有 bash。它可以根据任务语义选择更合适的专用 Tool。

</div>

<div class="note">
  <p><strong>教学 demo 提醒</strong></p>
  <p>本章仍然保留 bash Tool。建议在学习项目目录或临时目录里运行，不要让 demo 处理重要目录里的删除、覆盖、移动类任务。真正的权限系统会在 s04 介绍。</p>
</div>

```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
source .venv/bin/activate
python3 s03_tool_use/code.py
```

### 实验一：读取文件

输入：

```text
读取 README.md 的前 20 行，并用三句话说明这个项目是什么。
```

你应该看到类似输出：

```text
工具: read_file {'path': 'README.md', 'limit': 20}
结果: ...
模型: ...
```

对照 s02：如果只有 bash，模型通常会生成 `head` 或 `cat` 命令；到了 s03，读文件可以直接走 `read_file`。

### 实验二：创建并读回文件

输入：

```text
创建 s03_tool_use/tmp_hello.py，内容是 print("hello from s03")，然后读回确认。
```

你应该观察三件事：

1. 创建文件时通常会调用 `write_file`。
2. 验证内容时通常会调用 `read_file`。
3. 两个 Tool 的结果都会作为 `tool_result` 回到 `messages[]`，模型最后才能确认任务完成。

### 实验三：搜索文件

输入：

```text
找出项目里 s03_tool_use 目录下所有 .py 文件。
```

你应该看到模型调用 `glob`，例如：

```text
工具: glob {'pattern': 's03_tool_use/**/*.py'}
```

如果模型改用 bash，也不代表机制失败。模型是在可用工具中做选择；你要观察的是：专用 Tool 已经出现在能力菜单里，并且 Harness 能正确分发。

## 本章小结

s03 的核心不是多了几个文件操作函数，而是 Agent Harness 的形状变清楚了：

```text
模型返回 tool_use
  → 读取 tool_use.name
  → 到 TOOL_HANDLERS 查找 handler
  → 把 tool_use.input 传给 handler
  → 把输出包装成 tool_result
  → 追加回 messages[]
```

s02 证明了 Agent 可以行动；s03 证明了行动可以被拆成可描述、可路由、可治理的工具。

后面加权限、Hook、错误恢复、任务系统，本质上都会接在这个 Tool 边界上。

## 给产品经理的判断标准

先用一个具体例子判断：如果你要做“读取客户合同并生成摘要”的 Agent，不应该只暴露一个万能 shell，而要设计 `read_contract`、`extract_clause`、`create_summary` 这类业务语义清楚的 Tool。

- Tool 名称是否能让非工程读者理解。
- Tool 参数是否足够结构化，避免模型自由发挥。
- Tool 结果是否简洁，避免把无关日志塞回 Context。
- 高频动作是否有专用 Tool，低频开放动作是否先保留人工或 bash 入口。
- 新增 Tool 是否不需要改动 Agent Loop 主干。
- 不同风险等级的 Tool 是否能在后续接入不同权限策略。

## 常见问题

**问题：为什么还保留 bash？**

因为教学版需要保留一个开放能力入口。专用 Tool 适合稳定、高频、结构明确的动作；bash 适合临时探索。但真实产品里，bash 必须接权限、审批和审计。

**问题：模型为什么有时仍然选择 bash，而不是 read_file？**

模型会根据 Tool 描述、用户表达和上下文做选择。你可以通过更清晰的 Tool 描述、更明确的 system prompt、或在产品层限制 bash 使用来提高专用 Tool 的命中率。

**问题：`safe_path()` 是权限系统吗？**

不是。它只是防止文件 Tool 访问当前项目目录外的路径。真正的权限系统要回答“这个 Tool 能不能执行、是否要问用户、谁批准、怎么记录”，这会在 s04 介绍。

**问题：Tool schema 和 handler 必须一一对应吗？**

教学版里是一一对应的，但真实产品不一定。一个 schema 可以对应多个 handler 实现（例如不同环境），也可以多个 schema 复用同一个 handler。关键是 `TOOL_HANDLERS` 这个路由表把名字和实现解耦了。

**问题：如果模型传错了参数怎么办？**

教学版里没有做参数校验，handler 可能直接报错，错误信息会作为 `tool_result` 回到模型。真实产品会在 dispatch 前加 schema 校验，让模型更早知道参数格式不对。

**错误：`请先在项目根目录的 .env 里配置 ANTHROPIC_API_KEY, MODEL_ID`**

原因：你还没有完成 s00 的 `.env` 配置，或者保留了示例占位符。  
修复：回到项目根目录，打开 `.env`，填入真实 key 和模型名，然后重新运行。

**错误：`No module named anthropic` 或 `No module named dotenv`**

原因：你没有安装依赖，或者没有激活虚拟环境。  
修复：

```sh
cd ~/learn-claude-code-main
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 s03_tool_use/code.py
```

## 代码证据与工程读者附录

这一节给想看实现的人。新手可以先跳过；等你能说清楚本章机制解决什么产品问题，再回来读代码。

本章代码可以按五段读，不需要一开始就逐行背：

| 行 | 代码位置 | 解释 |
|----|----------|------|
| 14-26 | `.env`、`WORKDIR`、`SYSTEM` | 和 s01 一样先读取配置，再设置当前工作目录和 system prompt。 |
| 29-40 | `require_setup()` | 运行前检查 `ANTHROPIC_API_KEY` 和 `MODEL_ID`，避免用一半才报错。 |
| 43-47 | `safe_path()` | 把文件路径限制在当前项目目录内，防止 `../` 逃逸。 |
| 50-70 | `run_bash()` | 仍然保留 bash Tool，用于开放命令；教学版只加了很小的危险命令拦截。 |
| 73-114 | `run_read()`、`run_write()`、`run_edit()`、`run_glob()` | 四个专用文件 Tool 的真实执行函数。 |
| 117-173 | `TOOLS` | 发给模型的 Tool schema 列表。模型根据这里的名称、描述和参数结构生成 `tool_use`。 |
| 175-181 | `TOOL_HANDLERS` | Tool 名称到 Python 函数的分发表。新增 Tool 时要在这里注册。 |
| 184-188 | `dispatch_tool()` | 根据 `tool_use.name` 找到 handler，并把 `tool_use.input` 展开成函数参数。 |
| 191-220 | `agent_loop()` | 延续 s02 的 Agent Loop：调模型、记录 assistant 输出、执行工具、写回 `tool_result`。 |
| 223-230 | `print_final_text()` | 从最后一轮 assistant 内容里取出文本块并打印。 |
| 233-251 | 入口循环 | 和 s01 一样持续等待用户输入；区别是每轮会调用 `agent_loop()`，而不是只调用一次普通模型。 |

最关键的几行是：

```python
handler = TOOL_HANDLERS.get(name)
return handler(**tool_input)
```

它们把模型写出的结构化任务单，变成 Harness 里的真实函数调用。

生产级 Agent 会继续在这个位置增加更多层：schema 校验、Tool 级输入校验、PreToolUse Hook、权限判断、并发安全判断、结果截断或落盘。教学版故意只保留 dispatch 的骨架，方便你先看清楚 Tool Use 的最小机制。

## 下一章

s04 Permission 会在 Tool 执行前加一道门。Agent 有了更多能力之后，产品必须回答：哪些 Tool 能自动执行，哪些需要问用户，哪些永远不能执行。

<!-- translation-sync: zh@v4, en@v0, ja@v0 -->
