// shots.js — deterministic states for the maker's screenshots.
//
// ?shot=title | play | win | loss (with &seed=N) stages a fixed table straight
// from the game's own code, so each screenshot is a real render of the game:
// the title screen, a mid-round table, a win screen and a loss screen.
// Normal play never reads this module's states.

import { buildDeck, shuffle, makeRng } from './deck.js';

export function freshState(seed) {
  const rng = makeRng(seed);
  const deck = shuffle(buildDeck(), rng);
  return {
    screen: 'title',
    round: 1,
    maxOil: 20,
    deck,
    player: { hand: [], lanterns: 0, oil: 20 },
    ai: { hand: [], lanterns: 0, oil: 20 },
    beacon: 'lantern',
    chainSuit: null,
    playerPlayed: null,
    aiPlayed: null,
    revealProgress: 0,
    playProgress: 0,
    banner: null,
    bannerSub: null,
    bannerAge: 0,
    winner: null,
    handRects: [],
    rng,
  };
}

export function applyShot(state, kind, seed) {
  const rng = makeRng(seed);
  if (kind === 'title') {
    state.screen = 'title';
    return;
  }
  if (kind === 'play') {
    // A mid-round table: both couriers mid-duel, cards on the table, the
    // beacon lit, scores and oil visible on both sides.
    const deck = shuffle(buildDeck(), rng);
    state.deck = deck;
    state.player.hand = deck.slice(0, 5);
    state.ai.hand = deck.slice(5, 10);
    state.deck = deck.slice(10);
    state.player.lanterns = 19;
    state.player.oil = 16;
    state.ai.lanterns = 9;
    state.ai.oil = 12;
    state.round = 4;
    state.beacon = 'lantern';
    state.chainSuit = 'moon';
    state.playerPlayed = { kind: 'route', suit: 'lantern', value: 7, id: 'lantern-7' };
    state.aiPlayed = { kind: 'route', suit: 'moon', value: 6, id: 'moon-6' };
    state.revealProgress = 1;
    state.playProgress = 1;
    state.banner = 'YOU WIN THE ROUND +7';
    state.bannerSub = 'Lantern 7 + beacon 3 = 10 beats Moon 6 + chain 2 = 8';
    state.bannerAge = 500;
    state.screen = 'play';
    return;
  }
  if (kind === 'win' || kind === 'loss') {
    const deck = shuffle(buildDeck(), rng);
    state.deck = deck;
    state.player.hand = deck.slice(0, 5);
    state.ai.hand = deck.slice(5, 10);
    state.deck = deck.slice(10);
    state.round = 9;
    if (kind === 'win') {
      state.player.lanterns = 30;
      state.player.oil = 11;
      state.ai.lanterns = 21;
      state.ai.oil = 6;
      state.winner = 'player';
    } else {
      state.player.lanterns = 17;
      state.player.oil = 0;
      state.ai.lanterns = 24;
      state.ai.oil = 13;
      state.winner = 'ai';
    }
    state.screen = 'end';
  }
}
