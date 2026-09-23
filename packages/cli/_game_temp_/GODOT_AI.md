# Godot AI integration

This template includes [Godot AI](https://github.com/hi-godot/godot-ai) as
editor-only development tooling for Codex and other MCP clients.

## Pinned release

- Version: `v4.2.1`
- Upstream commit: `bfc264200584ea5823f18356acb164781f57796d`
- Release archive: `godot-ai-v4-plugin.zip`
- SHA-256: `dec0d18f381e6769bd4befee856572ee1ac0d77f189e9ceb41d3d1949ed7cf97`
- Verification: the archive and extracted tree were checked against the
  release's signed canonical manifest.
- License: MIT; the upstream notice is preserved at
  `addons/godot_ai/LICENSE`.

The vendored directory comes from the official release archive, not a source
snapshot. Keep it as one release-owned tree. Do not overlay another version on
top of it.

## Local setup

1. Use Godot 4.7 or newer within the Godot 4.x line.
2. Install [`uv`](https://docs.astral.sh/uv/), which provides `uvx` for the
   Python MCP server.
3. Open this project in Godot. The `Godot AI` editor plugin is already enabled.
4. In the Godot AI Dock, choose Codex or another supported MCP client and press
   **Configure**. Restart the client if it does not discover the new server.

Client configuration is a developer-machine action and is not part of the game
package. Review the generated command and configuration before accepting it.
Godot AI enables anonymous usage telemetry by default; launch the editor with
`GODOT_AI_DISABLE_TELEMETRY=true` when telemetry must be disabled.

## Runtime and export boundary

Godot AI is an editor plugin, not an HTYF runtime SDK. Game scenes and scripts
must not load, extend, preload, or call files under `addons/godot_ai/`.

Both Android and iOS export presets exclude `addons/godot_ai/**`. The plugin's
headless export hook also strips its `_mcp_game_helper` autoload from the
exported project settings. After changing the plugin or export configuration,
verify that the PCK/ZIP contains neither `addons/godot_ai/` nor the
`_mcp_game_helper` autoload.

## Updating

Use a verified official Godot AI release and follow its migration instructions.
For generated projects, prefer the Dock's supported updater. For this template,
replace the complete `addons/godot_ai/` tree, then update the version, commit,
archive hash, tests, and this document together. Re-run headless import/export
and inspect the final package before release.
