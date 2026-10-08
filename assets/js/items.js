// The index entries (the Weapon Workbench is not listed: the phone lies on it). `href` are relative so the site works under any base path (GitHub Pages project site).
// 5x5 1-bit icons as inline SVG data (no image files).
const px = bits =>
  `<svg viewBox="0 0 5 5" width="12" height="12" shape-rendering="crispEdges" fill="currentColor">${[...bits].map((c, i) => (c === '1' ? `<rect x="${i % 5}" y="${Math.floor(i / 5)}" width="1" height="1"/>` : '')).join('')}</svg>`;
// The index: the five demos, a Dev tools folder (locked until tapped seven times; then it folds open to its tools), then
// the phone's own items. A folder has `children`; the rest are links (`href`) or actions.
export const DEV_TAPS = 7;
export const ITEMS = [
  {
    label: 'Weapon Modder',
    href: '../workbench/',
    icon: px('0111011111111100100001000'),
    help: 'Demo. Swap parts, finishes and wear on AK rifles. Presets, stats, photo mode.',
  },
  {
    label: 'Operator Modder',
    href: '../operator/',
    icon: px('0111001110111110101001010'),
    help: 'Demo. Recon, Base, Insurgent and Enforcer: dress, repaint and pose them, always armed. Hero poses, idles.',
  },
  {
    label: 'Top-down Shooter Tests',
    href: '../convoy/',
    icon: px('0000011110111111111101010'),
    help: 'Top-down missions in the RimWorld style: convoy ambush, compound assault, cave defence. Dress your squad, loot the army.',
  },
  {
    label: 'Rebel Band',
    href: '../band/',
    icon: px('0111001110001001111101010'),
    help: 'Test. Level your band from Village Infantry to 44 classes in heavy, medium and light builds, each with abilities. Every step needs stolen gear. Class tree included.',
  },
  {
    label: 'Overworld Map',
    href: '../map/?campaign',
    icon: px('0110011110111110111000100'),
    help: 'Campaign. March across the 2.5D island, fight encounters, bring equipment home and build your rebel band.',
  },
  {
    label: 'Inventory',
    href: '../inventory/',
    icon: px('1111110101111111010111111'),
    help: 'Test. A Tarkov-style grid inventory: your rebel deploys with 60 rounds in real magazines. Loot a fallen soldier and a supply cache, load loose rounds into magazines, swap magazines in the rifle.',
  },
  {
    label: 'Dev tools',
    folder: true,
    icon: px('1110010010111111000111111'),
    help: 'Tools and documents for building the game. Locked: keep tapping.',
    children: [
      {
        label: '3-D overworld demo',
        href: '../map/3d.html',
        icon: px('0010001110111110010001010'),
        help: 'Demo. The earlier fully 3-D map style, retained for comparison. The campaign uses the 2.5D map.',
      },
      {
        label: 'Equipment Wiki',
        href: '../wiki/',
        icon: px('1111110101111111010111111'),
        help: 'Reference. Every lootable item the game will need: weapons, ammo, parts, armour, rigs, meds, barter goods. Placeholder data from tarkov.dev.',
      },
      {
        label: 'Asset Viewer',
        href: '../viewer/',
        icon: px('1111110001101011000111111'),
        help: 'Tool. Inspect any registered model against its triangle budget and licence.',
      },
      {
        label: 'Game Design Doc',
        href: '../docs/game-design-master-doc.html',
        icon: px('1111110001111111000111111'),
        help: 'In-universe one-pager: pillars, features, moodboard, status.',
      },
      {
        label: 'Moodboard',
        href: '../docs/game-design-master-doc.html#moodboard',
        icon: px('1010101010101010101010101'),
        help: 'Art direction: character sheets, keyframes, palette.',
      },
      {
        label: 'Advanced animations',
        href: '../intro/advanced.html',
        icon: px('1111101010111110101011111'),
        help: 'Experiment. Hands take a part off the rifle, set it on the bench and fit another.',
      },
      {
        label: 'Art Style Lab',
        href: '../operator/?lab#weapon=ak74m&pose=hero',
        icon: px('1110011010100100110001110'),
        help: 'Try art styles and shaders on the operator: toon, ink, clay, Nokia LCD, PS1, night vision.',
      },
      {
        label: 'Master Roadmap',
        href: '../docs/master-roadmap.html',
        icon: px('1000001000110001101111111'),
        help: 'Work packets sized for $20 AI plans, dependencies and exit gates.',
      },
    ],
  },
  {label: 'Sound', action: 'sound', icon: px('0010001110111110011100100'), help: 'Toggle the background music (shared across all demos).'},
  {label: 'About', action: 'about', icon: px('0010000000001000010000100'), help: 'Version and source repository.'},
  {
    label: 'AVDN Projects',
    href: 'https://vincentdenil.com/projects/',
    icon: px('0010001110101010010001110'),
    help: 'Back to vincentdenil.com/projects (outbound link).',
  },
];
