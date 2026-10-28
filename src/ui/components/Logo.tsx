import './Logo.css';

/** Une petite cible qui remplace chaque « O ». */
function Board() {
  return (
    <svg className="logo-board" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke="var(--green-bright)" strokeWidth="3" />
      <circle cx="20" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="1.8" fill="var(--danger)" />
    </svg>
  );
}

/** La fléchette qui remplace le tiret. */
function Dart() {
  return (
    <svg className="logo-dart" viewBox="0 0 64 20" aria-hidden="true">
      <path d="M2 10 L14 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 7 L34 7 L38 10 L34 13 L14 13 Z" fill="currentColor" />
      <path d="M38 10 L50 10" stroke="var(--green-bright)" strokeWidth="3" />
      <path d="M50 10 L62 3 L60 10 L62 17 Z" fill="var(--green-bright)" />
    </svg>
  );
}

export function Logo({ size = 72 }: { size?: number }) {
  return (
    <h1 className="logo" style={{ fontSize: size }} aria-label="TREM-DRAGOOON">
      TREM
      <Dart />
      DRAG
      <Board />
      <Board />
      <Board />N
    </h1>
  );
}
