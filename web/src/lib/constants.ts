import type { AgentLayer } from "@/types/agent-data";

export const DEFAULT_LOCALE = "zh";
export const SUPPORTED_LOCALES = ["en", "zh", "ja"] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export function isSupportedLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function resolveLocale(locale: string): Locale {
  return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
}

export const VERSION_ORDER = [
  "s00",
  "s01",
  "s02",
  "s03",
  "s04",
  "s05",
  "s06",
  "s07",
  "s08",
  "s09",
  "s10",
  "s11",
  "s12",
  "s13",
  "s14",
  "s15",
  "s16",
  "s17",
  "s18",
  "s19",
  "s20",
  "s21",
] as const;

export const LEARNING_PATH = VERSION_ORDER;

export type VersionId = typeof LEARNING_PATH[number];

export const VERSION_META: Record<string, {
  title: string;
  subtitle: string;
  coreAddition: string;
  keyInsight: string;
  layer: AgentLayer;
  prevVersion: string | null;
}> = {
  s00: {
    title: "Setup",
    subtitle: "Put the Project in the Right Place",
    coreAddition: "Workspace and environment setup",
    keyInsight: "Before learning the loop, the learner needs a correct project root, workspace, dependencies, and .env configuration.",
    layer: "foundation",
    prevVersion: null,
  },
  s01: {
    title: "LLM Basics",
    subtitle: "Messages, Stateless Models, and While Loops",
    coreAddition: "Minimal chat loop",
    keyInsight: "A model does not remember by itself; the client sends messages[] every round and uses a loop to keep the conversation going.",
    layer: "foundation",
    prevVersion: "s00",
  },
  s02: {
    title: "The Agent Loop",
    subtitle: "One Loop Is All You Need",
    coreAddition: "Minimal model/tool loop",
    keyInsight: "The smallest useful agent is a loop that calls the model, runs tools, and feeds results back.",
    layer: "tools",
    prevVersion: "s01",
  },
  s03: {
    title: "Tool Use",
    subtitle: "Add a Tool, Add Just One Line",
    coreAddition: "Tool dispatch map",
    keyInsight: "The loop stays stable while capabilities register into a dispatch table.",
    layer: "tools",
    prevVersion: "s02",
  },
  s04: {
    title: "Permission",
    subtitle: "Check Permissions Before Execution",
    coreAddition: "Permission gate",
    keyInsight: "Dangerous actions need a harness decision point before the shell runs.",
    layer: "tools",
    prevVersion: "s03",
  },
  s05: {
    title: "Hooks",
    subtitle: "Hang on the Loop, Don't Write into It",
    coreAddition: "Lifecycle hooks",
    keyInsight: "Cross-cutting behavior belongs around the loop, not tangled inside it.",
    layer: "tools",
    prevVersion: "s04",
  },
  s06: {
    title: "TodoWrite",
    subtitle: "An Agent Without a Plan Drifts Off Course",
    coreAddition: "Todo manager",
    keyInsight: "Explicit plans keep long-running work visible and correctable.",
    layer: "planning",
    prevVersion: "s05",
  },
  s07: {
    title: "Subagent",
    subtitle: "Break Large Tasks into Small Ones with Clean Context",
    coreAddition: "Isolated subtask context",
    keyInsight: "Subagents give each subtask a clean message history while preserving the main thread.",
    layer: "planning",
    prevVersion: "s06",
  },
  s08: {
    title: "Skill Loading",
    subtitle: "Load Only When Needed",
    coreAddition: "On-demand skill loader",
    keyInsight: "Inject specialized knowledge only when the task actually needs it.",
    layer: "planning",
    prevVersion: "s07",
  },
  s09: {
    title: "Context Compact",
    subtitle: "Context Will Fill Up",
    coreAddition: "Context compaction",
    keyInsight: "Compression keeps the conversation usable when the context window gets crowded.",
    layer: "memory",
    prevVersion: "s08",
  },
  s10: {
    title: "Memory",
    subtitle: "Keep a Layer That Doesn't Lose Details",
    coreAddition: "Durable memory layer",
    keyInsight: "Some facts should survive summarization and future sessions.",
    layer: "memory",
    prevVersion: "s09",
  },
  s11: {
    title: "System Prompt",
    subtitle: "Assembled at Runtime, Never Hardcoded",
    coreAddition: "Runtime prompt assembly",
    keyInsight: "The system prompt is a generated product of policy, tools, skills, and context.",
    layer: "planning",
    prevVersion: "s10",
  },
  s12: {
    title: "Error Recovery",
    subtitle: "Errors Are the Start of a Retry",
    coreAddition: "Retry strategy",
    keyInsight: "A robust harness classifies failures and decides what kind of retry is worthwhile.",
    layer: "planning",
    prevVersion: "s11",
  },
  s13: {
    title: "Task System",
    subtitle: "Break Big Goals into Small Tasks",
    coreAddition: "Task board",
    keyInsight: "A task graph turns vague goals into ordered, observable work.",
    layer: "collaboration",
    prevVersion: "s12",
  },
  s14: {
    title: "Background Tasks",
    subtitle: "Slow Operations Go to the Background",
    coreAddition: "Background execution",
    keyInsight: "The agent can keep reasoning while slow work completes elsewhere.",
    layer: "concurrency",
    prevVersion: "s13",
  },
  s15: {
    title: "Cron Scheduler",
    subtitle: "Producing Work on a Schedule",
    coreAddition: "Scheduled task creation",
    keyInsight: "Recurring work should be created by the harness, not remembered by the model.",
    layer: "concurrency",
    prevVersion: "s14",
  },
  s16: {
    title: "Agent Teams",
    subtitle: "One Agent Isn't Enough, Form a Team",
    coreAddition: "Teammate mailboxes",
    keyInsight: "Persistent teammates let work continue in parallel without stuffing every thought into one context.",
    layer: "collaboration",
    prevVersion: "s15",
  },
  s17: {
    title: "Team Protocols",
    subtitle: "Teammates Need Agreements",
    coreAddition: "Shared coordination protocols",
    keyInsight: "Multi-agent systems need explicit message contracts, not vibes.",
    layer: "collaboration",
    prevVersion: "s16",
  },
  s18: {
    title: "Autonomous Agents",
    subtitle: "Check the Board, Claim the Task",
    coreAddition: "Autonomous task claiming",
    keyInsight: "Teammates become useful when they can discover and claim work themselves.",
    layer: "collaboration",
    prevVersion: "s17",
  },
  s19: {
    title: "Worktree Isolation",
    subtitle: "Separate Directories, No Conflicts",
    coreAddition: "Worktree lifecycle",
    keyInsight: "Parallel agents need isolated filesystems as much as isolated conversations.",
    layer: "collaboration",
    prevVersion: "s18",
  },
  s20: {
    title: "MCP Tools",
    subtitle: "External Tools, Standard Protocol",
    coreAddition: "MCP tool bridge",
    keyInsight: "External services can become agent tools through a standard discovery and call protocol.",
    layer: "collaboration",
    prevVersion: "s19",
  },
  s21: {
    title: "Comprehensive Agent",
    subtitle: "All Mechanisms, One Loop",
    coreAddition: "Integrated harness",
    keyInsight: "The final harness is still one loop, now surrounded by the systems that make it production-shaped.",
    layer: "collaboration",
    prevVersion: "s20",
  }
};

export const LAYERS = [
  {
    id: "foundation" as const,
    label: "Foundation",
    color: "#71717A",
    versions: ["s00", "s01"],
  },
  {
    id: "tools" as const,
    label: "Tools & Execution",
    color: "#3B82F6",
    versions: ["s02", "s03", "s04", "s05"],
  },
  {
    id: "planning" as const,
    label: "Planning & Control",
    color: "#10B981",
    versions: ["s06", "s07", "s08", "s11", "s12"],
  },
  {
    id: "memory" as const,
    label: "Memory Management",
    color: "#8B5CF6",
    versions: ["s09", "s10"],
  },
  {
    id: "concurrency" as const,
    label: "Concurrency & Scheduling",
    color: "#F59E0B",
    versions: ["s14", "s15"],
  },
  {
    id: "collaboration" as const,
    label: "Multi-Agent Platform",
    color: "#EF4444",
    versions: ["s13", "s16", "s17", "s18", "s19", "s20", "s21"],
  },
] as const;
