# BF Labs Studio theme

## Source contract

This theme consumes two named sources instead of approximating either one:

- BF Labs visual truth: `Sunnyender-org/bflabs-ui` commit `f49157ff586adf91f6ba21f00f1dbbbb36e0afc5`.
- Interaction discipline: `emilkowalski/skills`, `apple-design`, commit `d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7`.

BF Labs brand truth outranks reference defaults. Apple guidance owns response,
predictability, spatial consistency, typography behavior, and accessibility. It
does not replace BF Labs colors, geometry, logo, or component language.

## Visual thesis

WorkBuddy remains a familiar enterprise workbench. BF Labs changes the material
language through exact warm white, charcoal, orange, typography roles, low
corner radii, and the published BF Mark. Whitespace separates tasks before
boxes or dividers.

The interface should feel useful, real, applied, reliable, and forward-moving.
It must never become a wallpaper, game skin, glass experiment, or marketing
landing page inside the host application.

## Utility plan

- Sidebar: BF Sand over Warm White, exact mark in the preview, low-radius states.
- Workspace: calm Warm White with no decorative grid or oversized watermark.
- Composer: BF surface material, 4px geometry, one orange focus owner.
- Menus and dialogs: opaque raised surfaces that preserve native placement.
- Code, diff, terminal, and file panes: native geometry with semantic tokens.

## Interaction thesis

- Pointer-down feedback begins immediately and uses only transform/color.
- Hover may translate a control by at most 2px, then settles on release.
- Focus uses one orange outline and never changes geometry.
- Enter and exit paths remain symmetric because the theme does not relocate UI.
- Reduced motion keeps color feedback, removes transforms, and finishes in 1ms.
- Reduced transparency and increased contrast receive solid, defined surfaces.

## BF Labs tokens

| Role | Value |
| --- | --- |
| Charcoal | `#111417` |
| Ink | `#1E2226` |
| Graphite | `#2F3338` |
| Warm White | `#FAF8F5` |
| BF Orange | `#FF6A33` |
| Steel | `#6B7177` |
| Silver | `#8F9499` |
| Light Gray | `#D9DCE0` |
| Soft Tone | `#E7E2D7` |
| Sand | `#F1ECE3` |
| Pale Blue | `#E8F1F7` |
| Signal Blue | `#4C7FAF` |

## Geometry and typography

- Control radius: `2px`.
- Surface radius: `4px`.
- Round geometry is reserved for true dots and avatars.
- Display and labels: Space Grotesk with Avenir Next fallback.
- Body: Inter with Helvetica Neue fallback.
- Chinese: Noto Sans SC, Source Han Sans CN, PingFang SC.
- WorkBuddy native layout, hit areas, routes, controls, and state remain fixed.

## Deliberate source resolution

Apple's translucent-material guidance is not used as the default surface here.
BF Labs UI explicitly establishes opaque warm-white/charcoal surfaces, and the
host theme must avoid stacked translucency and renderer-dependent blur. Apple
principles are retained through immediate feedback, agency, consistency,
responsive type, and accessibility media queries.

## Verification targets

- WorkBuddy AI 5.3.11 on macOS.
- WorkBuddy 5.3.14 on Windows.
- 1440 × 900, 390 × 844, and the 375px responsive acceptance width.
- Sidebar, home, task, composer, menu, dialog, code, terminal, detail pane,
  route change, restore, reduced motion, reduced transparency, and contrast.
