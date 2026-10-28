import type { AvatarConfig } from '../../profiles/types';

// Avatar dessiné en SVG (pas de photo) : chaque partie est un indice dans les listes ci-dessous.

export const SKINS = ['#F5D3B3', '#E0AC7E', '#B97A4E', '#7A4B2E'];
export const HAIR_COLORS = ['#2E1E14', '#7A4A24', '#E3C16F', '#B8B8B8', '#C2452D'];
export const AVATAR_PARTS = {
  hair: ['Rasé', 'Court', 'Hérissé', 'Long', 'Chignon'],
  facialHair: ['Aucune', 'Moustache', 'Barbe', 'Bouc'],
  glasses: ['Aucune', 'Rondes', 'Carrées', 'Soleil'],
  hat: ['Aucun', 'Casquette', 'Bonnet', 'Chapeau', 'Couronne'],
} as const;

export const DEFAULT_AVATAR: AvatarConfig = { skin: 1, hair: 1, hairColor: 0, facialHair: 0, glasses: 0, hat: 0 };

export function randomAvatar(rng: () => number = Math.random): AvatarConfig {
  const pick = (n: number) => Math.floor(rng() * n);
  return {
    skin: pick(SKINS.length),
    hair: pick(AVATAR_PARTS.hair.length),
    hairColor: pick(HAIR_COLORS.length),
    facialHair: rng() < 0.5 ? 0 : pick(AVATAR_PARTS.facialHair.length),
    glasses: rng() < 0.5 ? 0 : pick(AVATAR_PARTS.glasses.length),
    hat: rng() < 0.5 ? 0 : pick(AVATAR_PARTS.hat.length),
  };
}

const INK = '#1a1410';

function HairBack({ style, color }: { style: number; color: string }) {
  if (style !== 3) return null;
  return <path d="M25,46 Q25,20 50,20 Q75,20 75,46 L78,80 Q50,86 22,80 Z" fill={color} />;
}

function HairFront({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 1:
      return <path d="M26,46 Q26,22 50,22 Q74,22 74,46 Q66,33 50,33 Q34,33 26,46 Z" fill={color} />;
    case 2:
      return <path d="M26,45 L29,25 L37,31 L42,18 L50,28 L57,17 L63,30 L71,24 L74,45 Q62,33 50,33 Q38,33 26,45 Z" fill={color} />;
    case 3:
      return <path d="M26,46 Q27,21 50,21 Q73,21 74,46 Q64,31 44,34 Q33,37 26,46 Z" fill={color} />;
    case 4:
      return (
        <>
          <circle cx="50" cy="17" r="9" fill={color} />
          <path d="M26,46 Q26,22 50,22 Q74,22 74,46 Q66,33 50,33 Q34,33 26,46 Z" fill={color} />
        </>
      );
    default:
      return null;
  }
}

function FacialHair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 1:
      return <path d="M39,59 Q44,54 50,57 Q56,54 61,59 Q56,62 50,60 Q44,62 39,59 Z" fill={color} />;
    case 2:
      return <path d="M26,50 Q27,77 50,78 Q73,77 74,50 Q71,63 61,62 Q50,57 39,62 Q29,63 26,50 Z" fill={color} />;
    case 3:
      return <path d="M44,64 Q50,77 56,64 Q50,68 44,64 Z" fill={color} />;
    default:
      return null;
  }
}

function Glasses({ style }: { style: number }) {
  const frame = { fill: 'none', stroke: INK, strokeWidth: 2 } as const;
  switch (style) {
    case 1:
      return (
        <g {...frame}>
          <circle cx="41" cy="50" r="6.5" />
          <circle cx="59" cy="50" r="6.5" />
          <path d="M47.5,50 L52.5,50 M34.5,49 L27,47 M65.5,49 L73,47" />
        </g>
      );
    case 2:
      return (
        <g {...frame}>
          <rect x="33" y="44.5" width="15" height="11" rx="2" />
          <rect x="52" y="44.5" width="15" height="11" rx="2" />
          <path d="M48,49 L52,49 M33,48 L27,46 M67,48 L73,46" />
        </g>
      );
    case 3:
      return (
        <g>
          <path d="M32,45 L48,45 L47,53 Q41,58 34,53 Z M52,45 L68,45 L66,53 Q59,58 53,53 Z" fill={INK} />
          <path d="M48,46 L52,46 M32,46 L27,45 M68,46 L73,45" stroke={INK} strokeWidth="2" />
          <path d="M35,47 L39,47 M55,47 L59,47" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ style }: { style: number }) {
  switch (style) {
    case 1:
      return (
        <g fill="#D94141">
          <path d="M25,40 Q25,16 50,16 Q75,16 75,40 Z" />
          <path d="M50,37 Q77,35 88,42 Q75,45 50,42 Z" fill="#A82E2E" />
          <circle cx="50" cy="17" r="2.5" fill="#A82E2E" />
        </g>
      );
    case 2:
      return (
        <g>
          <path d="M24,42 Q24,12 50,12 Q76,12 76,42 Z" fill="#3D7BD9" />
          <rect x="23" y="35" width="54" height="10" rx="5" fill="#2C5DA8" />
          <circle cx="50" cy="11" r="6" fill="#F4F3EC" />
        </g>
      );
    case 3:
      return (
        <g>
          <ellipse cx="50" cy="36" rx="35" ry="6" fill="#5A381C" />
          <path d="M32,36 Q31,13 50,15 Q69,13 68,36 Z" fill="#6B4423" />
          <rect x="32" y="29" width="36" height="5" fill="#2E1E14" />
        </g>
      );
    case 4:
      return (
        <g>
          <path d="M30,35 L29,15 L40,25 L50,11 L60,25 L71,15 L70,35 Z" fill="#E6C873" stroke="#A88A3A" strokeWidth="1.5" />
          <circle cx="50" cy="29" r="3" fill="#D94141" />
          <circle cx="38" cy="30" r="2" fill="#3D7BD9" />
          <circle cx="62" cy="30" r="2" fill="#3D7BD9" />
        </g>
      );
    default:
      return null;
  }
}

interface Props {
  avatar: AvatarConfig;
  color: string;
  size?: number;
  /** Profil supprimé : silhouette neutre. */
  anonymous?: boolean;
}

export function Avatar({ avatar, color, size = 64, anonymous = false }: Props) {
  if (anonymous) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="avatar">
        <circle cx="50" cy="50" r="50" fill="#2a3a30" />
        <circle cx="50" cy="44" r="18" fill="#4a5a50" />
        <path d="M18,100 Q20,70 50,70 Q80,70 82,100 Z" fill="#4a5a50" />
      </svg>
    );
  }
  const skin = SKINS[avatar.skin] ?? SKINS[0]!;
  const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0]!;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="avatar">
      <defs>
        <clipPath id="avatar-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#avatar-clip)">
        <rect width="100" height="100" fill={color} />
        <HairBack style={avatar.hair} color={hair} />
        <path d="M16,104 Q18,78 50,78 Q82,78 84,104 Z" fill="#1E2A23" />
        <rect x="43" y="66" width="14" height="14" fill={skin} />
        <circle cx="25.5" cy="51" r="4.5" fill={skin} />
        <circle cx="74.5" cy="51" r="4.5" fill={skin} />
        <ellipse cx="50" cy="49" rx="24" ry="26" fill={skin} />
        <FacialHair style={avatar.facialHair} color={hair} />
        <circle cx="41" cy="50" r="2.6" fill={INK} />
        <circle cx="59" cy="50" r="2.6" fill={INK} />
        <path d="M43,63 Q50,69 57,63" fill="none" stroke={avatar.facialHair === 2 ? '#F4D2C0' : INK} strokeWidth="2.4" strokeLinecap="round" />
        <HairFront style={avatar.hair} color={hair} />
        <Glasses style={avatar.glasses} />
        <Hat style={avatar.hat} />
      </g>
    </svg>
  );
}
