// ai.js — Mira the Night Owl, the rival courier.
//
// Her choices are readable and counterable: she saves her high cards when the
// beacon does not favour her, spends them when she is behind, mends her lamp
// when her oil runs low, and calms the beacon with a Storm when it would
// favour a suit she cannot answer. She never sees the player's card before
// she picks her own.

import { effectiveValue } from './deck.js';

export function chooseCard(hand, beaconSuit, chainSuit, ai, player) {
  const stormOut = false;
  const scored = hand.map((card, index) => ({
    card,
    index,
    strength: effectiveValue(card, beaconSuit, chainSuit, stormOut),
  }));

  const keeper = scored.find((s) => s.card.special === 'keeper');
  if (keeper && ai.oil <= 8) return keeper.index;

  const shortcut = scored.find((s) => s.card.special === 'shortcut');
  if (shortcut && hand.length <= 3) return shortcut.index;

  const storm = scored.find((s) => s.card.special === 'storm');
  const best = scored.reduce((a, b) => (b.strength > a.strength ? b : a), scored[0]);
  if (storm && best.strength <= 5 && !hand.some((c) => c.suit === beaconSuit)) {
    return storm.index;
  }

  // Behind on lanterns: spend the strongest card to catch up.
  if (ai.lanterns < player.lanterns) return best.index;

  // Ahead or level: spend the weakest card that still looks like a winner,
  // and keep the big cards for a round that matters.
  const winners = scored.filter((s) => s.strength >= 6).sort((a, b) => a.strength - b.strength);
  if (winners.length > 0) return winners[0].index;

  return scored.reduce((a, b) => (b.strength < a.strength ? b : a), scored[0]).index;
}
