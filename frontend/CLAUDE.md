# Project guide for Claude Code

This is a Vite + React 18 + TypeScript app wired up to the Domino design system.

## Imports

- **The npm package is `@dominodatalab/extensions-tools`.** All imports in this project use that name.
- Storybook code snippets often show imports from `@domino/base-components`. That is a Storybook-internal alias. **Rewrite every such import to `@dominodatalab/extensions-tools` before pasting.** This is the single most common mistake.

## Pinned versions (do not change without a reason)

- `react` and `react-dom` are pinned to `18.2.0`. The Domino library peer-depends on React 18; React 19 fails at install.
- `react-router` / `react-router-dom` are pinned to `5.3.4`. The Domino library uses v5 APIs (`HashRouter`, `Switch`, `component={}`/`render={}`). Do not upgrade to v6.
- `HashRouter` (not `BrowserRouter`) wraps the app in `src/main.tsx`.
- `DominoThemeProviderDecorator` wraps the entire React tree in `src/main.tsx`. Every Domino component must render inside it.

## Component API lookups — use the Storybook MCP

This repo registers a Storybook MCP server (see `.mcp.json`). When you need a component's real props, query it. Do **not** invent props.

Workflow:

1. `list-all-documentation` — get the catalog of components and stories.
2. `get-documentation` — pull the doc for a specific component.
3. `get-documentation-for-story` — pull the doc for a specific story variant.

If a component or prop isn't in the Storybook output, treat it as not existing rather than guessing.

## Standalone (no Domino backend) note

`DominoThemeProviderDecorator` will try to fetch user and white-label data from the Domino backend by default. In a standalone environment those requests fail silently and the UI still renders with defaults. To suppress the requests, pass a `useStoreHook` — see `node_modules/@dominodatalab/extensions-tools/README.md`.

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — production build (also the canonical "is everything wired up correctly" check).
- `npm run preview` — preview the production build locally.
