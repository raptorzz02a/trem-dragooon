import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { formatDart } from '../../game-engine/darts';
import { ScorePad } from '../components/ScorePad';
import { MODE_VIEWS } from '../modes';
import { useTapGuard } from '../useTapGuard';
import { Avatar } from '../components/Avatar';
import { lightEffectFor, lightEnabled, sendLight } from '../../light/light';
import { useDartSense } from '../../sense/useDartSense';
import { extraGame, isExtraMode } from '../../extra-games/catalog';
import { RulesDialog } from '../components/RulesDialog';
import './Game.css';
/** Écran de jeu commun à tous les modes ; ce qui diffère est fourni par la vue du mode. */
export function Game(props) {
    const { state, players, settings } = props;
    const view = MODE_VIEWS[state.config.mode];
    const sides = state.config.sides;
    const nameOf = (id) => players.find((p) => p.id === id)?.name ?? '?';
    const sideName = (i) => (state.config.teamMode ? sides[i].name : nameOf(sides[i].playerIds[0]));
    const ctx = { state, nameOf, sideName };
    const avatarOf = (id, size) => {
        const p = props.profiles?.find((x) => x.id === id);
        return p && !p.deleted ? _jsx(Avatar, { avatar: p.avatar, color: p.color, size: size }) : null;
    };
    const current = state.current;
    const myTurn = props.canPlay ?? (!props.myId || current?.playerId === props.myId);
    /** Le joueur actif tient l'appareil (sinon c'est l'hôte qui saisit pour lui, ou un autre qui attend). */
    const mine = !props.myId || current?.playerId === props.myId;
    const canUndo = props.canUndo ?? props.session.events.length > 0;
    const guard = useTapGuard(400);
    // Caméra Dart Sense (borne) : saisit les fléchettes du joueur dont c'est le tour sur cet appareil.
    const sense = useDartSense(state, myTurn, props.onDart);
    // Ampoule de la borne : effet sur triple, Bull, double, raté, bust et victoire.
    const lastState = useRef(null);
    useEffect(() => {
        const prev = lastState.current;
        lastState.current = state;
        if (!lightEnabled())
            return;
        const effect = lightEffectFor(prev, state, (i) => {
            const side = sides[i];
            return side.color ?? props.profiles?.find((p) => p.id === side.playerIds[0])?.color ?? '#FFD24D';
        });
        if (effect)
            void sendLight(effect);
    }, [state]);
    // Quand le tour avance tout seul (3e fléchette, bust, parcours fini), la volée terminée reste affichée
    // quelques secondes avant de passer au joueur suivant ; puis vient l'écran de transition.
    // Après « Fin de tour », confirmé exprès, on passe directement à la transition. Une annulation efface tout.
    const [held, setHeld] = useState(null);
    const [transition, setTransition] = useState(null);
    const lastTurnIndex = useRef(current?.turnIndex ?? -1);
    useEffect(() => {
        const index = current?.turnIndex ?? -1;
        const last = state.turns.at(-1) ?? null;
        if (current && index > lastTurnIndex.current && last) {
            if (last.outcome !== 'ended' && settings.holdMs > 0) {
                setHeld(last);
                setTransition(null);
            }
            else if (settings.animations)
                setTransition(last);
        }
        else if (!current || index < lastTurnIndex.current) {
            setHeld(null);
            setTransition(null);
        }
        lastTurnIndex.current = index;
    }, [current, state.turns, settings.animations, settings.holdMs]);
    const release = () => {
        if (!held)
            return;
        setHeld(null);
        if (settings.animations)
            setTransition(held);
    };
    useEffect(() => {
        if (!held)
            return;
        const timer = setTimeout(release, settings.holdMs);
        return () => clearTimeout(timer);
    }, [held, settings.holdMs, settings.animations]);
    useEffect(() => {
        if (!transition)
            return;
        const timer = setTimeout(() => setTransition(null), settings.transitionMs);
        return () => clearTimeout(timer);
    }, [transition, settings.transitionMs]);
    // « Fin de tour » demande un second appui pour éviter une fin de volée accidentelle.
    const [confirmEnd, setConfirmEnd] = useState(false);
    useEffect(() => {
        if (!confirmEnd)
            return;
        const timer = setTimeout(() => setConfirmEnd(false), 2500);
        return () => clearTimeout(timer);
    }, [confirmEnd]);
    useEffect(() => setConfirmEnd(false), [current?.turnIndex]);
    const [confirmQuit, setConfirmQuit] = useState(false);
    const [confirmFinish, setConfirmFinish] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const extraDef = isExtraMode(state.config.mode) ? extraGame(state.config.mode) : null;
    const thrown = props.session.events.some((e) => e.type === 'dart');
    const activeSide = current ? sides[current.sideIndex] : null;
    const hero = current ? view.hero(ctx, current.sideIndex) : null;
    // Carte du joueur : la volée qui vient de se terminer pendant la pause, sinon la volée en cours.
    const shown = held ?? current;
    const shownSide = shown ? sides[shown.sideIndex] : null;
    const shownHero = shown ? view.hero(ctx, shown.sideIndex) : null;
    const heldResult = held ? view.turnResult(held, ctx) : null;
    const round = (current?.round ?? state.turns.at(-1)?.round ?? 0) + 1;
    const result = transition ? view.turnResult(transition, ctx) : null;
    return (_jsxs("div", { className: `screen game game-${state.config.mode}`, children: [_jsxs("header", { className: "game-top", children: [_jsxs("span", { className: "game-title", children: [view.title(ctx), state.config.teamMode ? ' · Équipes' : ''] }), _jsxs("span", { className: "game-round", children: ["Manche ", round] }), sense.enabled && (_jsxs("button", { className: `game-sense sense-${sense.active ? sense.status : 'paused'}`, onClick: sense.toggle, children: ["\uD83D\uDCF7 ", !sense.active ? 'Saisie manuelle' : sense.status === 'ok' ? 'Caméra' : sense.status === 'cible' ? 'Cible non repérée' : 'Caméra éteinte'] })), props.onFinish && current && (_jsx("button", { className: "game-finish btn-gold", disabled: !thrown, onClick: () => setConfirmFinish(true), children: "Terminer l\u2019entra\u00EEnement" })), extraDef && (_jsx("button", { className: "game-rules", onClick: () => setShowRules(true), children: "? R\u00E8gles" })), _jsx("button", { className: "game-quit", onClick: () => setConfirmQuit(true), children: "Quitter" })] }), showRules && extraDef && _jsx(RulesDialog, { def: extraDef, onClose: () => setShowRules(false) }), _jsxs("div", { className: "game-body", children: [_jsxs("section", { className: "game-left", children: [current && shown && shownSide && shownHero && (_jsxs("div", { className: `active-card${held ? ' held' : ''}`, style: { borderColor: shownSide.color ?? 'var(--gold)' }, children: [_jsxs("div", { className: "active-head", children: [avatarOf(shown.playerId, 72), _jsxs("div", { className: "active-who", children: [_jsx("div", { className: "label", children: held ? 'Volée terminée' : 'Joueur actif' }), _jsx("div", { className: "active-name", children: nameOf(shown.playerId) }), state.config.teamMode && (_jsx("div", { className: "active-team", style: { color: shownSide.color }, children: shownSide.name }))] }), !held && view.heroAside?.(ctx), _jsxs("div", { className: "active-remaining-box", children: [_jsx("div", { className: "label", children: shownHero.label }), _jsx("div", { className: "active-remaining", children: shownHero.value })] })] }), heldResult ? (_jsx("div", { className: `active-checkout held-result ${heldResult.bad ? 'bust' : ''}`, children: heldResult.text })) : (!view.heroAside && _jsx("div", { className: "active-checkout", children: view.hint(ctx) ?? ' ' })), _jsxs("div", { className: "volley", children: [[0, 1, 2].map((i) => {
                                                const d = shown.darts[i];
                                                return (_jsx("div", { className: `volley-slot ${d ? 'filled' : ''} ${d && d.points === 0 ? 'zero' : ''}`, children: d ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "volley-dart", children: view.dartLabel?.(d, ctx) ?? formatDart(d.dart) }), _jsx("span", { className: "volley-points", children: view.dartNote(d, ctx) })] })) : (_jsx("span", { className: "volley-empty", children: i + 1 })) }, i));
                                            }), _jsxs("div", { className: "volley-total", children: [_jsx("span", { className: "label", children: "Vol\u00E9e" }), view.volleyTotal(shown.darts, ctx)] })] }), _jsxs("div", { className: "game-actions", children: [_jsx("button", { disabled: !canUndo, onClick: guard(props.onUndo), children: "\u21B6 Annuler la fl\u00E9chette" }), held ? (_jsxs("button", { className: "btn-gold held-next", onClick: guard(release), children: ["Joueur suivant \u2192", _jsx("span", { className: "held-bar", style: { animationDuration: `${settings.holdMs}ms` } }, held.turnIndex)] })) : (_jsx("button", { disabled: !myTurn, className: confirmEnd ? 'btn-gold' : 'btn-primary', onClick: guard(() => {
                                                    if (confirmEnd)
                                                        props.onEndTurn();
                                                    else
                                                        setConfirmEnd(true);
                                                }), children: confirmEnd ? 'Confirmer la fin du tour' : 'Fin de tour' }))] })] })), _jsx("div", { className: "game-board", children: view.board(ctx) })] }), _jsxs("section", { className: "game-right", children: [view.input ? (view.input(ctx, props.onDart, !current || !myTurn || held !== null || transition !== null)) : (_jsx(ScorePad, { disabled: !current || !myTurn || held !== null || transition !== null, onDart: props.onDart, ...view.pad(ctx) })), current && !myTurn && _jsxs("div", { className: "game-wait", children: ["Au tour de ", nameOf(current.playerId), "\u2026"] })] })] }), transition && result && current && activeSide && hero && (_jsx("div", { className: "overlay transition", onClick: () => setTransition(null), children: _jsxs("div", { className: "transition-card", style: { borderColor: activeSide.color ?? 'var(--gold)' }, children: [_jsx("div", { className: `transition-result ${result.bad ? 'bust' : ''}`, children: result.text }), avatarOf(current.playerId, 130), _jsx("div", { className: "label", children: mine ? 'À toi de jouer' : 'Au tour de' }), _jsx("div", { className: "transition-name", children: nameOf(current.playerId) }), state.config.teamMode && (_jsx("div", { className: "transition-team", style: { color: activeSide.color }, children: activeSide.name })), _jsxs("div", { className: "transition-info", children: ["3 fl\u00E9chettes \u00B7 ", hero.label.toLowerCase(), " ", _jsx("strong", { children: hero.value })] }), canUndo && (_jsx("button", { onClick: (e) => {
                                e.stopPropagation();
                                setTransition(null);
                                props.onUndo();
                            }, children: "\u21B6 Annuler la derni\u00E8re fl\u00E9chette" }))] }) })), state.status === 'finished' && (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog end", children: [_jsx("div", { className: "label", children: view.winLabel?.(ctx) ?? (state.winners.length > 1 ? 'Égalité' : 'Victoire') }), _jsx("div", { className: "end-winner", children: state.winners.map(sideName).join(' et ') }), view.endSummary?.(ctx), _jsx("ol", { className: "end-ranking", children: state.ranking.map((r) => (_jsxs("li", { children: [_jsxs("span", { children: [r.rank, "."] }), _jsx("span", { className: "end-rank-name", children: sideName(r.sideIndex) }), _jsx("span", { children: view.rankValue(r, ctx) })] }, r.sideIndex))) }), props.endNote && _jsx("div", { className: "end-note", children: props.endNote }), _jsxs("div", { className: "dialog-actions", children: [canUndo && _jsx("button", { onClick: props.onUndo, children: "\u21B6 Annuler la derni\u00E8re fl\u00E9chette" }), _jsx("button", { onClick: props.onHome, children: "Accueil" }), props.onEditPlayers && (_jsx("button", { className: "btn-primary", onClick: props.onEditPlayers, children: props.editPlayersLabel ?? 'Modifier les joueurs' })), props.onRematch && (_jsx("button", { className: "btn-gold", onClick: props.onRematch, children: "Rejouer" }))] })] }) })), confirmFinish && current && props.onFinish && (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog", children: [_jsx("div", { children: "Terminer l\u2019entra\u00EEnement ? La partie sera enregistr\u00E9e dans les statistiques avec les points actuels." }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { onClick: () => setConfirmFinish(false), children: "Continuer \u00E0 lancer" }), _jsx("button", { className: "btn-gold", onClick: () => {
                                        setConfirmFinish(false);
                                        props.onFinish();
                                    }, children: "Terminer" })] })] }) })), confirmQuit && (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog", children: [_jsx("div", { children: props.quitMessage ?? 'Quitter la partie ? Elle sera enregistrée comme abandonnée.' }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { onClick: () => setConfirmQuit(false), children: "Continuer \u00E0 jouer" }), _jsx("button", { className: "btn-danger", onClick: props.onQuit, children: props.quitLabel ?? 'Quitter' })] })] }) }))] }));
}
