import type { ExtraGameDef } from '../../extra-games/catalog';
import { playersLabel } from '../../extra-games/catalog';
import { GameIcon } from './GameIcon';
import './RulesDialog.css';

/** Règles d'un des « Autres jeux » : l'explication entre amis, puis quatre lignes fixes. */
export function RulesDialog({ def, onClose, onPlay }: { def: ExtraGameDef; onClose: () => void; onPlay?: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog rules-dialog" role="dialog" aria-label={`Règles de ${def.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="rules-head">
          <GameIcon def={def} size={60} />
          <div>
            <div className="rules-name">{def.name}</div>
            <div className="rules-meta">
              {playersLabel(def)} · {def.teams ? 'individuel ou équipes' : 'individuel'}
            </div>
          </div>
        </div>
        <p className="rules-bubble">« {def.bubble} »</p>
        <dl className="rules-lines">
          <dt>But</dt>
          <dd>{def.rules.goal}</dd>
          <dt>Points</dt>
          <dd>{def.rules.points}</dd>
          <dt>Victoire</dt>
          <dd>{def.rules.win}</dd>
          <dt>Attention</dt>
          <dd>{def.rules.warning}</dd>
        </dl>
        <div className="dialog-actions">
          <button onClick={onClose}>Fermer</button>
          {onPlay && (
            <button className="btn-gold" onClick={onPlay}>
              Jouer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
