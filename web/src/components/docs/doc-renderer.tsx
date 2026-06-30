"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/constants";
import docsData from "@/data/generated/docs.json";
import { DocCodeWalkthrough } from "@/components/docs/components";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

interface DocRendererProps {
  version: string;
}

interface CodeWalkthroughBlock {
  id: string;
  introHtml?: string;
  title: string;
  codeHtml: string;
  tableHtml: string;
}

type DocPart =
  | { type: "html"; html: string }
  | { type: "code-walkthrough"; block: CodeWalkthroughBlock };

const GLOSSARY: Record<string, { term: string; definition: string; example: string }> = {
  LLM: {
    term: "LLM",
    definition: "Large Language Model，大语言模型。它根据本次传入的上下文生成文本，本身不会自动保留上一轮对话。",
    example: "Claude、ChatGPT、Kimi 都是 LLM 产品或服务中的模型能力。",
  },
  "API 调用": {
    term: "API 调用",
    definition: "程序向模型服务发送请求，并等待模型返回结果的一次交互。",
    example: "把 system prompt 和 messages[] 发给模型服务，拿回一段回答。",
  },
  无状态: {
    term: "无状态",
    definition: "模型每次调用只看本次请求里传入的信息，不会自己记住上一轮发生了什么。",
    example: "如果程序不把上一轮消息放回 messages[]，模型下一轮就看不到那段历史。",
  },
  "system prompt": {
    term: "system prompt",
    definition: "普通用户消息之前的基础指令，用来定义模型角色、边界和行为规则。",
    example: "告诉模型“你是一个简洁、耐心的 AI 基础课助教”。",
  },
  流式输出: {
    term: "流式输出",
    definition: "模型生成一点，程序就显示一点，用户不用等完整回答结束才看到内容。",
    example: "终端里 `模型:` 后面的文字一段段出现，就是流式输出。",
  },
  客户端: {
    term: "客户端",
    definition: "调用模型服务的程序端，负责保存消息历史、发送请求、接收结果和显示输出。",
    example: "本课程里的 `code.py` 就是一个最小客户端。",
  },
  "Agent Loop": {
    term: "Agent Loop",
    definition: "Agent 的核心循环：模型先判断要不要调用工具，工具执行后把结果放回上下文，再让模型继续判断。",
    example: "用户提出目标，模型请求读文件，Harness 读完后把结果交回模型，模型再决定下一步。",
  },
  "while True": {
    term: "while True",
    definition: "Python 里的持续循环写法。可以先理解成：只要没有明确退出，就一直重复执行下面的步骤。",
    example: "聊天程序会一直等待输入；Agent Loop 会一直执行“模型判断 → 工具执行 → 结果回传”。",
  },
  Harness: {
    term: "Harness",
    definition: "包在模型外面的运行环境，给模型工具、上下文、权限、记忆和任务系统。",
    example: "Claude 是驾驶者，Harness 是车、路、仪表盘和安全边界。",
  },
  Bash: {
    term: "Bash",
    definition: "一种命令行 Shell。你可以把它理解成让电脑执行文字命令的入口。",
    example: "`ls` 查看文件，`python code.py` 运行 Python 脚本。",
  },
  bash: {
    term: "bash",
    definition: "这里指 Agent 可以调用的命令行 Tool，用来执行终端命令。",
    example: "例如列目录、运行测试、执行脚本。真实产品里需要权限控制。",
  },
  Tool: {
    term: "Tool",
    definition: "模型可以请求 Harness 执行的一种外部能力。",
    example: "读文件、写文件、搜索、运行命令、调用 API 都可以是 Tool。",
  },
  Context: {
    term: "Context",
    definition: "模型当前能看到的信息总和，包括对话历史、工具结果、文档和系统指令。",
    example: "Context 太满时，Agent 会忘掉细节或需要压缩历史。",
  },
  dispatch: {
    term: "dispatch",
    definition: "分发。根据 Tool 名称找到对应处理函数并执行。",
    example: "模型说要用 `read_file`，dispatch 就把请求交给读文件函数。",
  },
  "dispatch map": {
    term: "dispatch map",
    definition: "Tool 名称到处理函数的映射表。",
    example: "`read_file -> run_read`，`write_file -> run_write`。",
  },
  "Tool schema": {
    term: "Tool schema",
    definition: "发给模型的工具说明书，说明 Tool 叫什么、能做什么、需要哪些参数。",
    example: "read_file 的 schema 会说明需要 path 参数，可选 limit 参数。",
  },
  "Tool handler": {
    term: "Tool handler",
    definition: "Harness 里真正执行 Tool 的函数。",
    example: "run_read() 就是 read_file 这个 Tool 的 handler。",
  },
  "TOOL_HANDLERS": {
    term: "TOOL_HANDLERS",
    definition: "Tool 名称到 handler 函数的映射表，也叫 dispatch map。",
    example: "{\"read_file\": run_read, \"bash\": run_bash}",
  },
  "input_schema": {
    term: "input_schema",
    definition: "Tool schema 的一部分，描述 Tool 需要哪些参数、参数类型、是否必填。",
    example: "read_file 的 input_schema 要求必须有 path，limit 是可选整数。",
  },
  "stop_reason": {
    term: "stop_reason",
    definition: "模型停止生成的原因。教学版用它判断是继续循环还是返回结果。",
    example: "stop_reason == \"tool_use\" 表示模型请求调用 Tool，要继续循环。",
  },
  "并发安全": {
    term: "并发安全",
    definition: "多个 Tool 同时执行时不会互相干扰或产生错误结果。",
    example: "同时写同一个文件需要加锁，否则可能丢失内容。",
  },
  "tool_use": {
    term: "tool_use",
    definition: "模型发出的结构化请求，表示“我要调用某个 Tool”。",
    example: "模型不是直接改文件，而是先生成一个 `tool_use` 请求。",
  },
  "tool_result": {
    term: "tool_result",
    definition: "Harness 执行 Tool 后返回给模型的结果。",
    example: "读文件的内容、命令输出、错误信息都可以作为 `tool_result` 回到模型。",
  },
  "messages[]": {
    term: "messages[]",
    definition: "传给模型的消息数组，也就是它下一轮判断能看到的历史。",
    example: "用户目标、模型回答、Tool 请求和 Tool 结果都会进入 `messages[]`。",
  },
  "System Prompt": {
    term: "System Prompt",
    definition: "放在普通对话之前的基础指令，用来定义 Agent 的身份、规则和可用能力。",
    example: "告诉 Agent 它是 coding agent、有哪些 Tool、有哪些限制。",
  },
  MCP: {
    term: "MCP",
    definition: "Model Context Protocol，用标准方式把外部服务接成 Agent 可发现、可调用的 Tool。",
    example: "文档搜索、部署系统、数据库查询都可以通过 MCP 暴露给 Agent。",
  },
  Subagent: {
    term: "Subagent",
    definition: "为某个子任务启动的独立 Agent，拥有更干净的上下文。",
    example: "主 Agent 负责总控，Subagent 去单独调研一个文件夹或问题。",
  },
  "vibe coding": {
    term: "vibe coding",
    definition: "用自然语言驱动 AI 写代码、边看结果边调整的工作方式。",
    example: "你不逐行写代码，但能描述目标、检查结果、让 Agent 修改。",
  },
};

const SORTED_GLOSSARY_TERMS = Object.keys(GLOSSARY).sort(
  (a, b) => b.length - a.length
);

function renderMarkdown(md: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight, { detect: false, ignoreMissing: true })
    .use(rehypeStringify)
    .processSync(md);
  return String(result);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeHtmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function getGlossaryTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>("[data-glossary]");
}

function getCopyButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLButtonElement>("[data-copy-button]");
}

function isShellLanguage(language: string): boolean {
  return ["sh", "bash", "zsh", "shell", "terminal", "console"].includes(
    language.toLowerCase()
  );
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function isCopyableShellSnippet(codeHtml: string): boolean {
  const lines = decodeHtmlText(stripHtmlTags(codeHtml))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  return lines.some((line) =>
    /^(\[|(?:cd|python3?|source|pip|npm|npx|pnpm|yarn|ls|open|cp|mkdir|touch|chmod|git|cat|pwd|export)(?:\s|$)|[A-Z_][A-Z0-9_]*=)/.test(
      line
    )
  );
}

function buildCopyButton(className: string, label: string, attrs = ""): string {
  return `<button type="button" class="${className}" data-copy-button="true" ${attrs} aria-label="${label}" title="${label}"><span class="copy-button-icon" aria-hidden="true"></span></button>`;
}

function addCodeCopyButtons(html: string): string {
  return html.replace(
    /<pre class="code-block" data-language="([^"]+)"><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (match, language: string, codeAttrs: string, codeHtml: string) => {
      if (!isShellLanguage(language) || !isCopyableShellSnippet(codeHtml)) {
        return match;
      }
      return `<pre class="code-block" data-language="${language}">${buildCopyButton(
        "copy-code-button",
        "复制命令",
        'data-copy-kind="shell"'
      )}<code${codeAttrs}>${codeHtml}</code></pre>`;
    }
  );
}

function addPromptCopyButtons(html: string): string {
  return html.replace(
    /(<p>[^<]*(?:练习 prompt|试试这个 prompt)[\s\S]*?<\/p>\s*<ol>)([\s\S]*?)(<\/ol>)/g,
    (_match, before: string, list: string, after: string) => {
      const nextList = list.replace(
        /(<li>\s*<code>)([\s\S]*?)(<\/code>)/g,
        (itemMatch, itemStart: string, codeHtml: string, itemEnd: string) => {
          if (itemMatch.includes("data-copy-button")) return itemMatch;
          const copyText = escapeHtmlAttribute(decodeHtmlText(codeHtml));
          return `${itemStart}${codeHtml}${itemEnd}${buildCopyButton(
            "copy-prompt-button",
            "复制 prompt",
            `data-copy-text="${copyText}"`
          )}`;
        }
      );
      return `${before}${nextList}${after}`;
    }
  );
}

function wrapGlossaryTerms(html: string): string {
  const tokenRegex =
    /(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<a[\s\S]*?<\/a>|<[^>]+>)/g;
  const termCounts: Record<string, number> = {};
  const MAX_WRAPS_PER_PAGE = 2;

  return html
    .split(tokenRegex)
    .map((part) => {
      if (!part || part.startsWith("<")) return part;

      let next = part;
      for (const term of SORTED_GLOSSARY_TERMS) {
        const data = GLOSSARY[term];
        const pattern = new RegExp(
          `(?<![\\w-])${escapeRegExp(term)}(?![\\w-])`,
          "g"
        );
        next = next.replace(
          pattern,
          (match) => {
            const count = termCounts[term] ?? 0;
            if (count >= MAX_WRAPS_PER_PAGE) return match;
            termCounts[term] = count + 1;
            return `<span class="glossary-term" data-glossary="${escapeHtmlAttribute(term)}" tabindex="0">${data.term}</span>`;
          }
        );
      }
      return next;
    })
    .join("");
}

function collapseEngineeringAppendix(html: string): string {
  const appendixTitles = ["代码证据与工程读者附录"];
  const titlePattern = appendixTitles.map(escapeRegExp).join("|");
  const headingPattern = new RegExp(`<h2>(${titlePattern})<\\/h2>`);
  const match = html.match(headingPattern);

  if (!match || match.index === undefined) return html;

  const start = match.index;
  const bodyStart = start + match[0].length;
  const rest = html.slice(bodyStart);
  const nextHeading = rest.search(/<h2>/);
  const end = nextHeading === -1 ? html.length : bodyStart + nextHeading;
  const title = match[1];
  const body = html.slice(bodyStart, end);

  return [
    html.slice(0, start),
    `<details class="engineering-appendix"><summary><span>${title}</span><span class="engineering-appendix-hint">默认收起，点击展开</span></summary><div class="engineering-appendix-body">`,
    body,
    "</div></details>",
    html.slice(end),
  ].join("");
}

function extractCodeWalkthroughs(html: string): {
  html: string;
  walkthroughs: CodeWalkthroughBlock[];
} {
  const walkthroughs: CodeWalkthroughBlock[] = [];

  const stripTags = (value: string) => value.replace(/<[^>]+>/g, "");

  const countCodeLines = (codeBlock: string) => {
    const codeMatch = codeBlock.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    const rawCode = stripTags(codeMatch ? codeMatch[1] : codeBlock)
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    return rawCode.replace(/\s+$/, "").split(/\r?\n/).length;
  };

  const codeTitle = (codeBlock: string) => {
    const language = codeBlock.match(/data-language="([^"]+)"/)?.[1];
    if (!language) return "代码片段";
    if (language === "python") return "Python 代码";
    if (language === "text") return "代码片段";
    return `${language} 代码`;
  };

  const nextHtml = html.replace(
    /((?:<p>(?!逐行读：)[\s\S]*?<\/p>\s*)?)(<pre class="code-block"[\s\S]*?<\/pre>)\s*<p>逐行读：<\/p>\s*(<div class="table-scroll"><table>[\s\S]*?<\/table><\/div>)/g,
    (match, introHtml: string, codeBlock: string, tableBlock: string) => {
      if (countCodeLines(codeBlock) <= 10) return match;

      const id = `code-walkthrough-${walkthroughs.length}`;
      walkthroughs.push({
        id,
        introHtml: introHtml.trim() || undefined,
        title: codeTitle(codeBlock),
        codeHtml: codeBlock,
        tableHtml: tableBlock,
      });
      return `<div data-doc-component="code-walkthrough" data-id="${id}"></div>`;
    }
  );
  return { html: nextHtml, walkthroughs };
}

function splitDocParts(html: string, walkthroughs: CodeWalkthroughBlock[]): DocPart[] {
  const blocksById = new Map(walkthroughs.map((block) => [block.id, block]));
  const parts: DocPart[] = [];
  const markerPattern =
    /<div data-doc-component="code-walkthrough" data-id="([^"]+)"><\/div>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index);
    if (before) parts.push({ type: "html", html: before });

    const block = blocksById.get(match[1]);
    if (block) parts.push({ type: "code-walkthrough", block });
    lastIndex = markerPattern.lastIndex;
  }

  const after = html.slice(lastIndex);
  if (after) parts.push({ type: "html", html: after });
  return parts;
}

function postProcessHtml(
  html: string,
  locale: string
): { html: string; walkthroughs: CodeWalkthroughBlock[] } {
  // Add language labels to highlighted code blocks
  html = html.replace(
    /<pre><code class="hljs language-([\w-]+)">/g,
    '<pre class="code-block" data-language="$1"><code class="hljs language-$1">'
  );

  html = addCodeCopyButtons(html);
  html = addPromptCopyButtons(html);

  // Wrap plain pre>code (ASCII art / diagrams) in diagram container
  html = html.replace(
    /<pre><code(?! class="hljs)([^>]*)>/g,
    '<pre class="ascii-diagram"><code$1>'
  );

  // Keep wide Markdown tables inside the prose column on small screens.
  html = html.replace(/<table>/g, '<div class="table-scroll"><table>');
  html = html.replace(/<\/table>/g, '</table></div>');

  const walkthroughResult = extractCodeWalkthroughs(html);
  html = walkthroughResult.html;
  const walkthroughs = walkthroughResult.walkthroughs;

  // Mark the first blockquote as hero callout
  html = html.replace(
    /<blockquote>/,
    '<blockquote class="hero-callout">'
  );

  // Remove the h1 (it's redundant with the page header)
  html = html.replace(/<h1>.*?<\/h1>\n?/, "");

  // Fix ordered list counter for interrupted lists (ol start="N")
  html = html.replace(
    /<ol start="(\d+)">/g,
    (_, start) => `<ol style="counter-reset:step-counter ${parseInt(start) - 1}">`
  );

  html = collapseEngineeringAppendix(html);

  if (locale === DEFAULT_LOCALE) {
    html = wrapGlossaryTerms(html);
    for (const block of walkthroughs) {
      if (block.introHtml) block.introHtml = wrapGlossaryTerms(block.introHtml);
      block.tableHtml = wrapGlossaryTerms(block.tableHtml);
    }
  }

  return { html, walkthroughs };
}

export function DocRenderer({ version }: DocRendererProps) {
  const locale = useLocale();
  const [hoveredTerm, setHoveredTerm] = useState<{
    term: string;
    x: number;
    y: number;
  } | null>(null);

  const doc = useMemo(() => {
    const match = docsData.find(
      (d: { version: string; locale: string }) =>
        d.version === version && d.locale === locale
    );
    if (match) return match;
    if (locale === DEFAULT_LOCALE) return null;
    return docsData.find(
      (d: { version: string; locale: string }) =>
        d.version === version && d.locale === "en"
    );
  }, [version, locale]);

  const processedDoc = useMemo(() => {
    if (!doc) return { html: "", walkthroughs: [] };
    const raw = renderMarkdown(doc.content);
    return postProcessHtml(raw, locale);
  }, [doc, locale]);

  const docParts = useMemo(
    () => splitDocParts(processedDoc.html, processedDoc.walkthroughs),
    [processedDoc]
  );

  if (!doc) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        这一课缺少中文正文，请先补齐对应章节的 README.md。
      </div>
    );
  }

  const showGlossaryTerm = (term: string, x: number, y: number) => {
    if (!GLOSSARY[term]) return;
    setHoveredTerm({ term, x, y });
  };

  const getTooltipPosition = (clientX: number, clientY: number) => {
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const margin = 16;
    return {
      x: Math.max(
        margin,
        Math.min(clientX + 14, window.innerWidth - tooltipWidth - margin)
      ),
      y: Math.max(
        margin,
        Math.min(clientY + 18, window.innerHeight - tooltipHeight - margin)
      ),
    };
  };

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const getCopyText = (button: HTMLButtonElement): string => {
    if (button.dataset.copyText) return button.dataset.copyText;

    const code = button.closest("pre")?.querySelector("code");
    const rawText = code?.textContent ?? "";
    if (button.dataset.copyKind !== "shell") return rawText.trimEnd();

    return rawText
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n")
      .trim();
  };

  const markCopied = (button: HTMLButtonElement) => {
    button.dataset.copied = "true";
    window.setTimeout(() => {
      delete button.dataset.copied;
    }, 1400);
  };

  return (
    <div
      className="py-4"
      onClick={(event) => {
        const button = getCopyButton(event.target);
        if (!button) return;
        event.preventDefault();
        void copyToClipboard(getCopyText(button)).then(() => {
          markCopied(button);
        });
      }}
      onMouseOver={(event) => {
        const term = getGlossaryTarget(event.target)?.dataset.glossary;
        if (!term) return;
        const { x, y } = getTooltipPosition(event.clientX, event.clientY);
        showGlossaryTerm(term, x, y);
      }}
      onMouseMove={(event) => {
        const term = getGlossaryTarget(event.target)?.dataset.glossary;
        if (!term || !GLOSSARY[term]) {
          if (hoveredTerm) setHoveredTerm(null);
          return;
        }
        const { x, y } = getTooltipPosition(event.clientX, event.clientY);
        setHoveredTerm({ term, x, y });
      }}
      onMouseOut={(event) => {
        const targetTerm = getGlossaryTarget(event.target);
        if (!targetTerm) return;
        if (
          event.relatedTarget instanceof Node &&
          targetTerm.contains(event.relatedTarget)
        ) {
          return;
        }
        setHoveredTerm(null);
      }}
      onMouseLeave={() => {
        setHoveredTerm(null);
      }}
      onPointerLeave={() => {
        setHoveredTerm(null);
      }}
      onFocus={(event) => {
        const glossaryTarget = getGlossaryTarget(event.target);
        const term = glossaryTarget?.dataset.glossary;
        if (!term || !glossaryTarget) return;
        const rect = glossaryTarget.getBoundingClientRect();
        const { x, y } = getTooltipPosition(rect.left, rect.bottom);
        showGlossaryTerm(term, x, y);
      }}
      onBlur={() => {
        setHoveredTerm(null);
      }}
    >
      <div
        className="prose-custom"
      >
        {docParts.map((part, index) => {
          if (part.type === "code-walkthrough") {
            return (
              <DocCodeWalkthrough
                key={part.block.id}
                introHtml={part.block.introHtml}
                title={part.block.title}
                codeHtml={part.block.codeHtml}
                tableHtml={part.block.tableHtml}
              />
            );
          }

          return (
            <div
              key={`html-${index}`}
              dangerouslySetInnerHTML={{ __html: part.html }}
            />
          );
        })}
      </div>
      {locale === DEFAULT_LOCALE && hoveredTerm && GLOSSARY[hoveredTerm.term] && (
        <div
          className="glossary-tooltip"
          style={{ left: hoveredTerm.x, top: hoveredTerm.y }}
          role="tooltip"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            术语解释
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {GLOSSARY[hoveredTerm.term].term}
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {GLOSSARY[hoveredTerm.term].definition}
          </p>
          <div className="mt-2 rounded-md bg-zinc-50 p-2 text-xs leading-5 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            {GLOSSARY[hoveredTerm.term].example}
          </div>
        </div>
      )}
    </div>
  );
}
