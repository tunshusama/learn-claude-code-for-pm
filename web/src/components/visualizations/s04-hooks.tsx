"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, FileSearch, LogOut, PlugZap, RadioTower, ScrollText, Wrench } from "lucide-react";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { cn } from "@/lib/utils";

type HookId = "UserPromptSubmit" | "PreToolUse" | "PostToolUse" | "Stop";

const HOOKS: {
  id: HookId;
  when: string;
  callbacks: string[];
  color: "blue" | "amber" | "emerald" | "zinc";
}[] = [
  {
    id: "UserPromptSubmit",
    when: "输入之后，调用 LLM 之前",
    callbacks: ["context_inject_hook"],
    color: "blue",
  },
  {
    id: "PreToolUse",
    when: "tool_use 之后，handler 之前",
    callbacks: ["permission_hook", "log_hook"],
    color: "amber",
  },
  {
    id: "PostToolUse",
    when: "handler 之后，下一轮之前",
    callbacks: ["large_output_hook"],
    color: "emerald",
  },
  {
    id: "Stop",
    when: "最终输出之前",
    callbacks: ["summary_hook"],
    color: "zinc",
  },
];

const STEPS = [
  {
    title: "Hook 注册在主循环外",
    desc: "主循环只知道事件名；具体回调行为放在注册表里。",
    active: null,
  },
  {
    title: "UserPromptSubmit",
    desc: "输入 Hook 可以在模型看到 prompt 前记录、校验或注入上下文。",
    active: "UserPromptSubmit" as HookId,
  },
  {
    title: "核心循环仍然负责选择 Tool",
    desc: "调用模型、接收 tool_use 的结构和以前一样。",
    active: null,
  },
  {
    title: "PreToolUse",
    desc: "权限和日志 Hook 会在 handler 触碰工作区之前运行。",
    active: "PreToolUse" as HookId,
  },
  {
    title: "PostToolUse",
    desc: "结果 Hook 会在执行后检查输出或触发副作用。",
    active: "PostToolUse" as HookId,
  },
  {
    title: "Stop",
    desc: "当模型不再请求 Tool 时，收尾和摘要 Hook 会运行。",
    active: "Stop" as HookId,
  },
] as const;

function toneClass(tone: "blue" | "amber" | "emerald" | "zinc", active = true) {
  if (!active) return "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
}

function Surface({
  title,
  icon,
  active,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border p-4 transition-colors",
        active
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      )}
    >
      <div className="mb-4 flex items-center gap-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            active
              ? "bg-emerald-500 text-white"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
          )}
        >
          {icon}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function HookCard({
  hook,
  active,
}: {
  hook: (typeof HOOKS)[number];
  active: boolean;
}) {
  return (
    <motion.div
      layout
      animate={active ? { y: [0, -2, 0] } : { y: 0 }}
      transition={{ duration: 0.8, repeat: active ? Infinity : 0 }}
      className={cn("rounded-lg border p-3", toneClass(hook.color, active))}
    >
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 truncate font-mono text-sm font-semibold">{hook.id}</div>
        {active && <PlugZap size={16} className="shrink-0" />}
      </div>
      <div className="mb-3 text-xs leading-relaxed opacity-80">{hook.when}</div>
      <div className="flex flex-wrap gap-1.5">
        {hook.callbacks.map((callback) => (
          <span key={callback} className="rounded bg-white/70 px-2 py-1 font-mono text-[11px] dark:bg-zinc-950/30">
            {callback}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function TurnCard({ step }: { step: number }) {
  const state =
    step <= 1
      ? { title: "用户输入", body: "读取 README.md 并总结。", icon: <ScrollText size={18} /> }
      : step === 2
        ? { title: "LLM 选择 Tool", body: "tool_use: read_file({ path: 'README.md' })", icon: <Wrench size={18} /> }
        : step === 3
          ? { title: "Tool 在前置 Hook 等待", body: "permission_hook + log_hook 检查这次调用。", icon: <FileSearch size={18} /> }
          : step === 4
            ? { title: "Handler 返回输出", body: "large_output_hook 检查结果大小。", icon: <ClipboardList size={18} /> }
            : { title: "不再有 tool_use", body: "summary_hook 记录本轮会话统计。", icon: <LogOut size={18} /> };

  return (
    <motion.div
      key={state.title}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {state.icon}
        {state.title}
      </div>
      <div className="rounded-lg bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        {state.body}
      </div>
    </motion.div>
  );
}

function AuditLog({ step }: { step: number }) {
  const items = [
    "[registry] 已注册 4 个 Hook 槽位",
    "[UserPromptSubmit] 已记录工作目录",
    "[loop] 模型返回 read_file tool_use",
    "[PreToolUse] 权限通过；Tool 调用已记录",
    "[PostToolUse] 已检查输出大小",
    "[Stop] 本轮会话使用 1 次 Tool",
  ].slice(0, step + 1);

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item}
            layout
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {item}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function HooksVisualization({ title }: { title?: string }) {
  const vis = useSteppedVisualization({ totalSteps: STEPS.length, autoPlayInterval: 2500 });
  const step = vis.currentStep;
  const current = STEPS[step];
  const activeHook = current.active;

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "Hook 工作台"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          主循环保持最小职责：它只调用 <span className="font-mono">trigger_hooks(event)</span>，由注册表决定额外运行哪些逻辑。
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <Surface title="Hook 注册表" icon={<RadioTower size={20} />} active={step === 0 || activeHook !== null}>
            <div className="grid gap-2 sm:grid-cols-2">
              {HOOKS.map((hook) => (
                <HookCard key={hook.id} hook={hook} active={activeHook === hook.id} />
              ))}
            </div>
          </Surface>

          <Surface title="本轮执行" icon={<ScrollText size={20} />} active={step >= 1}>
            <div className="space-y-3">
              <TurnCard step={step} />
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
                <div className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">审计日志</div>
                <AuditLog step={step} />
              </div>
            </div>
          </Surface>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          新手规则：新增行为应该注册 callback，而不是修改核心的“模型 - Tool - 结果”循环。
        </div>

        <StepControls
          className="mt-4"
          currentStep={vis.currentStep}
          totalSteps={vis.totalSteps}
          onPrev={vis.prev}
          onNext={vis.next}
          onReset={vis.reset}
          isPlaying={vis.isPlaying}
          onToggleAutoPlay={vis.toggleAutoPlay}
          stepTitle={current.title}
          stepDescription={current.desc}
        />
      </div>
    </section>
  );
}
