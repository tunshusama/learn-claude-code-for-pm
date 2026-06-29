"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, OctagonAlert, PlayCircle, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "三个请求，三条路由",
    desc: "Permission 像一个路由器：安全调用直接执行，风险调用先询问，禁止调用直接停止。",
    mode: "overview",
  },
  {
    title: "allow：安全读取立即执行",
    desc: "只读文件请求通过权限策略，不需要用户确认就能进入处理函数。",
    mode: "allow",
  },
  {
    title: "ask：有风险的本地删除变成确认单",
    desc: "本地删除命令不一定被禁止，但必须暂停，等待用户明确确认。",
    mode: "ask",
  },
  {
    title: "ask 已批准：确认后才执行",
    desc: "同一个风险请求，只有在用户批准这次具体操作后才会执行。",
    mode: "ask-approved",
  },
  {
    title: "deny：禁止模式提前拦截",
    desc: "根目录级别的 sudo 删除会在任何处理函数触碰机器前被拦截。",
    mode: "deny",
  },
  {
    title: "一个权限检查台，三种结果",
    desc: "Harness 把 allow、ask、deny 的决策放在模型之外，再把结果返回给循环。",
    mode: "summary",
  },
] as const;

const REQUESTS = [
  {
    id: "allow",
    tool: "read_file",
    command: "README.md",
    result: "allow",
    detail: "只读工作区文件",
    tone: "emerald",
  },
  {
    id: "ask",
    tool: "bash",
    command: "rm -rf ./tmp/build-cache",
    result: "ask",
    detail: "本地破坏性命令",
    tone: "amber",
  },
  {
    id: "deny",
    tool: "bash",
    command: "sudo rm -rf /",
    result: "deny",
    detail: "禁止的根目录删除",
    tone: "red",
  },
] as const;

const STATUS_LABELS: Record<"waiting" | "pass" | "allow" | "ask" | "approved" | "deny" | "skip", string> = {
  waiting: "等待",
  pass: "通过",
  allow: "allow",
  ask: "ask",
  approved: "已批准",
  deny: "deny",
  skip: "跳过",
};

function toneClass(tone: "emerald" | "amber" | "red" | "blue" | "zinc") {
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200";
  return "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";
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
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      )}
    >
      <div className="mb-4 flex items-center gap-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            active
              ? "bg-red-500 text-white"
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

type StepMode = (typeof STEPS)[number]["mode"];
type RequestId = (typeof REQUESTS)[number]["id"];

function activeRequestId(mode: StepMode): RequestId | null {
  if (mode === "allow") return "allow";
  if (mode === "ask" || mode === "ask-approved") return "ask";
  if (mode === "deny") return "deny";
  return null;
}

function RequestCard({
  request,
  active,
  muted,
}: {
  request: (typeof REQUESTS)[number];
  active: boolean;
  muted: boolean;
}) {
  return (
    <motion.div
      layout
      animate={active ? { y: -1 } : { y: 0 }}
      className={cn(
        "min-w-0 rounded-xl border p-4 shadow-sm",
        active ? toneClass(request.tone) : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        muted && "opacity-45"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm font-semibold">工具请求</div>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 font-mono text-xs font-semibold dark:bg-zinc-950/30">
          {request.tool}
        </span>
      </div>
      <code className="block min-w-0 rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100 whitespace-pre-wrap break-words">
        {request.command}
      </code>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 text-pretty opacity-80">{request.detail}</span>
        <span className="shrink-0 rounded bg-white/75 px-2 py-1 font-semibold dark:bg-zinc-950/30">
          {request.result}
        </span>
      </div>
    </motion.div>
  );
}

function CheckRow({
  label,
  detail,
  status,
  active,
}: {
  label: string;
  detail: string;
  status: "waiting" | "pass" | "allow" | "ask" | "approved" | "deny" | "skip";
  active: boolean;
}) {
  const icon =
    status === "deny" ? <OctagonAlert size={16} /> : status === "pass" || status === "allow" ? <CheckCircle2 size={16} /> : status === "ask" ? <ShieldAlert size={16} /> : status === "approved" ? <UserCheck size={16} /> : <ClipboardCheck size={16} />;
  const tone = status === "deny" ? "red" : status === "pass" || status === "allow" || status === "approved" ? "emerald" : status === "ask" ? "amber" : "zinc";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border p-3",
        active ? toneClass(tone) : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {label}
        </div>
        <span className="shrink-0 rounded bg-white/70 px-2 py-0.5 text-[11px] font-semibold dark:bg-zinc-950/30">
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="text-xs leading-relaxed opacity-80">{detail}</div>
    </motion.div>
  );
}

function PermissionDesk({ mode }: { mode: StepMode }) {
  if (mode === "overview" || mode === "summary") {
    return (
      <div className="grid gap-2">
        <CheckRow label="安全读取" detail="不写文件，不进 shell，不需要用户批准。" status="allow" active={mode === "overview"} />
        <CheckRow label="有风险的本地变更" detail="可能有用，但需要用户明确同意。" status="ask" active={mode === "overview"} />
        <CheckRow label="禁止模式" detail="根目录删除和 sudo 不会进入处理函数。" status="deny" active={mode === "overview"} />
      </div>
    );
  }

  if (mode === "allow") {
    return (
      <div className="space-y-2">
        <CheckRow label="Gate 1：硬性拒绝" detail="没有 sudo、根目录路径或禁止模式。" status="pass" active={false} />
        <CheckRow label="Gate 2：allow 规则" detail="只读工作区文件可以立即执行。" status="allow" active />
        <CheckRow label="Gate 3：用户确认" detail="这次调用已经安全，因此跳过确认。" status="skip" active={false} />
      </div>
    );
  }

  if (mode === "deny") {
    return (
      <div className="space-y-2">
        <CheckRow label="Gate 1：硬性拒绝" detail="sudo 加根目录删除会立即被拦截。" status="deny" active />
        <CheckRow label="Gate 2：风险规则" detail="硬性拒绝已经给出结果，因此跳过。" status="skip" active={false} />
        <CheckRow label="Gate 3：用户确认" detail="禁止动作不能靠用户批准放行。" status="skip" active={false} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <CheckRow label="Gate 1：硬性拒绝" detail="本地项目路径不属于全局禁止范围。" status="pass" active={false} />
      <CheckRow label="Gate 2：风险规则" detail="删除文件需要一张明确的确认单。" status="ask" active={mode === "ask"} />
      <CheckRow label="Gate 3：用户确认" detail="工具会等待这次请求被批准。" status={mode === "ask-approved" ? "approved" : "waiting"} active={mode === "ask-approved"} />
    </div>
  );
}

function CodeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/70 p-2 dark:bg-zinc-950/30">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <code className="block min-w-0 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{value}</code>
    </div>
  );
}

function Outcome({ mode }: { mode: StepMode }) {
  if (mode === "overview") {
    return <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">选择一条请求路由</div>;
  }

  if (mode === "allow") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("space-y-3 rounded-xl border p-4", toneClass("emerald"))}>
        <div className="flex items-center gap-2 text-base font-semibold">
          <PlayCircle size={17} />
          处理函数立即执行
        </div>
        <CodeLine label="处理函数" value="read_file" />
        <CodeLine label="参数" value='path: "README.md"' />
      </motion.div>
    );
  }

  if (mode === "ask") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-4", toneClass("amber"))}>
        <div className="mb-2 flex items-center gap-2 text-base font-semibold">
          <UserCheck size={17} />
          用户确认单
        </div>
        <div className="text-sm leading-relaxed">“允许删除本地构建缓存吗？”</div>
      </motion.div>
    );
  }

  if (mode === "ask-approved") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("space-y-3 rounded-xl border p-4", toneClass("blue"))}>
        <div className="flex items-center gap-2 text-base font-semibold">
          <PlayCircle size={17} />
          批准后执行处理函数
        </div>
        <CodeLine label="处理函数" value="bash" />
        <CodeLine label="参数" value="rm -rf ./tmp/build-cache" />
      </motion.div>
    );
  }

  if (mode === "deny") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-4", toneClass("red"))}>
        <div className="mb-2 flex items-center gap-2 text-base font-semibold">
          <OctagonAlert size={17} />
          进入处理函数前被拦截
        </div>
        <div className="text-sm leading-relaxed">不执行工具，不询问用户，也不触碰文件系统。</div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      {REQUESTS.map((request) => (
        <div key={request.id} className={cn("rounded-lg border p-3", toneClass(request.tone))}>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            {request.result === "deny" ? <OctagonAlert size={15} /> : request.result === "ask" ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
            {request.result}
          </div>
          <div className="text-xs leading-relaxed opacity-80">{request.detail}</div>
        </div>
      ))}
      <div className={cn("rounded-xl border p-4", toneClass("emerald"))}>
        <div className="mb-2 flex items-center gap-2 text-base font-semibold">
        <ShieldCheck size={17} />
          决策返回给循环
        </div>
        <div className="text-sm leading-relaxed">Permission 留在模型之外，但循环仍会收到正常的 tool_result 或被拦截的结果。</div>
      </div>
    </motion.div>
  );
}

export default function PermissionVisualization({ title }: { title?: string }) {
  const vis = useSteppedVisualization({ totalSteps: STEPS.length, autoPlayInterval: 2500 });
  const step = vis.currentStep;
  const current = STEPS[step];
  const mode = current.mode;
  const activeId = activeRequestId(mode);

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "权限检查台"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr_0.95fr]">
          <Surface title="工具请求" icon={<OctagonAlert size={20} />} active={mode === "overview" || activeId !== null}>
            <div className="space-y-2">
              {REQUESTS.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  active={activeId === request.id || (mode === "overview" && step === 0)}
                  muted={activeId !== null && activeId !== request.id}
                />
              ))}
            </div>
          </Surface>

          <Surface title="权限检查台" icon={<ShieldCheck size={20} />} active={mode !== "overview"}>
            <PermissionDesk mode={mode} />
          </Surface>

          <Surface title="结果" icon={<PlayCircle size={20} />} active={mode !== "overview"}>
            <AnimatePresence mode="wait">
              <Outcome key={mode} mode={mode} />
            </AnimatePresence>
          </Surface>
        </div>

        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
          初学者规则：模型只负责提出工具调用；运行时会在执行前把每个请求路由到 allow、ask 或 deny。
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
