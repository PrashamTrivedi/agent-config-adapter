# Requirements: Claude Code Workflows Support

## Overview

Add **Claude Code Workflows** as a new, first-class configuration type that the product can store, manage, and distribute. Workflows are Claude Code orchestration definitions that let Claude run many steps and sub-agents at scale. Today the product handles slash commands, agent definitions, MCP configs, and skills; this work brings workflows to the same level of support across every way users get configurations in and out of the system.

The guiding principle: a user who relies on workflows should be able to upload, browse, manage, sync, and bundle them everywhere they already do those things with other configuration types.

## Background

- A Claude Code workflow is a single self-contained file that describes an orchestration: it carries a small block of descriptive information (a name, a description, the phases of work it runs through, and optional guidance on when to use it) followed by the orchestration logic itself.
- Workflows are **specific to Claude Code**. The other supported tools (Codex, Gemini) have no equivalent concept. This is the same situation as agent definitions, which also do not exist in other tool formats.
- Workflows are normally self-contained in one file and do not rely on additional files to function.

## Goals

1. Make workflows a recognized configuration type throughout the product.
2. Let users add, view, edit, and remove workflows.
3. Let users discover and search workflows by their descriptive information, not just by filename.
4. Make workflows available through **all delivery mechanisms** the product already offers for other configuration types.
5. Treat workflows consistently with the existing tool's conventions so users are not surprised.

## Scope of Delivery Mechanisms

Workflows must be supported across the following surfaces:

### 1. Direct management (web and programmatic)
- Users can create, view, update, and delete workflows through the product's management interfaces (both the browser experience and the programmatic interface).
- Listings show meaningful information about each workflow — its name, description, the phases it runs, and when-to-use guidance — rather than just a filename.
- Workflows can be searched and filtered alongside other configuration types.

### 2. Local sync tooling (CLI)
- The local tool that scans a user's machine recognizes workflow files in the standard workflow locations, for both personal (user-level) and project-level setups, consistent with how it already finds other configuration types.
- Users can push (sync) their local workflows to the service.
- Users can pull (download) workflows back to their machine into the correct local location so they work immediately in Claude Code.

### 3. Programmatic agent access (MCP)
- Workflows are readable through the existing read/listing capabilities.
- Workflows can be pushed up through the existing local-sync capability.
- Workflows follow the same support level as skills here: they are **not** added to the generic create/update/convert operations in this scope. (This keeps parity with how skills are handled today and can be revisited later.)

### 4. Bundling and distribution (extensions, marketplaces, plugins)
- Workflows can be included in extensions and marketplaces just like any other configuration type.
- When a bundle is generated for Claude Code, included workflows are delivered in the correct location so they are usable immediately.
- When a bundle or manifest is generated for a non-Claude tool (Codex, Gemini), workflows are **omitted entirely**, because those tools cannot use them.

## Behavior Rules

### Format and conversion
- Workflows exist **only** in the Claude Code format.
- Workflows are delivered as-is (passthrough); the product does not attempt to translate a workflow into a Codex or Gemini equivalent.
- If someone requests a workflow in a non-Claude format, the product responds that the workflow is not available in that format (the same experience as requesting an unsupported conversion today).

### Storage
- A workflow is stored as a single file. Its content is kept directly with the configuration record.
- Companion/auxiliary files are **out of scope for now**. The design should leave room to add them later (workflows were intentionally aligned with the richer, multi-file model used by skills), but no companion-file handling is built in this round.

### Descriptive information (metadata)
- When a workflow is added or updated, the product extracts its descriptive information (name, description, phases, when-to-use guidance) so it can be displayed, searched, and previewed.
- Extraction is **tolerant**: if the descriptive block cannot be read for any reason, the workflow is still stored. In that case it is marked as having unreadable descriptive information and shown with whatever is available (e.g., its filename). Storage is never blocked by a parsing problem.

### Access control
- Creating, updating, and deleting workflows is protected the same way these operations are for every other configuration type (the existing access gate applies).

## Out of Scope

- Translating or converting workflows to or from Codex/Gemini formats.
- Companion/auxiliary file support for workflows.
- Adding workflows to the generic programmatic create/update/convert operations (matching how skills are treated today).
- Surfacing workflows inside non-Claude bundles or manifests.

## Open Items / Future Considerations

- Companion-file support for workflows, if real-world use shows workflows shipping with helper files or documentation.
- Promoting workflows to full first-class operations in the programmatic agent interface, in line with whatever is decided for skills.

## Success Criteria

- A user can add a workflow through the web interface and see its name, description, phases, and when-to-use guidance in the listing.
- A user can run the local sync tool and have their personal and project workflows discovered, pushed to the service, and pulled back down into the right place.
- A workflow can be added to an extension or marketplace and appears, ready to use, in a generated Claude Code bundle — and is absent from any Gemini/Codex bundle.
- Requesting a workflow in a non-Claude format clearly reports it is unavailable in that format.
- A workflow with an unreadable descriptive block is still stored and listed (flagged as such) rather than rejected.
