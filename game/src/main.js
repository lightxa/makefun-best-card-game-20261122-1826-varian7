// main.js — Lantern Route: boot, the round loop, input and the screen flow.
//
// A round: a Beacon suit is lit, you play a card from your hand, Mira plays
// one of hers, both are revealed, and the stronger courier takes lanterns
// while the loser spills oil. First to 30 lanterns wins; a courier whose oil
// reaches 0 loses. When the deck runs out, the courier with more lanterns
// (then more oil) wins the night.

import { SUITS, SUIT_KEYS, SPECIALS, buildDeck, shuffle, makeRng, effectiveValue, cardLabel } from './deck.js';
import { chooseCard } from './ai.js';
import { VIEW_W, VIEW_H, drawBackground, drawHud, drawBeacon, drawPlayed, drawHands, drawTitle, drawEnd } from './render.js';
import { freshState, applyShot } from './shots.js';
import * as sfx from './audio.js';

const TARGET_LANTERNS = 30;
const HAND_SIZE = 5;
const MAX_HAND = 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shotKind = params.get('shot');
const seed = Number(params.get('seed') || '7') || 7;

let state = freshState(seed);
let hoverIndex = -1;
let resolving = false;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  canvas.style.width = `${VIEW_W}px`;
  canvas.style.height = `${VIEW_H}px`;
  const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  scale = fit;
  offsetX = (window.innerWidth - VIEW_W * fit) / 2;
  offsetY = (window.innerHeight - VIEW_H * fit) / 2;
  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${fit})`;
  canvas.style.transformOrigin = 'top left';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function announce(text) {
  statusEl.textContent = text;
}

function drawBeaconSuit(rng) {
  return SUIT_KEYS[Math.floor(rng() * SUIT_KEYS.length)];
}

function deal(state) {
  for (let i = 0; i < HAND_SIZE; i++) {
    if (state.deck.length) state.player.hand.push(state.deck.pop());
    if (state.deck.length) state.ai.hand.push(state.deck.pop());
  }
}

function startGame() {
  state = freshState((Date.now() % 2147483647) || 7);
  state.screen = 'play';
  deal(state);
  state.beacon = drawBeaconSuit(state.rng);
  announce(`Night shift begins. The beacon is ${SUITS[state.beacon].name}. Play a card.`);
  sfx.playDeal();
}

function drawUp(state, who, extra = 1) {
  for (let i = 0; i < extra; i++) {
    if (state.deck.length && who.hand.length < MAX_HAND) who.hand.push(state.deck.pop());
  }
}

function checkEnd(state) {
  const p = state.player;
  const a = state.ai;
  if (p.lanterns >= TARGET_LANTERNS || a.oil <= 0) return 'player';
  if (a.lanterns >= TARGET_LANTERNS || p.oil <= 0) return 'ai';
  if (state.deck.length === 0 && p.hand.length === 0 && a.hand.length === 0) {
    if (p.lanterns !== a.lanterns) return p.lanterns > a.lanterns ? 'player' : 'ai';
    if (p.oil !== a.oil) return p.oil > a.oil ? 'player' : 'ai';
    return 'draw';
  }
  return null;
}

function resolveRound() {
  const p = state.player;
  const a = state.ai;
  const stormOut = state.playerPlayed.special === 'storm' || state.aiPlayed.special === 'storm';
  const pVal = effectiveValue(state.playerPlayed, state.beacon, state.chainSuit, stormOut);
  const aVal = effectiveValue(state.aiPlayed, state.beacon, state.chainSuit, stormOut);

  let banner;
  let sub;
  if (pVal > aVal) {
    p.lanterns += state.playerPlayed.value;
    a.oil = Math.max(0, a.oil - (pVal - aVal));
    banner = `YOU WIN THE ROUND +${state.playerPlayed.value}`;
    sub = `${cardLabel(state.playerPlayed)} (${pVal}) beats ${cardLabel(state.aiPlayed)} (${aVal})`;
    state.chainSuit = state.playerPlayed.suit || state.chainSuit;
    sfx.playWinRound();
  } else if (aVal > pVal) {
    a.lanterns += state.aiPlayed.value;
    p.oil = Math.max(0, p.oil - (aVal - pVal));
    banner = `MIRA TAKES THE ROUND +${state.aiPlayed.value}`;
    sub = `${cardLabel(state.aiPlayed)} (${aVal}) beats ${cardLabel(state.playerPlayed)} (${pVal})`;
    state.chainSuit = state.aiPlayed.suit || state.chainSuit;
    sfx.playLoseRound();
  } else {
    p.lanterns += 1;
    a.lanterns += 1;
    banner = 'DEAD HEAT — +1 LANTERN EACH';
    sub = `Both couriers stood at ${pVal}`;
    sfx.playFlip();
  }
  if (stormOut) sub += ' • Storm calmed the beacon';

  // Specials settle after the round.
  for (const [who, card] of [[p, state.playerPlayed], [a, state.aiPlayed]]) {
    if (card.special === 'keeper') who.oil = Math.min(state.maxOil, who.oil + 2);
    if (card.special === 'shortcut') drawUp(state, who, 1);
  }

  state.banner = banner;
  state.bannerSub = sub;
  state.bannerAge = 0;
  announce(`${banner}. ${sub}. You hold ${p.lanterns} lanterns and ${p.oil} oil; Mira holds ${a.lanterns} lanterns and ${a.oil} oil.`);

  const winner = checkEnd(state);
  setTimeout(() => {
    if (winner) {
      state.winner = winner;
      state.screen = 'end';
      if (winner === 'player') sfx.playGameWin();
      else if (winner === 'ai') sfx.playGameLose();
      announce(winner === 'player' ? 'You win the night!' : winner === 'ai' ? 'Mira wins the night.' : 'A dead heat.');
      return;
    }
    state.playerPlayed = null;
    state.aiPlayed = null;
    state.banner = null;
    state.bannerSub = null;
    state.round += 1;
    state.beacon = drawBeaconSuit(state.rng);
    drawUp(state, p);
    drawUp(state, a);
    resolving = false;
    announce(`Round ${state.round}. The beacon is ${SUITS[state.beacon].name}. Play a card.`);
  }, 1900);
}

function playCard(index) {
  if (state.screen !== 'play' || resolving) return;
  if (index < 0 || index >= state.player.hand.length) return;
  sfx.ensureAudio();
  const card = state.player.hand.splice(index, 1)[0];
  const aiIndex = chooseCard(state.ai.hand, state.beacon, state.chainSuit, state.ai, state.player);
  const aiCard = state.ai.hand.splice(aiIndex, 1)[0];
  state.playerPlayed = card;
  state.aiPlayed = aiCard;
  state.playProgress = 0;
  state.revealProgress = 0;
  state.playStartedAt = performance.now();
  state.revealStartedAt = performance.now() + 450;
  resolving = true;
  sfx.playDeal();
  setTimeout(() => {
    sfx.playFlip();
    setTimeout(resolveRound, 650);
  }, 500);
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / (rect.width / VIEW_W),
    y: (event.clientY - rect.top) / (rect.height / VIEW_H),
  };
}

canvas.addEventListener('mousemove', (event) => {
  if (state.screen !== 'play') return;
  const { x, y } = canvasPoint(event);
  hoverIndex = -1;
  for (const r of state.handRects || []) {
    if (pointInRect(x, y, r)) hoverIndex = r.index;
  }
  canvas.style.cursor = hoverIndex >= 0 ? 'pointer' : 'default';
});

canvas.addEventListener('click', (event) => {
  sfx.ensureAudio();
  const { x, y } = canvasPoint(event);
  if (state.screen === 'title') {
    if (x >= VIEW_W / 2 - 190 && x <= VIEW_W / 2 + 190 && y >= 470 && y <= 532) startGame();
    return;
  }
  if (state.screen === 'end') {
    if (x >= VIEW_W / 2 - 140 && x <= VIEW_W / 2 + 140 && y >= 420 && y <= 478) startGame();
    return;
  }
  for (const r of state.handRects || []) {
    if (pointInRect(x, y, r)) {
      playCard(r.index);
      return;
    }
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '9') {
    playCard(Number(event.key) - 1);
  } else if ((event.key === 'Enter' || event.key === ' ') && state.screen !== 'play') {
    event.preventDefault();
    startGame();
  } else if (event.key === 'm' || event.key === 'M') {
    const muted = sfx.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
});

window.addEventListener('resize', resize);

function frame(now) {
  const t = now;
  if (state.playStartedAt) {
    state.playProgress = Math.min(1, (now - state.playStartedAt) / 350);
  }
  if (state.revealStartedAt) {
    state.revealProgress = Math.min(1, Math.max(0, (now - state.revealStartedAt) / 400));
  }
  if (state.banner) state.bannerAge += 16;

  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground(ctx, t);
  if (state.screen === 'title') {
    drawTitle(ctx, t);
  } else if (state.screen === 'end') {
    drawHud(ctx, state);
    drawEnd(ctx, state, t);
  } else {
    drawHud(ctx, state);
    drawBeacon(ctx, state);
    drawPlayed(ctx, state, t);
    drawHands(ctx, state, hoverIndex);
  }
  requestAnimationFrame(frame);
}

resize();
if (shotKind) {
  applyShot(state, shotKind, seed);
  if (shotKind === 'play') state.screen = 'play';
} else {
  announce('Lantern Route. Begin the night shift to play.');
}
requestAnimationFrame(frame);
