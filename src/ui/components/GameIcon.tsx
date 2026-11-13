import type { Category, IconName } from '../../extra-games/catalog';
import './GameIcon.css';

/** Une couleur par catégorie, prise dans la palette de l'appli (vert, or, bleu-vert, cuivre, rouge). */
const COLORS: Record<Category, [string, string, string]> = {
  classic: ['#43b673', '#1e5535', '#fff'],
  quick: ['#f0d68a', '#b08d3c', '#1a1a12'],
  precision: ['#4aa5a0', '#1b4a47', '#fff'],
  team: ['#e0965a', '#8a4a22', '#fff'],
  house: ['#d0605c', '#5a2326', '#fff'],
};

const text = (t: string, size: number) => (c: string) => (
  <text x="16" y={16 + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={900} fontFamily="inherit" fill={c}>
    {t}
  </text>
);

const GLYPHS: Record<IconName, (c: string) => JSX.Element> = {
  t501: text('501', 13),
  cricket: (c) => (
    <>
      <circle cx="16" cy="16" r="11" fill="none" stroke={c} strokeWidth="2.4" />
      <circle cx="16" cy="16" r="6" fill="none" stroke={c} strokeWidth="2.4" />
      <circle cx="16" cy="16" r="2.2" fill={c} />
    </>
  ),
  clock: (c) => (
    <>
      <circle cx="16" cy="16" r="11" fill="none" stroke={c} strokeWidth="2.6" />
      <path d="M16 9 V16 L21 19" stroke={c} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  dice: (c) => (
    <>
      <rect x="6" y="6" width="20" height="20" rx="4.5" fill="none" stroke={c} strokeWidth="2.6" />
      <circle cx="11.5" cy="11.5" r="2" fill={c} />
      <circle cx="16" cy="16" r="2" fill={c} />
      <circle cx="20.5" cy="20.5" r="2" fill={c} />
    </>
  ),
  plus: (c) => <path d="M16 7 V25 M7 16 H25" stroke={c} strokeWidth="3.4" strokeLinecap="round" />,
  grid: (c) => (
    <>
      <rect x="6" y="6" width="8.5" height="8.5" rx="2.2" fill={c} />
      <rect x="17.5" y="6" width="8.5" height="8.5" rx="2.2" fill={c} />
      <rect x="6" y="17.5" width="8.5" height="8.5" rx="2.2" fill={c} />
      <rect x="17.5" y="17.5" width="8.5" height="8.5" rx="2.2" fill={c} />
    </>
  ),
  up: (c) => <path d="M16 26 V7 M8 14 L16 6 L24 14" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  down: (c) => (
    <path d="M16 6 V25 M8 18 L16 26 L24 18" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  half: (c) => (
    <>
      <circle cx="16" cy="16" r="11" fill="none" stroke={c} strokeWidth="2.6" />
      <path d="M16 5 A11 11 0 0 1 16 27Z" fill={c} />
    </>
  ),
  killer: (c) => <path d="M7 25 L21 11 M17 7 L25 15" stroke={c} strokeWidth="3.2" strokeLinecap="round" fill="none" />,
  bat: (c) => (
    <>
      <path d="M8 24 L22 10" stroke={c} strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="23.5" cy="22.5" r="3.4" fill={c} />
    </>
  ),
  flag: (c) => <path d="M11 27 V6 L24 11 L11 16" stroke={c} strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />,
  heart: (c) => <path d="M16 26 C7 19 5 14 8 10 C11 6.5 15 8 16 11 C17 8 21 6.5 24 10 C27 14 25 19 16 26Z" fill={c} />,
  crown: (c) => <path d="M6 23 L7.5 11 L12 16 L16 8 L20 16 L24.5 11 L26 23Z" fill={c} />,
  bomb: (c) => (
    <>
      <circle cx="14" cy="18" r="8" fill={c} />
      <path d="M19 11 Q22 6 26 7" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
  pyramid: (c) => (
    <>
      <path d="M16 6 L27 25 H5Z" fill="none" stroke={c} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M9 18.5 H23 M12.5 12.5 H19.5" stroke={c} strokeWidth="2.2" />
    </>
  ),
  chest: (c) => (
    <>
      <rect x="6" y="12" width="20" height="13" rx="2" fill="none" stroke={c} strokeWidth="2.6" />
      <path d="M6 16 H26 M8 12 Q16 4 24 12" stroke={c} strokeWidth="2.4" fill="none" />
      <rect x="14" y="15" width="4" height="5" rx="1" fill={c} />
    </>
  ),
  shield: (c) => (
    <path d="M16 5 L25 9 V16 C25 21 21 25 16 27 C11 25 7 21 7 16 V9Z" fill="none" stroke={c} strokeWidth="2.6" strokeLinejoin="round" />
  ),
  doc: (c) => (
    <>
      <rect x="8" y="5" width="16" height="22" rx="3" fill="none" stroke={c} strokeWidth="2.6" />
      <path d="M12 12 H20 M12 17 H20 M12 22 H17" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  tri: (c) => <path d="M16 6 L27 25 H5Z" fill={c} />,
  t27: text('27', 19),
  t21: text('21', 19),
  t5: text('÷5', 17),
  t6: text('6', 25),
  t1: text('1', 25),
  tD: text('D/T', 13),
};

/** Icône carrée arrondie d'un jeu du catalogue, façon appli de téléphone. */
export function GameIcon({ def, size = 64 }: { def: { icon: IconName; categories: Category[] }; size?: number }) {
  const [a, b, c] = COLORS[def.categories[0] ?? 'classic'];
  return (
    <span
      className="game-icon"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${a}, ${b})`,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32">{GLYPHS[def.icon](c)}</svg>
    </span>
  );
}
