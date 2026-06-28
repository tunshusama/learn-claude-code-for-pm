# s01: LLM 基础 -- 先理解模型为什么是无状态的

[s00](../s00_setup/) → `s01` → [s02](../s02_agent_loop/) → s03 → ... → s21

> 学习 Agent Loop 之前，先理解普通 LLM 调用是怎么工作的。

## 本页怎么学

<div class="learning-card">

1. **先理解 messages[]**：多轮对话不是模型自己记住，而是程序把历史重新发给它。
2. **再理解 while True**：循环不是魔法，只是“收集输入 → 调模型 → 打印回复 → 继续等输入”。
3. **最后再看 s02**：Agent Loop 只是在这个聊天循环里加入 Tool。

</div>

## 这一章解决什么

一次模型调用是什么、`messages[]` 是什么，多轮对话为什么要靠 `messages[]`、模型为什么无状态、`system prompt` 是什么、`while True` 是什么。

## 这一章你要练会什么

- 看懂一次 LLM API 调用的输入和输出。
- 理解模型本身无状态：它不会自动记住上一轮，历史由客户端维护。
- 理解 `messages[]` 是多轮对话的真实载体。
- 理解 `system prompt` 是产品给模型的出厂设置。
- 理解 `while True` 只是让程序持续等待输入的循环。

## 核心概念（先看词，再看代码）

| 概念 | 解释 |
|------|------|
| API 调用 | 程序向模型服务发送请求，模型返回文本。 |
| `messages[]` | 一个消息数组，里面保存 system、user、assistant 的历史。 |
| 无状态 | 模型每次只看你本次发过去的内容，不会自动保留上一轮。 |
| `system prompt` | 用户通常看不到的基础指令，用来定义模型角色和规则。可以理解为开发者给 Agent 设定的人设。 |
| `while True` | Python 里的循环语句，不是函数。可以先理解成“只要条件成立，就一直重复执行下面缩进的代码”。 |

## 学习与 Agent 对话的原理

**一、Agent 是如何接收消息的？**

每一次与 Agent 对话，都是通过代码将 `system prompt` 与用户输入的话发给模型，模型生成回复并输出。

```python
# 读法提示：先看 messages，再看 API 调用。
messages = [
    {"role": "system", "content": "你是一个简洁的助手。"},
    {"role": "user", "content": "你好"},
]

response = client.messages.create(
    model=MODEL,
    system=messages[0]["content"],
    messages=messages[1:],
)
print(response.content)
```

逐行读：

| 代码 | 这行在做什么 |
|------|--------------|
| `messages = [` | 创建一份要发给模型的消息列表。你可以把它理解成聊天记录表。 |
| `{"role": "system", ...}` | 放入开发者给模型的基础设定：你要做一个简洁的助手。 |
| `{"role": "user", ...}` | 放入用户真正说的话：你好。 |
| `]` | 这份消息列表准备好了。 |
| `response = client.messages.create(` | 开始向模型服务发起一次请求，并把结果放进 `response`。 |
| `model=MODEL,` | 告诉模型服务：这次使用哪个模型。 |
| `system=messages[0]["content"],` | 把第一条 system 内容单独取出来，作为系统指令发给模型。 |
| `messages=messages[1:],` | 把剩下的 user 消息作为对话内容发给模型。 |
| `)` | 这次请求参数写完，开始等待模型返回。 |
| `print(response.content)` | 把模型返回的内容显示出来。 |

这里最容易误会的是：`messages` 不是模型脑子里的记忆，它只是程序手里的一张聊天记录表。模型每次被调用时，只能看到这次发过去的内容。

**二、Agent 为什么有记忆？**

多轮对话的关键不是模型“记住了”，而是程序把历史留在数组（可以先理解成一张按顺序排列的清单）里：

这里选择看第二段代码，是因为它对应“多轮对话为什么看起来有记忆”：每一轮都把用户输入和模型回答追加回 `messages[]`，下一轮再把完整历史重新发给模型。

下面三行可以按“记账”来理解：

1. 第一行：把用户这次说的话记进 `messages[]`。
2. 第二行：把完整 `messages[]` 发给模型，所以模型能看到前面的历史。
3. 第三行：把模型这次回答的内容也记进 `messages[]`，留给下一轮继续用。

也就是说，每次对话 Agent 接收的信息，不止是 `system prompt` 和用户输入的新指令，还有前面几轮的全部对话信息。

```python
# 读法提示：每一轮都把新消息 append 到 messages[]。
messages.append({"role": "user", "content": user_input})
response = call_model(messages)
messages.append({"role": "assistant", "content": response_text})
```

逐行读：

| 代码 | 这行在做什么 |
|------|--------------|
| `messages.append({"role": "user", "content": user_input})` | 把用户这一轮输入的话，追加到聊天记录表里。 |
| `response = call_model(messages)` | 把完整聊天记录表发给模型，所以模型能“看到”前面发生过什么。 |
| `messages.append({"role": "assistant", "content": response_text})` | 把模型这一轮回答也追加到聊天记录表里，留给下一轮使用。 |

**三、为什么 Agent 会一直等你输入？**

`while True` 这部分也要看，因为它解释了“为什么程序会一直等你输入，而不是回答一次就退出”。

这里选择看第三段代码，是因为它对应“聊天循环”的最小结构：不断等待用户输入；如果用户输入 `/exit` 就退出；否则把输入发给模型，打印回答，再把回答记回 `messages[]`。

```python
# 读法提示：这个 while True 只是持续读用户输入。
while True:
    user_input = input("你: ").strip()
    if user_input == "/exit":
        print("再见！")
        break
    if not user_input:
        continue

    messages.append({"role": "user", "content": user_input})
    print("模型: ", end="", flush=True)
    answer = call_model(messages)
    print("\n")
    messages.append({"role": "assistant", "content": answer})
```

逐行读：

| 代码 | 这行在做什么 |
|------|--------------|
| `while True:` | 开始一个持续循环。只要没有遇到 `break`，程序就会一直重复下面的步骤。 |
| `user_input = input("你: ").strip()` | 在终端里等待用户输入一句话，并去掉前后的空格。（读起来可能有些抽象，但在“动手练习”中一做你就明白这段是什么意思了。） |
| `if user_input == "/exit":` | 判断用户是不是输入了退出命令。 |
| `print("再见！")` | 如果要退出，就先打印一声“再见”。 |
| `break` | 跳出 `while True` 循环，程序结束。 |
| `if not user_input:` | 如果用户什么都没输入，就进入下面的处理。在这里就是 `continue`。 |
| `continue` | 跳过本轮，不调用模型，直接回到循环开头继续等输入。 |
| `messages.append({"role": "user", "content": user_input})` | 把用户这次说的话记进 `messages[]`。 |
| `print("模型: ", end="", flush=True)` | 先显示 `模型:`，并且不换行，方便后面的流式内容接着出现。 |
| `answer = call_model(messages)` | 把完整 `messages[]` 发给模型，模型会边生成边显示回答。 |
| `print("\n")` | 模型回答结束后补一个空行，让下一轮输入更清楚。 |
| `messages.append({"role": "assistant", "content": answer})` | 把模型回答也记进 `messages[]`，下一轮继续带上。 |

可以把这段读成一句话：只要用户没说退出，程序就一直“收集输入 → 追加到 `messages[]` → 调模型 → 打印回答 → 把回答也追加到 `messages[]`”。后面的 Agent Loop 只是把“调模型后直接打印回答”，升级成“模型如果要求用 Tool，就先执行 Tool，再把结果放回 `messages[]`”。

## 怎么用在真实工作流

你在 ChatGPT、Kimi、Claude 里看到的“连续聊天”，本质上都依赖客户端维护历史。模型服务不会天然记住你是谁、上一句说了什么、刚才生成了什么文件。产品如果需要记忆，就必须设计保存、加载、压缩和筛选机制。

这也是后面课程的主线：

- s02 Agent Loop：在普通聊天循环里加入 Tool。
- s09 Memory：把长期有用的信息保存下来。
- s08 Context Compact：历史太长时压缩。
- s10 System Prompt：把产品规则和当前状态组装给模型。

## 动手练习：输入什么、会看到什么

<div class="learning-card">

**本章练习任务**：对比“发送完整 `messages[]`”和“只发送本轮输入”两种情况。

**预期现象**：正常版本里，模型第二轮能说出“小王”；断开历史后，模型通常就无法稳定回答“小王”。

**为什么会这样**：模型没有跨请求记忆。它能不能“记得”，取决于客户端这一轮到底给它发送了哪些消息。

</div>

```sh
# 在项目根目录运行。每行命令前的 # 是说明，不需要复制；没有 # 的行才需要执行。
cd ~/learn-claude-code-main
source .venv/bin/activate
python3 s01_llm_basics/code.py
```

### 实验一：发送完整 messages[]

先不要改代码，直接运行正常版本。逐条输入：

1. `我叫小王，我在学 Agent 产品架构。请用三句话鼓励我。`
2. `我叫什么名字？`

对照预期现象：

```text
你: 我叫小王，我在学 Agent 产品架构。请用三句话鼓励我。
模型: 好的，小王。...

你: 我叫什么名字？
模型: 你叫小王。
```

第二轮调用模型时，程序发出去的 `messages[]` 大致是：

```python
[
    {"role": "user", "content": "我叫小王，我在学 Agent 产品架构。请用三句话鼓励我。"},
    {"role": "assistant", "content": "好的，小王。..."},
    {"role": "user", "content": "我叫什么名字？"},
]
```

所以模型不是在服务器里记住了你，而是这一轮又看到了前面的聊天记录。

### 实验二：只发送本轮输入

现在做一个对照实验。打开 `s01_llm_basics/code.py`，临时把这一行：

```python
answer = call_model(messages)
```

改成：

```python
answer = call_model([{"role": "user", "content": user_input}])
```

<div class="note">
  <p><strong>重新运行提醒</strong></p>
  <p>每次改完 <code>s01_llm_basics/code.py</code>，都要先停止当前程序，再重新运行：</p>
  <pre><code>python3 s01_llm_basics/code.py</code></pre>
  <p>否则终端里跑的还是旧版本代码，看不到你刚才的修改。</p>
</div>

重新运行后，再输入同样两句话：

1. `我叫小王，我在学 Agent 产品架构。请用三句话鼓励我。`
2. `我叫什么名字？`

这次第二轮发给模型的内容只剩下：

```python
[
    {"role": "user", "content": "我叫什么名字？"},
]
```

模型看不到第一轮“我叫小王”，所以通常无法稳定答出你的名字。到后面 Agent Loop 里，如果不把 `tool_result` 追加回 `messages[]`，模型也同样不知道工具执行结果。

## 本章小结

这一章只需要记住一个核心判断：模型本身没有跨请求记忆，`messages[]` 才是当前对话历史的载体。

每一轮对话里，客户端先把用户输入追加进 `messages[]`，再把完整 `messages[]` 发给模型；模型回答后，客户端再把这次回答也追加回 `messages[]`。下一轮模型能看到什么，完全取决于客户端这一轮发了什么。

所以后面学习 Agent Loop 时，要把 `tool_result` 当成同一件事理解：Tool 执行结果也必须回到 `messages[]`，模型下一轮才知道外部世界发生了什么。

## 给产品经理的判断标准

先用一个具体例子判断：如果你要做“跨会话记住用户偏好”的功能，不能只写一句“模型记住用户”，而要设计记忆存储、加载时机、用户可删除和成本控制。

- 产品是否清楚区分“当前对话历史”和“长期记忆”。
- 是否知道每轮把历史发给模型会增加 token 成本。
- 是否有 Context 过长时的处理策略。
- `system prompt` 是否被当作产品规则，而不是随手写的提示词。
- 流式输出是否用于降低感知等待，而不是改变模型能力。

## 常见问题

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
python3 s01_llm_basics/code.py
```

**错误：模型请求超时或认证失败**

原因：API Key、`ANTHROPIC_BASE_URL`、`MODEL_ID` 三者可能不匹配。  
修复：如果你用 Kimi、DeepSeek、智谱等 Anthropic-compatible provider，按 `.env.example` 中同一家 provider 的示例同时配置 `ANTHROPIC_BASE_URL` 和 `MODEL_ID`。

## 代码证据与工程读者附录

这一节的代码没有 Tool，也没有 Agent。它只是普通聊天循环。下面按 `s01_llm_basics/code.py` 的源码顺序逐行解释；空行只负责分隔段落。

| 行 | 代码 | 解释 |
|----|------|------|
| 1 | `#!/usr/bin/env python3` | 告诉系统用 Python 3 运行这个文件。新手可以先不管它。 |
| 2 | `"""s01: minimal stateless LLM chat loop."""` | 文件说明：这是一个最小的、无状态模型聊天循环。 |
| 4 | `import os` | 引入 `os`，后面用它读取环境变量。 |
| 6 | `from anthropic import Anthropic` | 引入 Anthropic SDK，用来调用模型服务。 |
| 7 | `from dotenv import load_dotenv` | 引入 `.env` 读取工具，让程序能读取项目里的配置。 |
| 10 | `load_dotenv(override=True)` | 读取 `.env`，把里面的 API Key、模型名等配置放进环境变量。 |
| 12 | `if os.getenv("ANTHROPIC_BASE_URL"):` | 如果 `.env` 里配置了兼容接口地址，就进入下面的处理。 |
| 13 | `os.environ.pop("ANTHROPIC_AUTH_TOKEN", None)` | 清理可能冲突的旧认证变量，避免兼容接口调用出错。 |
| 15 | `client = Anthropic(base_url=os.getenv("ANTHROPIC_BASE_URL"))` | 创建模型客户端；如果有 `ANTHROPIC_BASE_URL`，就用兼容接口。 |
| 16 | `MODEL = os.getenv("MODEL_ID")` | 从 `.env` 读取模型名。 |
| 17 | `SYSTEM = "你是一个简洁、耐心的 AI 基础课助教。"` | 设置 system prompt，也就是开发者给模型设定的人设和规则。 |
| 20 | `def require_setup() -> None:` | 定义一个检查配置的函数。 |
| 21 | `missing = []` | 准备一个列表，用来记录缺了哪些配置。 |
| 22 | `api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()` | 读取 API Key，并去掉前后的空格。 |
| 23 | `if not api_key or api_key.endswith("xxx") or api_key.startswith("your_"):` | 如果 API Key 没填，或者看起来还是占位符，就认为配置不完整。 |
| 24 | `missing.append("ANTHROPIC_API_KEY")` | 把缺失项记录为 `ANTHROPIC_API_KEY`。 |
| 25 | `if not MODEL:` | 如果模型名没填，也是不完整。 |
| 26 | `missing.append("MODEL_ID")` | 把缺失项记录为 `MODEL_ID`。 |
| 27 | `if missing:` | 如果确实有缺失项，就进入报错提示。 |
| 28 | `names = ", ".join(missing)` | 把缺失项拼成一段文字，方便展示给用户。 |
| 29 | `raise SystemExit(` | 直接停止程序，并输出下面的提示。 |
| 30 | `f"请先在项目根目录的 .env 里配置 {names}，然后重新运行本课。"` | 告诉用户需要先补哪些 `.env` 配置。 |
| 31 | `)` | 结束上面的停止提示。 |
| 34 | `def call_model(messages: list[dict]) -> str:` | 定义“调用模型”的函数，输入是一份 `messages[]`，输出是一段文本。 |
| 35 | `chunks = []` | 准备一个列表，用来收集模型一小段一小段返回的文本。 |
| 36 | `with client.messages.stream(` | 开始一次流式模型请求。流式的意思是：模型生成一点，程序就收到一点。 |
| 37 | `model=MODEL,` | 告诉模型服务这次要用哪个模型。 |
| 38 | `system=SYSTEM,` | 把 system prompt 发给模型。 |
| 39 | `messages=messages,` | 把当前聊天历史发给模型。 |
| 40 | `max_tokens=1200,` | 限制模型这次最多生成多少内容。 |
| 41 | `) as stream:` | 把这次流式请求命名为 `stream`，下面开始读取流式结果。 |
| 42 | `for text in stream.text_stream:` | 模型每生成一小段文本，就进入循环处理这一小段。 |
| 43 | `print(text, end="", flush=True)` | 立刻把这一小段显示出来，不等完整回答结束。 |
| 44 | `chunks.append(text)` | 同时把这一小段保存起来，方便最后拼成完整回答。 |
| 45 | `return "".join(chunks)` | 把所有小段拼起来，作为完整回答返回。 |
| 48 | `if __name__ == "__main__":` | 只有直接运行这个文件时，下面的代码才会执行。 |
| 49 | `require_setup()` | 先检查 `.env` 配置是否完整。 |
| 50 | `print("s01: LLM basics")` | 打印课程名。 |
| 51 | `print("输入 /exit 退出。试试先说“我叫小王”，再问“我叫什么名字？”。\n")` | 提示用户怎么退出，以及可以试什么例子。 |
| 53 | `messages: list[dict] = []` | 创建一份空的聊天记录表。 |
| 54 | `while True:` | 开始持续循环：只要没有 `break`，就一直等待下一次输入。 |
| 55 | `user_input = input("你: ").strip()` | 等用户输入一句话，并去掉前后的空格。 |
| 56 | `if user_input == "/exit":` | 如果用户输入 `/exit`，说明要退出。 |
| 57 | `print("再见！")` | 打印退出提示。 |
| 58 | `break` | 跳出 `while True` 循环，程序结束。 |
| 59 | `if not user_input:` | 如果用户什么都没输入，进入下一行。 |
| 60 | `continue` | 跳过本轮，继续等待下一次输入。 |
| 62 | `messages.append({"role": "user", "content": user_input})` | 把用户这次说的话追加进 `messages[]`。 |
| 63 | `print("模型: ", end="", flush=True)` | 先显示 `模型:`，并让后面的流式文本接着出现。 |
| 64 | `answer = call_model(messages)` | 把完整聊天记录发给模型，边显示流式文本，边拿回完整回答。 |
| 65 | `print("\n")` | 回答结束后补一个空行，让下一轮输入更清楚。 |
| 66 | `messages.append({"role": "assistant", "content": answer})` | 把模型这次回答也追加进 `messages[]`，下一轮模型就能看到它。 |

Agent Loop 会在下一章出现。它和普通聊天循环的区别只有一个关键点：模型不只是返回文本，还能返回 `tool_use`，Harness 执行后再把 `tool_result` 放回 `messages[]`。

## 下一章

s02 Agent Loop 会在这个普通聊天循环上加 Tool。模型开始不只是说话，而是能请求外部动作。
