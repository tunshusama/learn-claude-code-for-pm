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
      <div className="min-h-[500px]">
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
          <div className="mb-1 font-semibold">这张图怎么看</div>
          <p>{guide(version)}</p>
        </div>
        <Component title={t(version)} />
      </div>
    </Suspense>
  );
}
