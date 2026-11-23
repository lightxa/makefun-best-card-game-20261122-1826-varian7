// render.js — every pixel of Lantern Route, drawn on one canvas.
//
// The table is a moonlit city rooftop: a night gradient, stars, a low skyline
// and a cobbled table. Cards are drawn by hand (rounded faces, a coloured
// suit band, a big suit glyph and a large value), so suits are told apart by
// colour AND shape, never by text alone. Card slides and flips are lerps
// driven by the game clock in main.js.

import { SUITS, SPECIALS, cardLabel } from './deck.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;
const CARD_W = 112;
const CARD_H = 152;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawSuitGlyph(ctx, suit, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineJoin = 'round';
  if (suit === 'moon') {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.35, Math.PI * 1.65);
    ctx.arc(cx + r * 0.55, cy - r * 0.25, r * 0.82, Math.PI * 1.55, Math.PI * 0.45, true);
    ctx.closePath();
    ctx.fill();
  } else if (suit === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (suit === 'lantern') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.85, cy - r * 0.1, cx + r * 0.45, cy + r * 0.55);
    ctx.quadraticCurveTo(cx, cy + r * 0.95, cx - r * 0.45, cy + r * 0.55);
    ctx.quadraticCurveTo(cx - r * 0.85, cy - r * 0.1, cx, cy - r);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 1.15, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (suit === 'key') {
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.35, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.95, cy + r * 0.95);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.95);
    ctx.lineTo(cx + r * 0.75, cy + r * 0.6);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.6);
    ctx.lineTo(cx + r * 0.55, cy + r * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawBackground(ctx, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#0b1030');
  sky.addColorStop(0.55, '#1a2350');
  sky.addColorStop(1, '#2c1e4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Stars, twinkling slowly.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) {
    const sx = (i * 197.3) % VIEW_W;
    const sy = (i * 89.7) % 300;
    const a = 0.35 + 0.4 * Math.abs(Math.sin(t / 900 + i));
    ctx.globalAlpha = a;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Moon, drawn as a proper crescent on the left, clear of the HUD panels.
  drawSuitGlyph(ctx, 'moon', 92, 178, 36, '#f5e9c8');
  ctx.fillStyle = '#141a38';
  const roofs = [0, 90, 210, 300, 430, 560, 700, 830, 960, 1090, 1200];
  roofs.forEach((x, i) => {
    const h = 60 + ((i * 53) % 90);
    ctx.fillRect(x, 300 - h, 88, h);
    ctx.fillStyle = '#ffd97a';
    ctx.globalAlpha = 0.85;
    for (let w = 0; w < 3; w++) ctx.fillRect(x + 14 + w * 26, 300 - h + 18, 10, 12);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#141a38';
  });

  // The cobbled table.
  const felt = ctx.createLinearGradient(0, 300, 0, VIEW_H);
  felt.addColorStop(0, '#1d3a2f');
  felt.addColorStop(1, '#122419');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 300, VIEW_W, VIEW_H - 300);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let y = 320; y < VIEW_H; y += 34) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke();
  }
  for (let x = 0; x < VIEW_W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, VIEW_H); ctx.stroke();
  }
}

export function drawCardFace(ctx, card, x, y, w, h, lift = 0) {
  const yy = y - lift;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x, yy, w, h, 12);
  ctx.fillStyle = '#f7f2e3';
  ctx.fill();
  ctx.restore();

  const suit = card.suit ? SUITS[card.suit] : null;
  const accent = suit ? suit.color : '#8a8f98';
  ctx.save();
  roundRect(ctx, x, yy, w, h, 12);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(x, yy, w, 10);
  ctx.fillRect(x, yy + h - 10, w, 10);
  ctx.restore();

  ctx.fillStyle = '#20242e';
  ctx.textAlign = 'center';
  if (card.kind === 'special') {
    const sp = SPECIALS[card.special];
    ctx.font = `bold ${Math.round(w * 0.42)}px Georgia, serif`;
    ctx.fillText(String(card.value), x + w / 2, yy + h * 0.3);
    ctx.font = `bold ${Math.round(w * 0.11)}px system-ui, sans-serif`;
    ctx.fillStyle = accent;
    ctx.fillText(sp.name.toUpperCase(), x + w / 2, yy + h * 0.48);
    ctx.font = `${Math.round(w * 0.085)}px system-ui, sans-serif`;
    ctx.fillStyle = '#4a4f5c';
    wrapText(ctx, sp.text, x + w / 2, yy + h * 0.6, w - 16, Math.round(w * 0.13));
  } else {
    ctx.font = `bold ${Math.round(w * 0.44)}px Georgia, serif`;
    ctx.fillText(String(card.value), x + w / 2, yy + h * 0.3);
    drawSuitGlyph(ctx, card.suit, x + w / 2, yy + h * 0.58, w * 0.24, accent);
    ctx.font = `bold ${Math.round(w * 0.1)}px system-ui, sans-serif`;
    ctx.fillStyle = suit.dark;
    ctx.fillText(suit.name.toUpperCase(), x + w / 2, yy + h * 0.88);
  }
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

export function drawCardBack(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#233a6b';
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  ctx.clip();
  ctx.strokeStyle = '#ffd97a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  drawSuitGlyph(ctx, 'lantern', x + w / 2, y + h / 2, w * 0.22, '#ffd97a');
  ctx.restore();
}

export function drawOilBar(ctx, x, y, w, oil, maxOil, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, x, y, w, 18, 9);
  ctx.fill();
  const frac = Math.max(0, oil / maxOil);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#ff9a3c');
  grad.addColorStop(1, '#ffd97a');
  ctx.fillStyle = grad;
  if (frac > 0) {
    roundRect(ctx, x, y, w * frac, 18, 9);
    ctx.fill();
  }
  ctx.fillStyle = '#f7f2e3';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${label} OIL ${oil}/${maxOil}`, x, y - 6);
}

export function drawHud(ctx, state) {
  // Player panel (bottom-left) and rival panel (top-right).
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f7f2e3';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('YOU — THE DAWN COURIER', 24, 40);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#ffd97a';
  ctx.fillText(`🏮 Lanterns ${state.player.lanterns} / 30`, 24, 64);
  drawOilBar(ctx, 24, 92, 220, state.player.oil, state.maxOil, 'YOUR');

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f7f2e3';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('MIRA — THE NIGHT OWL', VIEW_W - 24, 40);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#b48cff';
  ctx.fillText(`Lanterns ${state.ai.lanterns} / 30 🏮`, VIEW_W - 24, 64);
  drawOilBar(ctx, VIEW_W - 244, 92, 220, state.ai.oil, state.maxOil, 'MIRA’S');
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(247,242,227,0.85)';
  ctx.font = '15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Round ${state.round}  •  Deck ${state.deck.length} cards left`, VIEW_W / 2, 40);
  ctx.textAlign = 'left';
}

export function drawBeacon(ctx, state) {
  const cx = 150;
  const cy = 430;
  const suit = SUITS[state.beacon];
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = suit.color;
  ctx.lineWidth = 3;
  ctx.stroke();
  drawSuitGlyph(ctx, state.beacon, cx, cy - 8, 26, suit.color);
  ctx.fillStyle = '#f7f2e3';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BEACON', cx, cy + 40);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = suit.color;
  ctx.fillText(`${suit.name} +3`, cx, cy + 80);
  ctx.restore();
  if (state.chainSuit) {
    ctx.fillStyle = 'rgba(247,242,227,0.85)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Chain: ${SUITS[state.chainSuit].name} +2`, cx, cy + 100);
    ctx.textAlign = 'left';
  }
}

export function drawPlayed(ctx, state, t) {
  const cx = VIEW_W / 2;
  // Rival's played card (top centre, clear of her hand above).
  if (state.aiPlayed) {
    const flip = Math.min(1, state.revealProgress);
    if (flip < 0.5) drawCardBack(ctx, cx - 190, 225, CARD_W, CARD_H);
    else drawCardFace(ctx, state.aiPlayed, cx - 190, 225, CARD_W, CARD_H);
  } else {
    ctx.strokeStyle = 'rgba(247,242,227,0.35)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    roundRect(ctx, cx - 190, 225, CARD_W, CARD_H, 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Player's played card (bottom centre, sliding up from the hand).
  if (state.playerPlayed) {
    const slide = Math.min(1, state.playProgress);
    const y = 540 - slide * 315;
    drawCardFace(ctx, state.playerPlayed, cx + 78, y, CARD_W, CARD_H);
  } else {
    ctx.strokeStyle = 'rgba(247,242,227,0.35)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    roundRect(ctx, cx + 78, 225, CARD_W, CARD_H, 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.banner) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.bannerAge / 200);
    ctx.fillStyle = 'rgba(11,16,48,0.85)';
    roundRect(ctx, cx - 260, 400, 520, 64, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd97a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd97a';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.banner, cx, 432);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#f7f2e3';
    ctx.fillText(state.bannerSub || '', cx, 454);
    ctx.restore();
  }
  void t;
}

export function drawHands(ctx, state, hoverIndex) {
  // Rival's hand: face-down backs across the top.
  const bw = 76;
  const bh = 104;
  const total = state.ai.hand.length * (bw + 8);
  let x = (VIEW_W - total) / 2;
  for (let i = 0; i < state.ai.hand.length; i++) {
    drawCardBack(ctx, x, 108, bw, bh);
    x += bw + 8;
  }

  // Player's hand: face-up, clickable, hovered card lifts.
  const n = state.player.hand.length;
  const gap = 14;
  const totalW = n * CARD_W + (n - 1) * gap;
  let px = (VIEW_W - totalW) / 2;
  const py = 540;
  state.handRects = [];
  state.player.hand.forEach((card, i) => {
    const lift = hoverIndex === i ? 26 : 0;
    drawCardFace(ctx, card, px, py, CARD_W, CARD_H, lift);
    state.handRects.push({ x: px, y: py - lift, w: CARD_W, h: CARD_H, index: i });
    px += CARD_W + gap;
  });

  ctx.fillStyle = 'rgba(247,242,227,0.8)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click a card to play it  •  keys 1–5 play a card  •  M mutes sound', VIEW_W / 2, 712);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, t) {
  ctx.fillStyle = 'rgba(8,10,28,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const bob = Math.sin(t / 600) * 6;
  drawSuitGlyph(ctx, 'lantern', VIEW_W / 2, 150 + bob, 46, '#ffd97a');
  ctx.fillStyle = '#ffd97a';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('LANTERN ROUTE', VIEW_W / 2, 250);
  ctx.fillStyle = '#f7f2e3';
  ctx.font = '22px Georgia, serif';
  ctx.fillText('A night-courier card duel under the city moon', VIEW_W / 2, 292);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(247,242,227,0.9)';
  const lines = [
    'Each round a Beacon suit is lit. Play a card: its suit matching the Beacon scores +3,',
    'matching the last winning suit chains +2. Win the round to earn lanterns equal to',
    'your card; the loser spills oil equal to the gap. First to 30 lanterns wins —',
    'or snuff out your rival’s lamp oil to win by darkness.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 340 + i * 26));
  ctx.fillStyle = '#ffd97a';
  roundRect(ctx, VIEW_W / 2 - 190, 470, 380, 62, 12);
  ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('BEGIN THE NIGHT SHIFT', VIEW_W / 2, 508);
  ctx.fillStyle = 'rgba(247,242,227,0.75)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Storm calms the beacon • Lantern Keeper mends 2 oil • Shortcut draws an extra card', VIEW_W / 2, 570);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, state, t) {
  const won = state.winner === 'player';
  const draw = state.winner === 'draw';
  ctx.fillStyle = won ? 'rgba(20,32,12,0.78)' : 'rgba(24,10,20,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const glow = 0.7 + 0.3 * Math.sin(t / 500);
  ctx.globalAlpha = glow;
  drawSuitGlyph(ctx, won ? 'lantern' : 'moon', VIEW_W / 2, 150, 52, won ? '#ffd97a' : '#b48cff');
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffd97a';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    draw ? 'DEAD HEAT — A DRAW' : won ? 'DAWN BREAKS — YOU WIN!' : 'THE LANTERNS FADE — YOU LOSE',
    VIEW_W / 2, 250,
  );
  ctx.fillStyle = '#f7f2e3';
  ctx.font = '22px Georgia, serif';
  ctx.fillText(
    draw
      ? 'Neither courier could outshine the other tonight.'
      : won
        ? 'Every parcel delivered. The city wakes to your lanterns.'
        : 'Mira’s owl outflew you tonight. The route is hers — for now.',
    VIEW_W / 2, 296,
  );
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(
    `Final score — You: ${state.player.lanterns} lanterns, ${state.player.oil} oil  •  Mira: ${state.ai.lanterns} lanterns, ${state.ai.oil} oil`,
    VIEW_W / 2, 350,
  );
  ctx.fillStyle = '#ffd97a';
  roundRect(ctx, VIEW_W / 2 - 140, 420, 280, 58, 12);
  ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('PLAY AGAIN', VIEW_W / 2, 456);
  ctx.textAlign = 'left';
}
