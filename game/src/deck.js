// deck.js — the Lantern Route deck: suits, cards, and a seeded shuffle.
//
// Four suits, told apart by colour AND shape, never by text alone:
//   moon    — gold crescent      lantern — amber flame
//   star    — violet five-point  key     — teal key
// Values run 1-9 in every suit. Three suitless special cards bend the rules:
//   Storm (0) cancels the beacon bonus for both couriers this round,
//   Lantern Keeper (5) mends 2 oil for the courier who plays it,
//   Shortcut (4) lets its courier draw an extra card after the round.

export const SUITS = {
  moon:    { name: 'Moon',    color: '#f5c542', dark: '#8a6d1d', glyph: 'moon' },
  star:    { name: 'Star',    color: '#b48cff', dark: '#5b3a9e', glyph: 'star' },
  lantern: { name: 'Lantern', color: '#ff9a3c', dark: '#8a4d12', glyph: 'lantern' },
  key:     { name: 'Key',     color: '#3fd2c0', dark: '#1d6b60', glyph: 'key' },
};

export const SUIT_KEYS = Object.keys(SUITS);

export const SPECIALS = {
  storm:    { id: 'storm',    name: 'Storm',          value: 0, text: 'Calms the beacon: no beacon bonus this round.' },
  keeper:   { id: 'keeper',   name: 'Lantern Keeper', value: 5, text: 'Mends 2 oil for the courier who plays it.' },
  shortcut: { id: 'shortcut', name: 'Shortcut',       value: 4, text: 'Draw an extra card after this round.' },
};

// A tiny seeded RNG (mulberry32) so screenshot states are reproducible.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDeck() {
  const deck = [];
  for (const suit of SUIT_KEYS) {
    for (let value = 1; value <= 9; value++) {
      deck.push({ kind: 'route', suit, value, id: `${suit}-${value}` });
    }
  }
  for (const special of Object.values(SPECIALS)) {
    deck.push({ kind: 'special', suit: null, special: special.id, value: special.value, id: special.id });
  }
  return deck;
}

export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function cardLabel(card) {
  if (card.kind === 'special') return SPECIALS[card.special].name;
  return `${SUITS[card.suit].name} ${card.value}`;
}

// Effective strength of a card this round: +3 when its suit matches the
// beacon, +2 when its suit matches the previous round's winning suit.
// A Storm on either side calms the beacon for both couriers.
export function effectiveValue(card, beaconSuit, chainSuit, stormOut) {
  let total = card.value;
  if (card.suit && !stormOut) {
    if (card.suit === beaconSuit) total += 3;
    if (chainSuit && card.suit === chainSuit) total += 2;
  }
  return total;
}
