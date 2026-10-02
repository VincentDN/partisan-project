# UI style guide

Two registers, one family. Tools (Workbench, Customiser, Viewer) are a dark instrument panel; the index is a Nokia-style 1-bit LCD. Both are buildless CSS with no web fonts and no images in the chrome.

## Tools: instrument panel
- **Tokens** live in `shared/tokens.css` (imported by `shared/panel-ui.css`): `--bg #12170f`, `--panel #192013`, `--line`, `--text #dbe5c3`, `--dim #98a97e`, `--accent #ef8f39`, `--good`, `--bad`, `--radius`, `--gap`, `--focus`, `--mono`. Add a token before adding a literal colour. The palette is Nokia green throughout; do not add blue-grey.
- **Type**: `system-ui` for prose, `ui-monospace` for labels, values and eyebrows. Section headings (`h2`) are 11 px mono caps with 0.14em tracking in `--dim`.
- **Controls**: buttons are quiet by default; the accent marks state (`aria-pressed=true`) and focus, never decoration. Destructive actions are not styled differently, they ask first.
- **Layout**: stage left, 325 px aside right; below 780 px the stage is sticky on top. Controls wrap, never scroll horizontally.
- **Feedback**: gains are `--good`, losses `--bad`, always with a sign or label, never colour alone.
- **First run**: one dismissible tour (`shared/tour.js`) using the `#first-run` callout.

## Index: Nokia LCD
- Palette `--lcd-0/1/2` plus `--body*`; shading is ordered dither between two tones. Accent `#ef8f39` is shared with the tools.
- Navigation is keyboard first: arrows, Enter, number keys. Everything reachable by touch.

## Rules for all pages
1. WCAG 2.2 AA: contrast, 24 px minimum target, visible focus, one `h1`, landmarks. `tests/e2e/a11y.mjs` must stay at zero violations.
2. `prefers-reduced-motion` disables idle animation, camera glides, spinner motion and secondary motion.
3. Relative URLs only; the site is served under `/partisan-project/`.
4. Copy: plain, concrete, no marketing words, no exclamation marks.
