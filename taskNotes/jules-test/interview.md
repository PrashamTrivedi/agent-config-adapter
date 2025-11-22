# Interview Questions

1. **The "Surface" Shift:** You mentioned moving "From CLI agent to coding agents like you". Does this mean you see "me" (Jules/IDE agents) as a *consumer* of these configs, or are you strictly referring to the fact that you are using agents *to build* this tool? The commit history shows "Claude" as the author for many commits, which is meta!

2. **The "Single Commit" Mystery:** My git view shows a grafted history (shallow clone) where `2811901` is a recent anchor. Was there a specific "big bang" moment where the codebase changed drastically, or is this just an artifact of how the repo was provided to me? I constructed the narrative based on the "grafted" history I could find—is that timeline (MCP -> Slash Commands -> UI) accurate to your experience?

3. **Email Gating:** The code has extensive "email gating" logic (`src/middleware/email-gate.ts`, `X-Subscriber-Email`). Is this intended to be the permanent auth solution (low friction), or just a placeholder for full OAuth/Accounts later? It seems very specific to the "No-Code Builder" ICP.

4. **Multi-Provider Strategy:** The code references `google-labs-jules` (that's me!) in the logs now. How important is the specific *agent* identity to you? Do you want the adapter to be completely agent-agnostic, or do you foresee "agent-specific" optimizations (e.g., specific prompts for Jules vs. Claude)?

5. **The "Frustration" Specifics:** Can you give me an example of one specific workflow or slash command that was the "straw that broke the camel's back"? The one that made you say, "I need to build an adapter for this"?
