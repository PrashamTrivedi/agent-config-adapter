## New Questions

1.  **GitLab Duo Integration:** You mentioned using GitLab Duo at work (`Team Standards`). However, the current codebase only explicitly references `claude_code`, `gemini`, and `codex` formats.
    *   Does GitLab Duo use the `codex` format?
    *   Or is GitLab Duo support currently a "missing link" that you plan to add? 

Answer: Missing link to add, not needed right now.

2.  **The "Big Bang" Origin:** Since commit `358ba8c` landed with both MCP and Slash Command adapters fully formed, was this codebase imported from a private prototype/gist? Or is the git history significantly truncated/squashed before that point? (Just curious about the *genesis* of that code).
- This was the first commit: 6028052c1285afd975c8a40461777be93d5d16a4 Not sure what you are referring to.

3.  **Sandbox Specifics:** regarding "The prompts... need to change... to effectively use them [in Web IDEs]":
    *   Is this primarily about **File Paths** (e.g., `/home/user` vs `/mnt/sandbox`)?
    *   Or is it about **Capabilities** (e.g., Web IDE agents can't run `docker` or `curl` directly)?
    *   How does the adapter handle this? Does it inject "Sandbox-aware" instructions into the prompt?
- You can read prompts.ts file to understand that.

4.  **Gemini CLI vs. API:** You mentioned moving to "Gemini" due to cost. Are you using a specific *Gemini CLI tool* (like a Google-made one), or are you using a custom CLI that calls the Gemini API (perhaps using this adapter)? The `gemini` format in the code seems to refer to a JSON structure—what tool consumes that?
- Gemini CLI and some tools which uses API key
