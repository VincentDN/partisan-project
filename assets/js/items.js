// The index entries. `href` are relative so the site works under any base path (GitHub Pages project site).
// 5x5 1-bit icons as inline SVG data (no image files).
const px = bits => `<svg viewBox="0 0 5 5" width="12" height="12" shape-rendering="crispEdges" fill="currentColor">${[...bits].map((c, i) => c === '1' ? `<rect x="${i % 5}" y="${Math.floor(i / 5)}" width="1" height="1"/>` : '').join('')}</svg>`;
export const ITEMS = [
  {label: 'Weapon Workbench', href: './workbench/', icon: px('0111011111111100100001000'), help: 'Demo. Swap parts, finishes and wear on AK rifles. Presets, stats, photo mode.'},
  {label: 'Operator Modder', href: './operator/', icon: px('0111001110111110101001010'), help: 'Demo. Dress and pose the Base Operator. Hero poses, idles, colour zones.'},
  {label: 'Asset Viewer', href: './viewer/', icon: px('1111110001101011000111111'), help: 'Tool. Inspect any registered model against its triangle budget and licence.'},
  {label: 'Game Design Doc', href: './docs/game-design-master-doc.html', icon: px('1111110001111111000111111'), help: 'In-universe one-pager: pillars, features, moodboard, status.'},
  {label: 'Master Roadmap', href: './docs/master-roadmap.html', icon: px('1000001000110001101111111'), help: 'Work packets sized for $20 AI plans, dependencies and exit gates.'},
  {label: 'Moodboard', href: './docs/game-design-master-doc.html#moodboard', icon: px('1010101010101010101010101'), help: 'Art direction: character sheets, keyframes, palette.'},
  {label: 'Sound', action: 'sound', icon: px('0010001110111110011100100'), help: 'Toggle the background music (shared across all demos).'},
  {label: 'About', action: 'about', icon: px('0010000000001000010000100'), help: 'Version, source repository, credits.'},
  {label: 'AVDN Projects', href: 'https://vincentdenil.com/projects/', icon: px('0010001110101010010001110'), help: 'Back to vincentdenil.com/projects (outbound link).'},
];
