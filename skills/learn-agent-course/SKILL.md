---
name: learn-agent-course
description: Project-specific guidance for editing Learn Claude Code course content, Chinese copy, README lessons, web page text, glossary explanations, examples, exercises, and UX wording. Use when Codex modifies or reviews user-facing copy in this repository, especially Chinese content for beginner Agent learners, PM readers, or non-engineers learning coding agents.
---

# Learn Agent Course

## Core Audience

Write for people who do not know much code yet but want to understand Agents, coding agents, and Agent product architecture.

Assume the reader is curious and capable, but may not know shell commands, Python files, API calls, tool schemas, or runtime concepts. Explain enough context for them to keep moving without making the page feel childish.

## Copy Principles

- Make every change suitable for future readers of this course, not just for the current user's personal behavior or one chat-specific situation.
- Prefer natural, fluent Chinese. Avoid stiff translation patterns and repetitive sentence molds.
- Use "不是……而是……" sparingly. Replace mechanical contrast with direct explanation when possible.
- Keep product and learning intent clear: what problem this chapter solves, what the reader should notice, what outcome they should expect.
- Preserve a calm teaching tone. Do not scold, over-reassure, or over-explain obvious ideas.
- Use concrete examples when explaining abstract Agent concepts, especially when the reader needs to connect model behavior to Harness behavior.

## Editing Workflow

1. Read the surrounding section before changing copy. Check the chapter goal, nearby headings, examples, and expected outcomes.
2. Identify whether the text is instructional copy, conceptual explanation, exercise guidance, UI wording, glossary text, or metadata.
3. Rewrite for the course audience, not for a one-off support reply. Remove references that only make sense in the current conversation unless the page is explicitly documenting a real common failure mode.
4. Preserve technical accuracy. Do not soften a term so much that it becomes misleading.
5. Keep commands, filenames, API names, model/tool event names, and code identifiers exact.
6. After editing, reread the changed paragraph as a learner: can they understand what to do, what they should see, and why it matters?

## Project Fit Checks

Before finishing a copy change, verify:

- The copy can live in a public course page without depending on the current user's private context.
- The wording helps beginners understand Agent mechanics without pretending they are engineers already.
- The Chinese reads like original teaching material, not machine-translated English.
- The text avoids repeated "不是……而是……" framing unless contrast is genuinely the clearest structure.
- The change does not turn a general lesson into advice aimed only at one user's mistake.
- Any added explanation is tied to the course's Agent-learning goal.

## Terminology

Keep established technical terms when they are part of the course vocabulary: Agent, Harness, Tool, Context, MCP, `messages[]`, `tool_use`, `tool_result`, System Prompt, Bash, dispatch.

When adding explanations for these terms, explain from the learner's point of view:

- What it does in the Agent workflow.
- Where the learner can observe it in the demo or page.
- Why it matters for judging a real Agent product.

Avoid inventing new Chinese translations if the page already uses the English term as the teaching anchor.
