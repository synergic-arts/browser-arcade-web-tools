const $ = id => document.getElementById(id);
const canvas = $('map');
const ctx = canvas.getContext('2d');
const minimap = $('minimap');
const mini = minimap.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const COLS = 30;
const ROWS = 18;
const TILE = W / COLS;
const TYPES = { grass: { color: '#6f9b63', light: '#86b174' }, forest: { color: '#2e6d55', light: '#3f8968' }, water: { color: '#3e86a2', light: '#66b8c5' }, rock: { color: '#777568', light: '#aaa389' } };
const landmarkTemplates = [
  { kind: 'ruins', name: 'Ruinas del alto', icon: '✦', color: '#ffd77c', x: 5, y: 3, note: 'Un conjunto de muros cubierto por líquenes.' },
  { kind: 'tower', name: 'Torre de señales', icon: '◆', color: '#f6a36e', x: 24, y: 3, note: 'Una atalaya domina el paso oriental.' },
  { kind: 'wetland', name: 'Laguna antigua', icon: '≈', color: '#9ce9e7', x: 8, y: 14, note: 'El humedal conserva una ruta de aves.' },
  { kind: 'mine', name: 'Cantera vieja', icon: '●', color: '#f4c6a1', x: 23, y: 14, note: 'Marcas de extracción en la ladera.' },
  { kind: 'camp', name: 'Refugio del bosque', icon: '⌂', color: '#ffedac', x: 15, y: 4, note: 'Un refugio útil para futuras campañas.' },
  { kind: 'marker', name: 'Mojón de ruta', icon: '▲', color: '#d0f28f', x: 15, y: 15, note: 'La señal confirma el trazado histórico.' }
];
let state = 'ready';
let last = 0;
let elapsed = 0;
let score = 0;
let seed = 0;
let grid = [];
let explored = new Set();
let landmarks = [];
let player = { x: 2.5, y: 9.5, r: .27 };
let keys = new Set();
let particles = [];
let best = Number(localStorage.getItem('cartographer-quest-best') || 0);
$('best').textContent = best ? formatTime(best) : '--:--';

function rng(value) { let t = value + 0x6D2B79F5; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
function formatTime(seconds) { const minutes = Math.floor(seconds / 60).toString().padStart(2, '0'); const rest = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${minutes}:${rest}`; }
function reset() {
  seed = Math.floor(Math.random() * 900000) + 1000; const random = rng(seed); elapsed = 0; score = 0; explored = new Set(); player = { x: 2.5, y: 9.5, r: .27 }; particles = [];
  grid = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => {
    const n = random(); const border = x < 1 || y < 1 || x > COLS - 2 || y > ROWS - 2;
    return border ? 'rock' : n < .1 ? 'water' : n < .19 ? 'rock' : n < .34 ? 'forest' : 'grass';
  }));
  for (let y = 7; y <= 11; y += 1) for (let x = 1; x <= 9; x += 1) grid[y][x] = 'grass';
  landmarks = landmarkTemplates.map(item => ({ ...item, done: false }));
  landmarks.forEach(item => { grid[item.y][item.x] = 'grass'; });
  updateHud();
}
function updateHud() { const found = landmarks.filter(item => item.done).length; $('found').textContent = `${found} / ${landmarks.length}`; $('score').textContent = score.toLocaleString('es-ES'); $('time').textContent = formatTime(elapsed); $('best').textContent = best ? formatTime(best) : '--:--'; const next = landmarks.find(item => !item.done); $('quest').textContent = next ? next.name : 'Mapa completado'; $('questLabel').textContent = next ? 'Siguiente objetivo' : 'Resultado'; }
function start() { reset(); state = 'running'; $('message').classList.add('hidden'); $('pause').textContent = 'Pausa'; $('status').textContent = 'Exploración activa. Revela el mapa y documenta los hitos.'; last = performance.now(); requestAnimationFrame(loop); }
function end() { state = 'won'; const finalTime = elapsed; if (!best || finalTime < best) { best = finalTime; localStorage.setItem('cartographer-quest-best', best); } updateHud(); $('message').classList.remove('hidden'); $('message').querySelector('h2').textContent = 'Mapa completado'; $('message').querySelector('p:not(.eyebrow)').textContent = `Has documentado los seis hitos en ${formatTime(finalTime)} y has reunido ${score.toLocaleString('es-ES')} puntos.`; $('start').textContent = 'Nueva expedición'; $('status').textContent = 'Expedición completada. El mejor tiempo se guarda en este dispositivo.'; }
function togglePause() { if (state === 'running') { state = 'paused'; $('pause').textContent = 'Continuar'; $('status').textContent = 'Pausa de campo.'; } else if (state === 'paused') { state = 'running'; $('pause').textContent = 'Pausa'; last = performance.now(); requestAnimationFrame(loop); $('status').textContent = 'Exploración activa.'; } }
function blocked(x, y) { const radius = player.r; for (const [cx, cy] of [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]]) { const tx = Math.floor(cx); const ty = Math.floor(cy); if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || ['water', 'rock'].includes(grid[ty][tx])) return true; } return false; }
function update(dt) {
  elapsed += dt; const dx = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0); const dy = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0); const length = Math.hypot(dx, dy) || 1; const speed = 4.2 * dt; const nx = player.x + dx / length * speed; const ny = player.y + dy / length * speed; if (!blocked(nx, player.y)) player.x = nx; if (!blocked(player.x, ny)) player.y = ny;
  for (let y = Math.max(0, Math.floor(player.y - 5.5)); y <= Math.min(ROWS - 1, Math.ceil(player.y + 5.5)); y += 1) for (let x = Math.max(0, Math.floor(player.x - 5.5)); x <= Math.min(COLS - 1, Math.ceil(player.x + 5.5)); x += 1) if (Math.hypot(x + .5 - player.x, y + .5 - player.y) < 5.8) explored.add(`${x},${y}`);
  landmarks.forEach(item => { if (!item.done && Math.hypot(item.x + .5 - player.x, item.y + .5 - player.y) < .85) { item.done = true; score += 500 + Math.max(0, 120 - Math.floor(elapsed)); particles.push(...Array.from({ length: 24 }, () => ({ x: item.x + .5, y: item.y + .5, vx: (Math.random() - .5) * 2.4, vy: (Math.random() - .5) * 2.4, life: .9 }))); updateHud(); $('status').textContent = `${item.name}: ${item.note}`; } });
  particles.forEach(particle => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; }); particles = particles.filter(particle => particle.life > 0); if (landmarks.every(item => item.done)) end(); updateHud();
}
function draw() {
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#5f8b5b'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) drawTile(x, y, grid[y][x], explored.has(`${x},${y}`));
  const next = landmarks.find(item => !item.done); if (next && explored.has(`${next.x},${next.y}`)) { ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = '#ffe49a99'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(player.x * TILE, player.y * TILE); ctx.lineTo((next.x + .5) * TILE, (next.y + .5) * TILE); ctx.stroke(); ctx.restore(); }
  landmarks.forEach(item => { if (explored.has(`${item.x},${item.y}`)) drawLandmark(item); }); drawParticles(); drawPlayer(); drawMini(); if (state === 'paused') { ctx.fillStyle = '#0a1713aa'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '700 32px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PAUSA DE CAMPO', W / 2, H / 2); ctx.textAlign = 'start'; }
}
function drawTile(x, y, type, visible) { const tile = TYPES[type]; const px = x * TILE; const py = y * TILE; ctx.fillStyle = tile.color; ctx.fillRect(px, py, TILE + 1, TILE + 1); ctx.globalAlpha = visible ? .42 : .12; ctx.strokeStyle = tile.light; ctx.lineWidth = 1; if (type === 'water') { ctx.beginPath(); for (let yy = 8; yy < TILE; yy += 10) { ctx.moveTo(px + 2, py + yy); ctx.quadraticCurveTo(px + TILE / 2, py + yy - 4, px + TILE - 2, py + yy); } ctx.stroke(); } else if (type === 'forest') { for (let n = 0; n < 3; n += 1) { const tx = px + 7 + (n * 9) % 20; ctx.beginPath(); ctx.moveTo(tx, py + 24); ctx.lineTo(tx + 5, py + 10); ctx.lineTo(tx + 10, py + 24); ctx.stroke(); } } else if (type === 'rock') { ctx.beginPath(); ctx.moveTo(px + 5, py + 23); ctx.lineTo(px + 14, py + 8); ctx.lineTo(px + 27, py + 21); ctx.closePath(); ctx.stroke(); } else { ctx.fillRect(px + 5 + (x * 3 + y) % 13, py + 8 + (y * 2) % 15, 2, 2); } ctx.globalAlpha = 1; if (!visible) { ctx.fillStyle = '#071310e8'; ctx.fillRect(px, py, TILE, TILE); } }
function drawLandmark(item) { const x = (item.x + .5) * TILE; const y = (item.y + .5) * TILE; ctx.save(); ctx.translate(x, y); ctx.shadowBlur = 13; ctx.shadowColor = item.color; ctx.fillStyle = item.done ? '#fff6' : item.color; ctx.beginPath(); ctx.arc(0, 0, 12 + Math.sin(elapsed * 4) * 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#102018'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.done ? '✓' : item.icon, 0, 1); ctx.restore(); }
function drawPlayer() { const x = player.x * TILE; const y = player.y * TILE; ctx.save(); ctx.translate(x, y); ctx.shadowBlur = 20; ctx.shadowColor = '#8df0c0'; ctx.fillStyle = '#eaffd7'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#25785e'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, 7); ctx.lineTo(0, 4); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill(); ctx.restore(); }
function drawParticles() { particles.forEach(particle => { ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = '#ffd77c'; ctx.fillRect(particle.x * TILE, particle.y * TILE, 3, 3); }); ctx.globalAlpha = 1; }
function drawMini() { mini.clearRect(0, 0, minimap.width, minimap.height); const sx = minimap.width / COLS; const sy = minimap.height / ROWS; for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) { const visible = explored.has(`${x},${y}`); mini.fillStyle = visible ? TYPES[grid[y][x]].color : '#071310'; mini.fillRect(x * sx, y * sy, sx + 1, sy + 1); } landmarks.forEach(item => { if (explored.has(`${item.x},${item.y}`)) { mini.fillStyle = item.done ? '#fff' : item.color; mini.fillRect(item.x * sx, item.y * sy, 4, 4); } }); mini.fillStyle = '#8df0c0'; mini.fillRect(player.x * sx - 2, player.y * sy - 2, 5, 5); }
function loop(now) { if (state !== 'running') { draw(); return; } const dt = Math.min(.04, (now - last) / 1000 || .016); last = now; update(dt); draw(); if (state === 'running') requestAnimationFrame(loop); }
window.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault(); keys.add(event.key); if (event.key === 'Escape') togglePause(); });
window.addEventListener('keyup', event => keys.delete(event.key));
document.querySelectorAll('[data-key]').forEach(button => { const key = button.dataset.key; button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(key); }); button.addEventListener('pointerup', () => keys.delete(key)); button.addEventListener('pointerleave', () => keys.delete(key)); });
$('start').addEventListener('click', start); $('pause').addEventListener('click', togglePause); reset(); draw();
