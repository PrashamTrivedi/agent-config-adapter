# Logstory: The Universal Adapter

## The Three Frustrations

The story of this codebase isn't one of gradual discovery; it's a reaction to three distinct, painful friction points in a multi-agent reality.

1.  **The Migration Tax:** You faced a hard constraint—cost. Moving from Claude to Gemini fully meant leaving behind a carefully cultivated ecosystem of slash commands and MCP servers. The penalty? Porting everything by hand using the Gemini CLI and API keys.
2.  **The Context Switch:** Your life was split between two worlds: **Claude Code** at home and **GitLab Duo** at work. You wanted to demonstrate the power of your personal workflows to your team, but the "language" barrier between the tools made it impossible without re-engineering every prompt. (Support for GitLab Duo is the "missing link" currently planned).
3.  **The Surface Gap:** It wasn't just about the AI model; it was about the environment. Moving tasks from a CLI agent to a Web IDE agent (like the one running this session) introduced "Sandbox" friction.
    - **No Internet:** Web IDE agents often lack the `curl`/`gh` access that local CLI agents have.
    - **Different Workflow:** Instead of displaying content in chat, the Web IDE agent needs to "write, commit, and push" for review.
    - The adapter solves this by injecting specific "Sandbox-aware" instructions (as seen in `src/prompts.ts`) to strip network dependencies and enforce the push-based workflow.

## The "Big Bang" Solution

To an outside observer looking at the recent git history, commit `358ba8c` (6 weeks ago) appears as a **comprehensive solution**, landing with fully formed MCP and Slash Command adapters.

While the true genesis traces back to commit `6028052` (not visible in this shallow clone), the effect is the same: The "Universal Adapter" was born from the necessity to stop manual porting. It didn't start as a toy; it started as a required utility to keep your development velocity high across multiple platforms.

## Evolution: From Utility to Platform

While the core logic (the "Rosetta Stone") was present from the start, the *usage* evolved.

- **Smarter Conversion:** Commit `b7f2c76` ("Enhance slash command converter...") shows that simple translation wasn't enough. You needed context-aware argument handling to truly bridge the gap between surfaces.
- **The Surface Shift (UI Modernization):** As the tool became critical for your "Double Life" (Home/Work), a CLI interface wasn't enough. You needed a control center. The UI modernization (`4b18139`, `0750288`) turned a backend utility into a manageable platform.
- **Defining the Mission:** The recent `ICP & Jobs To Be Done` analysis (`5ac3673`) signals a shift from "solving my problem" to "solving the industry's problem."

## The Vision

Today, the Agent Config Adapter stands as the bridge. It allows you to define a "Skill" or "Config" once and have it work:
- In **Claude Code** (Home)
- In **Gemini** (Cost-effective)
- In **Codex** (Generic/Other)
- And soon **GitLab Duo** (Work)

It is the infrastructure for an Agent-Agnostic future.
