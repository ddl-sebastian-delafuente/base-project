# `domino-ui-bootstrap` Skill — Improvement Plan

Based on bootstrapping a Vite + React + TS Domino frontend (with FastAPI backend) end-to-end in this session, here is a prioritized list of gaps and concrete fixes for the skill.

The skill got the foundational invariants right (React 18 pinning, theme provider wrapping, MCP registration). Failures clustered around two themes: **the Vite scaffold's defaults fight Domino** (toolchain too new, CSS overrides the design system), and **the skill doesn't address Domino's runtime deployment shape** (proxy prefix, fetch URLs).

---

## P0 — Caused production breakage or required a rewrite

### 1. Bundler/TS toolchain pinning is missing

**What happened.** `npm create vite@latest` scaffolded Vite 9 / TypeScript 6 / ESLint 10 / `@types/node` 24, all of which require Node ≥ 20.19. The workspace ships Node 20.18.3. `npm run build` failed with a rolldown native-binding error, and TS errored on `erasableSyntaxOnly` (a 5.6+ flag) and missing `composite: true` for `tsc -b`.

**Skill gap.** Step 4 says to "leave Vite, ESLint, TypeScript … alone." That guidance assumes the scaffold's pins are compatible with the user's Node. They aren't, on the Domino default image.

**Fix — add to Step 4:**

- After scaffolding, run `node -v`. If `< 20.19`, pin the toolchain to a Node-20.18-compatible set:
  - `vite: ^5.4.0`
  - `@vitejs/plugin-react: ^4.3.4`
  - `typescript: ~5.5.4` (or `~5.6` if you keep `erasableSyntaxOnly`)
  - `@types/node: ^20.12.0`
  - Drop the `eslint*` / `typescript-eslint` / `globals` block, or downgrade to versions whose `engines.node` is ≤ 20.18 (the current Vite-9 scaffold's are all incompatible).
- Strip `erasableSyntaxOnly` from `tsconfig.app.json` and `tsconfig.node.json` when downgrading TS to <5.6.
- Add `"composite": true` to both tsconfigs when `build` uses `tsc -b`.
- Delete the stale `eslint.config.js` if ESLint is removed.

**Bonus check.** Even on Node 20.19+, the skill should `npm run build` (not just `npm install`) as Step 11 — `install` succeeds with broken native bindings; only `build` catches them.

---

### 2. SPA `fetch('/api/...')` calls break under Domino's app proxy

**What happened.** The deployed frontend issued `fetch('/api/project')`. Domino serves apps under `/apps-internal/<appId>/` (or a vanity URL), so a root-absolute fetch resolves to the bare domain — bypassing the proxy — and Domino returns 404 from its own frontend.

**Fix.**
```ts
const apiBase = window.location.pathname.replace(/[^/]*$/, '') + 'api'
fetch(`${apiBase}/project`)
```

This preserves whatever prefix the proxy mounted the app at, and continues to work in local dev (where `pathname` is `/`).

**Skill gap.** The skill has nothing about Domino's runtime proxy shape. Vite's `base: './'` (which the scaffold sets) handles asset URLs correctly, but user code calling `fetch('/api/…')` is on its own.

**Fix — add a new Step 7.5 ("Domino proxy prefix") or a section in `CLAUDE.md`:**
- State: when this app runs inside Domino, it's served at `https://<host>/apps-internal/<appId>/`. Static assets work because `base: './'` makes them relative. **Any user-written fetch/XHR/WebSocket URL must also be document-relative.**
- Provide the `apiBase` helper above and recommend wrapping all API calls through it.
- Cross-reference: this overlaps with the `dominodatalab:app-deployment` skill; the bootstrap skill should at least surface it.

---

### 3. The Vite scaffold's `src/index.css` actively fights the Domino theme

**What happened.** The default `src/index.css` contains:
```css
#root {
  width: 1126px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  border-inline: 1px solid var(--border);
}
```
…plus 80+ lines of color tokens, custom `h1`/`h2`/`p`/`code` styles, dark-mode overrides, and decorative rules for the Vite-template "hero" section. All of this overrides or conflicts with `DominoThemeProviderDecorator`'s tokens.

**Skill gap.** Step 7 says "don't remove existing CSS imports — the theme provider injects its own styles, so a separate Domino CSS import isn't needed, but the user's app CSS should stay." On a fresh scaffold there is no "user's app CSS" — it's all Vite-template chrome that *should* be removed.

**Fix — add to Step 8 (starter screen) or as a new step:**
- For fresh scaffolds, replace `src/index.css` with a minimal reset:
  ```css
  body { margin: 0; }
  #root { min-height: 100svh; }
  ```
- Delete `src/App.css` if `App.tsx` no longer imports it.
- For retrofits, leave existing CSS alone.

---

## P1 — Caused bugs the developer had to debug in production

### 4. `Typography` is a namespace; not all common Ant patterns hold

**What happened.** I wrote `<Typography>…</Typography>` as a wrapper component. Crashed in production with React error #130 (element type invalid). Same kind of trap with `<Tag color="blue">` — `Tag` has no `color` prop; it uses `type` with semantic values (`user-generated`, `success`, `danger`, `warning`).

**Skill gap.** Step 8 says "use components and props you're certain about" and Step 9's CLAUDE.md template warns against inventing props. Both are correct but didn't prevent the bug. The MCP isn't queryable in the same session you register it, so the *first* Claude session writing code is exactly the one most likely to invent.

**Fix — add a "Known-safe starter inventory" appendix to the skill:**

| Component | Safe usage |
|---|---|
| `Button` | `type='primary'|'secondary'|'tertiary'`, `onClick`, children |
| `Card` | `title`, `extra`, `helpMessage`, `noPadding`, children. No `size` prop. |
| `Row`/`Col`/`Space` | Ant-style. `Space` takes `direction`, `size`. |
| `Tag` | `type` (NOT `color`). Values: `user-generated`, `success`, `danger`, `warning`. |
| `Typography` | Namespace. Render `Typography.H1` / `.H2` / `.H3` / `.Text`. Never `<Typography>` as wrapper. |
| `Typography.Text` | Optional `type='BodyDefault'|'BodyDefaultStrong'|'BodySmall'|'BodySmallStrong'|'BodyCode'`. |
| `DominoTable<T>` | Columns typed `DominoColumnType<T>[]`. `rowKey` is load-bearing. Pass `dataSource={[]}` (not `null`) for empty-state to render. |
| `SpinnerWrapper` | Loading wrapper. |

Use the MCP for anything beyond this set.

**Also call out:** the published package's `README.md` shows imports from `@domino/base-components`. That's the Storybook alias — rewrite to `@dominodatalab/extensions-tools`. The skill already warns about this in CLAUDE.md, but the README is inside `node_modules` and looks authoritative.

---

### 5. Project name normalization

**What happened.** User asked for "Domino Frontend". npm package names must be lowercase, hyphens-only — had to silently rewrite to `domino-frontend`. Worth being explicit so the friendly name can still live in `CLAUDE.md`, UI titles, etc.

**Fix — change Step 1:**
- Ask for two names: a **display name** (any string) and a **package name** (default: kebab-case of display name, validated against npm rules). Or normalize automatically and tell the user what the package name became.

---

## P2 — Polish / small ergonomic wins

### 6. Pin `@dominodatalab/extensions-tools` version after install

Step 4 allows `latest`. Fine for prototypes; bad for reproducible builds across sessions. After the first successful install, swap `latest` for the resolved version (`npm view @dominodatalab/extensions-tools version`).

### 7. Bundle-size warning is expected

Vite emits a >500KB-chunk warning because the Domino library bundles a lot. Add a one-line note to the hand-off (Step 12) or `CLAUDE.md` so future sessions don't chase the warning.

### 8. Port choice in local dev

If the user runs both Vite dev and a FastAPI backend inside a Domino workspace, port 8888 is taken by code-server. Worth mentioning in Step 11 / hand-off: "If you're running a dev server inside a Domino workspace, use a port other than 8888."

---

## What worked well — don't change

- `DominoThemeProviderDecorator` outside `HashRouter` outside `App` wiring in `src/main.tsx` (Step 7) — clean and correct.
- MCP registration via `.mcp.json` + `.claude/settings.local.json` (Step 6) — works, merges cleanly.
- React 18.2.0 / react-router 5.3.4 pinning (Step 4) — load-bearing, kept the install path clean.
- Vite `base: './'` for portable asset paths — saves the proxy-prefix problem for assets.
- CLAUDE.md template with the `@domino/base-components` → `@dominodatalab/extensions-tools` rewrite reminder (Step 9) — caught me twice in this session.
- `.gitignore` strategy of "append missing entries, don't overwrite" (Step 10).

---

## Suggested edit sequence

1. **Step 4 rewrite** (P0 #1): add Node-version branch with toolchain-pinning recipe.
2. **New Step 7.5 / CLAUDE.md addition** (P0 #2): `apiBase` helper and proxy-prefix explanation.
3. **Step 8 addition** (P0 #3 + P1 #4): replace `src/index.css` with minimal reset for fresh scaffolds; add known-safe component inventory.
4. **Step 1 tweak** (P1 #5): display-name vs package-name split.
5. **Step 4 / Step 12 polish** (P2): pin extensions-tools version, note bundle-size warning, mention port 8888 in workspace dev.

If you only have time for one change, do **P0 #2** (proxy prefix) — it's the only one of these that silently breaks a deployed app in a way that's hard to diagnose without knowing Domino's deploy shape.
