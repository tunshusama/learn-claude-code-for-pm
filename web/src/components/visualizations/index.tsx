"use client";

import { lazy, Suspense } from "react";
import { useTranslations } from "@/lib/i18n";

const visualizations: Record<
  string,
  React.LazyExoticComponent<React.ComponentType<{ title?: string }>>
> = {
  s02: lazy(() => import("./s01-agent-loop")),
  s03: lazy(() => import("./s02-tool-dispatch")),
  s04: lazy(() => import("./s03-permission")),
  s05: lazy(() => import("./s04-hooks")),
  s06: lazy(() => import("./s03-todo-write")),
  s07: lazy(() => import("./s04-subagent")),
  s08: lazy(() => import("./s05-skill-loading")),
  s09: lazy(() => import("./s06-context-compact")),
  s10: lazy(() => import("./s09-memory")),
  s11: lazy(() => import("./s10-system-prompt")),
  s12: lazy(() => import("./s11-error-recovery")),
  s13: lazy(() => import("./s07-task-system")),
  s14: lazy(() => import("./s08-background-tasks")),
  s15: lazy(() => import("./s14-cron-scheduler")),
  s16: lazy(() => import("./s09-agent-teams")),
  s17: lazy(() => import("./s10-team-protocols")),
  s18: lazy(() => import("./s11-autonomous-agents")),
  s19: lazy(() => import("./s12-worktree-task-isolation")),
  s20: lazy(() => import("./s19-mcp-tools")),
  s21: lazy(() => import("./s20-comprehensive")),
};

export function SessionVisualization({ version }: { version: string }) {
  const t = useTranslations("viz");
  const guide = useTranslations("viz_guides");
  const Component = visualizations[version];
  if (!Component) return null;
  return (
    <Suspense
      fallback={
        <div className="min-h-[500px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      }
    >
      <div className="min-h-[500px] space-y-4">
        {version === "s05" && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              Hooks 是 agent 的重要机制，但其存在有些像是 agent 的外包部门，如果你只想了解 agent 的核心流程，那么只需了解 hooks 这个概念即可。作者贴心地为大家整理了省流版：
            </p>
            <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              省流版：Hooks 是 Agent 主流程旁边的外包部门
            </h3>
            <p className="mb-3">
              Agent Loop 是主流程：
            </p>
            <pre className="mb-3 overflow-x-auto rounded-md bg-zinc-50 p-3 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
用户输入 → 调用模型 → 模型请求 Tool → Harness 执行 Tool → 结果回到 messages[] → 模型继续判断
            </pre>
            <p className="mb-3">
              但一个真正可用的 Agent 系统，除了这条主流程，还需要很多“旁路工作”：
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5">
              <li>记录用户输入和运行日志</li>
              <li>在执行 Tool 前做权限检查</li>
              <li>在 Tool 执行后整理输出、截断大结果</li>
              <li>在任务结束时生成总结、保存记录</li>
              <li>根据用户输入注入额外上下文</li>
            </ul>
            <p className="mb-3">
              如果这些逻辑全都写进 Agent Loop，主流程很快就会变得又长又乱。
              所以本章引入了 <strong>Hook</strong>：像是在主流程这条走廊上挂了几个门铃。
            </p>
            <p className="mb-3">
              当主流程走到 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">UserPromptSubmit</code>，就按一下“用户输入处理”的门铃。
              对应的 Hook 可以记录原始输入，也可以注入项目规则、当前状态或额外上下文。
            </p>
            <p className="mb-3">
              当主流程走到 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">PreToolUse</code>，就按一下“工具执行前检查”的门铃。
              对应的 Hook 可以做权限判断，发现危险命令时拦截执行。
            </p>
            <p className="mb-3">
              当主流程走到 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">PostToolUse</code>，就按一下“工具执行后处理”的门铃。
              对应的 Hook 可以记录日志、截断过长输出，或把结果写进审计记录。
            </p>
            <p className="mb-3">
              当主流程走到 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">Stop</code>，就按一下“结束收尾”的门铃。
              对应的 Hook 可以生成本轮总结、保存 transcript，或者提示用户下一步。
            </p>
            <p className="mb-3">
              所以，Hook 的作用不是替代 Agent Loop，而是让 Agent Loop 保持干净。
              主流程只负责“模型判断、工具执行、结果回传”；权限、日志、注入、收尾这些外围工作，则挂在合适的 Hook 点上。
            </p>
            <p className="mb-1">
              一句话理解：
            </p>
            <p className="rounded-md bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <strong>Agent Loop 是主干道，Hooks 是主干道上的服务站。主流程继续往前走，到了特定位置，就叫对应的外包部门出来干活。</strong>
            </p>
          </div>
        )}

        {version === "s06" && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              这一章相对简单，讲的就是遇到相对复杂的任务时，agent 如何给自己写 todo。以下是省流版～
            </p>
            <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              省流版：TodoWrite 是 Agent 的任务清单
            </h3>
            <p className="mb-3">
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">s06 TodoWrite</code> 解决的问题是：<strong>Agent 做复杂任务时，不能全靠脑子记自己做到哪了。</strong>
            </p>
            <p className="mb-3">
              前几章里，Agent 已经能调用工具、读文件、写文件、执行命令，也能用 Permission 和 Hooks 控制风险。但如果用户给的是一个复杂任务，比如：
            </p>
            <pre className="mb-3 overflow-x-auto rounded-md bg-zinc-50 p-3 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
帮我检查这个项目的问题，并修复它
            </pre>
            <p className="mb-3">
              Agent 就不能一上来乱跑命令。它需要先列出步骤：
            </p>
            <pre className="mb-3 overflow-x-auto rounded-md bg-zinc-50 p-3 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
查看项目结构➡️阅读关键文件➡️运行测试➡️定位失败原因➡️修改代码➡️再次验证
            </pre>
            <p className="mb-3">
              这就是 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">todo_write</code> 的作用。你可以把它理解成 Agent 给自己贴在桌面上的任务清单。
            </p>
            <p className="mb-3">
              每个 todo 都有状态：
            </p>
            <pre className="mb-3 overflow-x-auto rounded-md bg-zinc-50 p-3 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
pending      还没开始
in_progress  正在做
completed    已完成
            </pre>
            <p className="mb-3">
              这样 Agent 就不只是“想到哪做到哪”，而是能明确知道：现在正在做哪一步，哪些已经完成，下一步该做什么。
            </p>
            <p className="mb-3">
              但要注意：<strong>TodoWrite 不是后台提醒器。</strong>
            </p>
            <p className="mb-3">
              它不会自己跳出来催 Agent。它的工作方式是：
            </p>
            <ol className="mb-3 list-decimal space-y-1 pl-5">
              <li>Agent 调用 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">todo_write</code> 写入或更新任务清单</li>
              <li>Harness 执行这个 Tool</li>
              <li>最新 todo 状态作为 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">tool_result</code> 回到 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">messages[]</code></li>
              <li>下一轮模型调用时，Agent 会在上下文里看到这份 todo</li>
              <li>然后决定继续执行哪一步，或者再次调用 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">todo_write</code> 更新状态</li>
            </ol>
            <p className="mb-3">
              所以 Agent 会在什么时候“看 todo”？
            </p>
            <p className="mb-3">
              通常是在每次回到模型思考环节时：
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5">
              <li>刚创建 todo 后，下一轮模型会看到完整计划</li>
              <li>完成一个工具动作后，模型会重新判断当前进度</li>
              <li>做完一个阶段后，Agent 可以把某项改成 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">completed</code></li>
              <li>开始下一阶段前，Agent 可以把下一项改成 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">in_progress</code></li>
              <li>如果发现原计划不合理，Agent 可以再次调用 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">todo_write</code> 修改计划</li>
            </ul>
            <p className="mb-3">
              也就是说，todo 不会主动指挥 Agent。它更像一个<strong>显式的进度锚点</strong>：每次 Agent 回到思考环节，都能看见自己刚刚写下的任务状态。
            </p>
            <p className="mb-3">
              本章最重要的变化是：
            </p>
            <p className="mb-3">
              <strong>Agent Loop 仍然没变，只是 Tool 池里多了一个计划工具。</strong>
            </p>
            <p className="mb-3">
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">TodoWrite</code> 不是新的主流程，也不是任务系统。它只是让 Agent 在复杂任务中先有计划、过程中能更新、用户也能看见进度。
            </p>
            <p className="mb-1">
              一句话理解：
            </p>
            <p className="rounded-md bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <strong>TodoWrite 是 Agent 的施工看板。没有它，Agent 会“凭感觉”干活；有了它，Agent 每次回到思考环节，都能看见自己做到哪一步，下一步该往哪走。</strong>
            </p>
          </div>
        )}

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
          <div className="mb-1 font-semibold">这张图怎么看</div>
          <p>{guide(version)}</p>
        </div>
        <Component title={t(version)} />
      </div>
    </Suspense>
  );
}
