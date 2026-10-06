import './style.css';
import { WORLD, BUMPERS, COLORS, clamp, chargeAt, aimAt, makeDisc, stepDisc, addDisc } from './physics.js';
import { mountShaders } from './shaders.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), arena = $('arena'), ctx = canvas.getContext('2d');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { discs: [], trails: [], impacts: [], angle: -Math.PI / 2, hits: 0, shots: 0, charging: null, pointer: null, paused: false, time: 0, recoil: 0, energy: 0, bumperPulse: [0, 0, 0] };
let shaders, raf, last = 0, accumulator = 0, lastShader = 0, closed = false;
const listeners = [];
const on = (element, type, handler, options) => { element.addEventListener(type, handler, options); listeners.push(() => element.removeEventListener(type, handler, options)); };
const charge = () => state.charging === null ? 0 : chargeAt((performance.now() - state.charging) / 1000);
const round = (x, y, w, h, r, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };
function circle(x, y, radius, fill, stroke) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } }
function text(value, x, y, size = 12, color = '#718276', align = 'center') { ctx.fillStyle = color; ctx.font = `600 ${size}px "Segoe UI", sans-serif`; ctx.textAlign = align; ctx.fillText(value, x, y); }
function start(source) {
  if (state.paused || state.charging !== null) return;
  state.charging = performance.now(); state.pointer = source;
}
function cancel() { state.charging = null; state.pointer = null; }
function launch() {
  if (state.charging === null) return;
  const power = charge(), disc = makeDisc(state.angle, power, COLORS[state.shots % 3], state.shots);
  addDisc(state.discs, disc); state.shots++; state.recoil = 1; state.energy = 1; cancel();
  $('status').textContent = `Shot ${state.shots} launched at ${Math.round(power * 100)} percent power. ${state.hits} bumper hits so far.`;
}
function setAim(event) {
  const rect = canvas.getBoundingClientRect();
  state.angle = aimAt((event.clientX - rect.left) * WORLD.width / rect.width, (event.clientY - rect.top) * WORLD.height / rect.height);
}
function setPause(value) {
  state.paused = value; cancel(); accumulator = 0; last = 0;
  $('paused-cover').hidden = !value; $('pause').ariaPressed = String(value);
  $('pause').innerHTML = value ? '<span aria-hidden="true">▷</span> Resume' : '<span aria-hidden="true">Ⅱ</span> Pause';
  $('fire').disabled = value;
  shaders?.update(0, state.energy, value, motion.matches);
}
function reset() {
  state.discs = []; state.trails = []; state.impacts = []; state.hits = 0; state.shots = 0; state.angle = -Math.PI / 2; state.recoil = 0; state.energy = 0; state.bumperPulse.fill(0);
  $('hits').textContent = '00'; setPause(false); $('status').textContent = 'Fresh canvas. Ready to launch.';
}
on(arena, 'pointerdown', event => {
  if (event.button !== 0 || state.paused) return;
  arena.focus({ preventScroll: true }); setAim(event);
  if (event.pointerType === 'mouse' || event.pointerType === 'pen') { arena.setPointerCapture(event.pointerId); start(event.pointerId); }
});
on(arena, 'pointermove', event => { if (!state.paused && (state.pointer === null || state.pointer === event.pointerId)) setAim(event); });
on(arena, 'pointerup', event => { if (state.pointer === event.pointerId) launch(); });
on(arena, 'pointercancel', cancel); on(arena, 'lostpointercapture', cancel);
on($('fire'), 'pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); $('fire').setPointerCapture(event.pointerId); start(event.pointerId); });
on($('fire'), 'pointerup', event => { if (state.pointer === event.pointerId) launch(); });
on($('fire'), 'pointercancel', cancel); on($('fire'), 'lostpointercapture', cancel);
on(arena, 'keydown', event => {
  if (event.target !== arena) return;
  if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) start('keyboard'); }
  if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') { event.preventDefault(); state.angle = clamp(state.angle + (event.code === 'ArrowLeft' ? -.06 : .06), -160 * Math.PI / 180, -20 * Math.PI / 180); }
  if (event.code === 'Escape') cancel();
});
on(arena, 'keyup', event => { if (event.target === arena && event.code === 'Space') { event.preventDefault(); if (state.pointer === 'keyboard') launch(); } });
on($('fire'), 'keydown', event => { if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); if (!event.repeat) start('button-keyboard'); } });
on($('fire'), 'keyup', event => { if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); if (state.pointer === 'button-keyboard') launch(); } });
on($('reset'), 'click', reset); on($('pause'), 'click', () => setPause(!state.paused));
on($('resume'), 'click', () => { setPause(false); arena.focus(); });
on(window, 'blur', () => { cancel(); accumulator = 0; last = 0; shaders?.update(0, state.energy, true, motion.matches); });
on(arena, 'focusout', cancel); on($('fire'), 'blur', cancel);
on(document, 'visibilitychange', () => { cancel(); last = 0; accumulator = 0; shaders?.update(0, state.energy, document.hidden || state.paused, motion.matches); });
on(motion, 'change', () => { state.recoil = 0; state.impacts = []; state.bumperPulse.fill(0); shaders?.update(charge(), state.energy, state.paused, motion.matches); });

function impact(hit) {
  state.energy = Math.max(state.energy, hit.bumper >= 0 ? .8 : .3);
  if (!motion.matches) { state.impacts.push({ ...hit, born: state.time }); if (state.impacts.length > 40) state.impacts.shift(); }
  if (hit.bumper >= 0) {
    state.hits++; state.bumperPulse[hit.bumper] = 1;
    $('hits').textContent = String(state.hits).padStart(2, '0');
  }
}
function step(dt) {
  state.time += dt;
  const trailLife = motion.matches ? .25 : 1.2;
  state.discs = state.discs.filter(disc => {
    const alive = stepDisc(disc, dt, BUMPERS, impact);
    if (!disc.trail.length || state.time - disc.trail.at(-1).t >= 1 / 60) disc.trail.push({ x: disc.x, y: disc.y, t: state.time });
    disc.trail = disc.trail.filter(point => state.time - point.t < trailLife);
    if (!alive) { state.trails.push({ color: disc.color, points: disc.trail }); if (state.trails.length > 8) state.trails.shift(); }
    return alive;
  });
  state.trails = state.trails.filter(trail => { trail.points = trail.points.filter(point => state.time - point.t < trailLife); return trail.points.length > 1; });
  state.impacts = state.impacts.filter(hit => state.time - hit.born < .45);
  state.recoil = Math.max(0, state.recoil - dt * 5);
  state.energy = Math.max(0, state.energy - dt * 1.8);
  state.bumperPulse = state.bumperPulse.map(value => Math.max(0, value - dt * 5));
}
function drawTrail(points, color) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const duration = motion.matches ? .25 : 1.2;
  for (let i = 1; i < points.length; i++) {
    const alpha = clamp(1 - (state.time - points[i].t) / duration, 0, 1);
    ctx.globalAlpha = alpha * .5; ctx.strokeStyle = color; ctx.lineWidth = 7 * alpha + 1;
    ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y); ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawDisc(x, y, rotation, color, radius = 11) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  circle(1, 3, radius, '#344b3520'); circle(0, 0, radius, color); circle(0, 0, radius * .45, '#f9f2de');
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff70'; ctx.beginPath(); ctx.arc(0, 0, radius - 3, .2, 2); ctx.stroke();
  ctx.restore();
}
function drawLauncher(power) {
  const recoil = motion.matches ? 0 : Math.sin(state.recoil * Math.PI) * 7;
  ctx.save(); ctx.translate(450, 530 + recoil); ctx.rotate(state.angle);
  ctx.lineWidth = 1;
  round(-14, -22, 101 - power * 4, 44, 15, '#a94a37');
  const plastic = ctx.createLinearGradient(0, -22, 0, 22); plastic.addColorStop(0, '#f79777'); plastic.addColorStop(.45, '#e77456'); plastic.addColorStop(1, '#ce563f');
  round(-14, -26, 99 - power * 4, 42, 13, plastic, '#bc503b');
  round(0, -18, 58, 5, 3, '#ffba9360');
  round(68 - power * 4, -29, 15, 48, 6, '#314f43');
  round(73 - power * 4, -23, 6, 35, 3, '#759781');
  drawDisc(50 - power * 4, -5, 0, COLORS[state.shots % 3], 13);
  ctx.restore();
  ctx.save(); ctx.translate(450, 571 + recoil); ctx.scale(1, 1 - power * .025);
  round(-61, -23, 122, 53, 22, '#475d4530');
  round(-62, -32, 124, 58, 22, '#bb4e39');
  const body = ctx.createLinearGradient(0, -34, 0, 22); body.addColorStop(0, '#f69777'); body.addColorStop(.45, '#e77456'); body.addColorStop(1, '#db6047');
  round(-62, -36, 124, 58, 22, body, '#c4543c');
  round(-44, -27, 88, 6, 3, '#ffc4a45c');
  ctx.strokeStyle = '#c3503b'; ctx.beginPath(); ctx.moveTo(-53, 6); ctx.lineTo(53, 6); ctx.stroke();
  circle(0, -10, 19, '#eac482', '#b88446'); circle(0, -10, 13, '#f5ddb0'); circle(0, -10, 7, COLORS[state.shots % 3]);
  [-42, 42].forEach(x => { circle(x, -10, 3, '#b95640'); ctx.strokeStyle = '#f8a17d'; ctx.beginPath(); ctx.moveTo(x - 1.5, -11); ctx.lineTo(x + 1.5, -9); ctx.stroke(); });
  ctx.restore();
}
function draw() {
  const power = charge();
  ctx.clearRect(0, 0, 900, 640);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#87998655'; ctx.strokeRect(WORLD.left, WORLD.top, WORLD.right - WORLD.left, WORLD.bottom - WORLD.top);
  ctx.fillStyle = '#6c867016';
  for (let x = 64; x < 870; x += 43) for (let y = 65; y < 520; y += 43) circle(x, y, 1, '#6c86701c');
  text('MAKE A LITTLE BEAUTIFUL MESS', 450, 66, 9, '#8a958480');
  ctx.save(); ctx.beginPath(); ctx.rect(WORLD.left, WORLD.top, WORLD.right - WORLD.left, WORLD.bottom - WORLD.top); ctx.clip();
  state.trails.forEach(trail => drawTrail(trail.points, trail.color)); state.discs.forEach(disc => drawTrail(disc.trail, disc.color));
  BUMPERS.forEach((bumper, index) => {
    const pulse = motion.matches ? 0 : state.bumperPulse[index];
    ctx.save(); ctx.translate(bumper.x, bumper.y); ctx.scale(1 + pulse * .12, 1 - pulse * .1);
    circle(0, 6, 37, '#3a695528'); circle(0, 2, 36, '#245c52');
    const gradient = ctx.createLinearGradient(0, -34, 0, 34); gradient.addColorStop(0, '#69a18b'); gradient.addColorStop(1, '#3b7b6a');
    circle(0, -2, 34, gradient, '#37735f'); circle(0, -2, 25, null, '#a3c5a570'); circle(0, -2, 15, '#346d5d');
    text(`0${index + 1}`, 0, 3, 10, '#cee0c5'); ctx.restore();
  });
  state.impacts.forEach(hit => { const age = (state.time - hit.born) / .45; ctx.globalAlpha = (1 - age) * .65; ctx.lineWidth = 2 * (1 - age); circle(hit.x, hit.y, 8 + age * (hit.bumper >= 0 ? 42 : 20), null, hit.color); });
  ctx.globalAlpha = 1;
  state.discs.forEach(disc => drawDisc(disc.x, disc.y, disc.rotation, disc.color));
  if (!state.discs.length || state.charging !== null) {
    const x = 450 + Math.cos(state.angle) * 99, y = 530 + Math.sin(state.angle) * 99;
    ctx.setLineDash([3, 8]); ctx.strokeStyle = '#56796560'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(state.angle) * (70 + power * 75), y + Math.sin(state.angle) * (70 + power * 75)); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
  ctx.lineWidth = 1;
  round(28, 543, 844, 73, 12, '#dce0cc90', '#bac5b366');
  text('AIM. CHARGE.', 68, 571, 10, '#607661', 'left'); text('RELEASE. REPEAT.', 68, 588, 10, '#607661', 'left');
  text('DISC / 0' + (state.shots % 3 + 1), 828, 575, 9, '#70806b', 'right'); text('AUTO RELOAD', 828, 591, 8, '#8a9780', 'right');
  drawLauncher(power);
  circle(408, 625, 2.5, '#8c9c8050'); circle(492, 625, 2.5, '#8c9c8050');
  $('power').setAttribute('aria-valuenow', String(Math.round(power * 100)));
  $('power').firstElementChild.style.transform = `scaleX(${power})`;
  $('button-charge').style.transform = `scaleX(${power})`;
  $('power-label').textContent = state.paused ? 'ON PAUSE' : state.charging !== null ? power >= 1 ? 'FULL POWER — LET GO' : `CHARGING / ${Math.round(power * 100)}%` : state.discs.length ? 'HAPPY ACCIDENTS IN PROGRESS' : 'READY WHEN YOU ARE';
  $('fire-label').textContent = state.charging !== null ? 'Release to fire' : 'Hold to fire';
  arena.style.setProperty('--energy', Math.max(power, state.energy).toFixed(2));
}
function frame(timestamp) {
  if (closed) return;
  if (!last) last = timestamp;
  const dt = Math.min((timestamp - last) / 1000, .05); last = timestamp;
  if (!state.paused && !document.hidden) {
    accumulator = Math.min(accumulator + dt, .05);
    while (accumulator >= 1 / 120) { step(1 / 120); accumulator -= 1 / 120; }
  }
  draw();
  if (timestamp - lastShader >= 1000 / 30) { shaders?.update(charge(), Math.max(charge(), state.energy), state.paused || document.hidden, motion.matches); lastShader = timestamp; }
  raf = requestAnimationFrame(frame);
}
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2), rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(canvas.width / 900, 0, 0, canvas.height / 640, 0, 0); draw();
}
const observer = new ResizeObserver(resize); observer.observe(arena);
resize(); raf = requestAnimationFrame(frame);
mountShaders($('surface'), $('rim')).then(result => { if (closed) result.dispose(); else shaders = result; });
function dispose() { closed = true; cancelAnimationFrame(raf); observer.disconnect(); shaders?.dispose(); listeners.forEach(remove => remove()); }
on(window, 'pagehide', event => { if (!event.persisted) dispose(); else { cancel(); last = 0; } });
if (import.meta.hot) import.meta.hot.dispose(dispose);
