const $ = id => document.getElementById(id);
const canvas = $('arena');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
let state = 'ready';
let last = 0;
let elapsed = 0;
let score = 0;
let wave = 1;
let lives = 3;
let shield = 100;
let waveClock = 0;
let spawnClock = 0;
let shotClock = 0;
let boss = null;
let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerups = [];
let stars = [];
let keys = new Set();
let pointer = { active: false, x: W / 2, y: H - 80 };
let best = Number(localStorage.getItem('nebula-command-best') || 0);
$('best').textContent = best;

function reset() {
  score = 0; wave = 1; lives = 3; shield = 100; waveClock = 0; spawnClock = 0; shotClock = 0; boss = null;
  bullets = []; enemyBullets = []; enemies = []; particles = []; powerups = [];
  player = { x: W / 2, y: H - 80, r: 18, invulnerable: 0, tilt: 0 };
  stars = Array.from({ length: 100 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * 1.8, size: .5 + Math.random() * 2 }));
  updateHud();
}

function updateHud() {
  $('score').textContent = score.toLocaleString('es-ES');
  $('wave').textContent = wave;
  $('lives').textContent = lives;
  $('best').textContent = best.toLocaleString('es-ES');
  $('shield').style.width = `${Math.max(0, shield)}%`;
}

function start() { reset(); state = 'running'; $('message').classList.add('hidden'); $('pause').textContent = 'Pausa'; $('status').textContent = 'Sector activo. El disparo automático está listo.'; last = performance.now(); requestAnimationFrame(loop); }
function end(reason) { state = 'over'; best = Math.max(best, score); localStorage.setItem('nebula-command-best', best); updateHud(); $('message').classList.remove('hidden'); $('message').querySelector('h2').textContent = reason; $('message').querySelector('p:not(.eyebrow)').textContent = `Has alcanzado la oleada ${wave} con ${score.toLocaleString('es-ES')} puntos. Repara el núcleo y vuelve a intentarlo.`; $('start').textContent = 'Repetir misión'; $('status').textContent = 'Misión terminada. La puntuación se ha guardado localmente.'; }
function togglePause() { if (state === 'running') { state = 'paused'; $('pause').textContent = 'Continuar'; $('status').textContent = 'Pausa táctica.'; } else if (state === 'paused') { state = 'running'; $('pause').textContent = 'Pausa'; last = performance.now(); requestAnimationFrame(loop); $('status').textContent = 'Sector activo.'; } }

function addParticles(x, y, color, count = 10, force = 2) { for (let i = 0; i < count; i += 1) particles.push({ x, y, vx: (Math.random() - .5) * force * 2, vy: (Math.random() - .5) * force * 2, life: .35 + Math.random() * .65, max: 1, color, size: 1 + Math.random() * 3 }); }
function spawnEnemy() { if (boss) return; const roll = Math.random(); const type = roll < .54 ? 'scout' : roll < .84 ? 'shooter' : 'tank'; const radius = type === 'tank' ? 26 : type === 'shooter' ? 18 : 14; enemies.push({ type, x: 40 + Math.random() * (W - 80), y: -40, r: radius, hp: type === 'tank' ? 5 + wave : type === 'shooter' ? 2 : 1, max: type === 'tank' ? 5 + wave : type === 'shooter' ? 2 : 1, speed: (type === 'tank' ? 32 : 45) + wave * 3, t: Math.random() * 5, fire: 1 + Math.random() * 2, phase: Math.random() * 7 }); }
function spawnBoss() { boss = { x: W / 2, y: -90, r: 56, hp: 60 + wave * 18, max: 60 + wave * 18, t: 0, fire: 1, angle: 0 }; $('status').textContent = `Comandante de la oleada ${wave}: apunta al núcleo enemigo.`; }
function shoot(x = player.x, y = player.y - 20) { bullets.push({ x, y, vx: 0, vy: -560, r: 4, damage: 1, color: '#7df7ff' }); addParticles(x, y + 10, '#7df7ff', 2, 1); }
function fireEnemy(x, y, angle, speed = 170) { enemyBullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 5, color: '#ff76bd' }); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function hitPlayer(damage) { if (player.invulnerable > 0) return; if (shield > 0) shield = Math.max(0, shield - damage * 16); else lives -= 1; player.invulnerable = 1.1; addParticles(player.x, player.y, '#ff76bd', 22, 4); updateHud(); if (lives <= 0) end('Núcleo destruido'); }
function update(dt) {
  elapsed += dt; player.invulnerable = Math.max(0, player.invulnerable - dt); waveClock += dt; spawnClock -= dt; shotClock -= dt;
  stars.forEach(star => { star.y += (20 + star.z * 28) * dt; if (star.y > H + 5) { star.y = -5; star.x = Math.random() * W; } });
  const speed = 290 * dt; let dx = 0; let dy = 0; if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1; if (keys.has('ArrowRight') || keys.has('d')) dx += 1; if (keys.has('ArrowUp') || keys.has('w')) dy -= 1; if (keys.has('ArrowDown') || keys.has('s')) dy += 1;
  if (pointer.active) { player.x += (pointer.x - player.x) * Math.min(1, dt * 8); player.y += (pointer.y - player.y) * Math.min(1, dt * 8); } else { player.x += dx * speed; player.y += dy * speed; }
  player.x = Math.max(24, Math.min(W - 24, player.x)); player.y = Math.max(H * .45, Math.min(H - 28, player.y)); player.tilt = dx * .25;
  if (shotClock <= 0 || keys.has(' ') || keys.has('Space')) { shoot(); shotClock = .24; }
  if (!boss && waveClock > 20) { wave += 1; waveClock = 0; if (wave % 5 === 0) spawnBoss(); updateHud(); }
  if (!boss && spawnClock <= 0) { spawnEnemy(); spawnClock = Math.max(.24, .95 - wave * .045); }
  if (boss) updateBoss(dt); else enemies.forEach(enemy => { enemy.t += dt; enemy.y += enemy.speed * dt; enemy.x += Math.sin(enemy.t + enemy.phase) * 42 * dt; enemy.fire -= dt; if (enemy.type === 'shooter' && enemy.fire <= 0 && enemy.y > 20) { fireEnemy(enemy.x, enemy.y, Math.atan2(player.y - enemy.y, player.x - enemy.x), 145 + wave * 4); enemy.fire = 1.8 - Math.min(.7, wave * .03); } });
  bullets.forEach(bullet => { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; });
  enemyBullets.forEach(bullet => { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; });
  enemies = enemies.filter(enemy => { if (enemy.y > H + 50) { hitPlayer(1); return false; } return true; });
  enemyBullets = enemyBullets.filter(bullet => { if (bullet.y > H + 25 || bullet.x < -25 || bullet.x > W + 25) return false; if (distance(bullet, player) < bullet.r + player.r) { hitPlayer(1); return false; } return true; });
  bullets = bullets.filter(bullet => bullet.y > -20 && bullet.x > -20 && bullet.x < W + 20);
  bullets.forEach(bullet => { if (boss && distance(bullet, boss) < bullet.r + boss.r) { boss.hp -= bullet.damage; bullet.y = -100; addParticles(bullet.x, bullet.y + 100, '#ffd67b', 2, 1); if (boss.hp <= 0) { score += 5000; addParticles(boss.x, boss.y, '#ffd67b', 80, 7); powerups.push({ x: boss.x, y: boss.y, type: 'shield', life: 8 }); boss = null; waveClock = -4; $('status').textContent = 'Comandante abatido. El escudo se recarga.'; updateHud(); } } });
  enemies.forEach(enemy => { bullets.forEach(bullet => { if (distance(bullet, enemy) < bullet.r + enemy.r) { enemy.hp -= bullet.damage; bullet.y = -100; addParticles(bullet.x, bullet.y + 100, enemy.type === 'tank' ? '#ffd67b' : '#7df7ff', 3, 1.6); if (enemy.hp <= 0) { score += enemy.type === 'tank' ? 300 : enemy.type === 'shooter' ? 180 : 100; if (Math.random() < .09) powerups.push({ x: enemy.x, y: enemy.y, type: 'shield', life: 8 }); addParticles(enemy.x, enemy.y, enemy.type === 'tank' ? '#ffd67b' : '#ff76bd', 16, 4); enemy.dead = true; updateHud(); } } }); if (distance(enemy, player) < enemy.r + player.r) { enemy.dead = true; hitPlayer(2); } }); enemies = enemies.filter(enemy => !enemy.dead);
  powerups.forEach(item => { item.y += 28 * dt; item.life -= dt; if (distance(item, player) < 24) { shield = Math.min(100, shield + 35); item.life = -1; addParticles(item.x, item.y, '#7df7ff', 16, 3); updateHud(); } }); powerups = powerups.filter(item => item.life > 0 && item.y < H + 30);
  particles.forEach(particle => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; particle.vx *= .98; particle.vy *= .98; }); particles = particles.filter(particle => particle.life > 0);
  if (shield < 100) shield = Math.min(100, shield + dt * .9); updateHud();
}
function updateBoss(dt) { boss.t += dt; boss.angle += dt; boss.y += (100 - boss.y) * Math.min(1, dt * 1.8); boss.x = W / 2 + Math.sin(boss.t * .8) * 210; boss.fire -= dt; if (boss.fire <= 0) { for (let i = 0; i < 8; i += 1) fireEnemy(boss.x, boss.y, boss.angle + i * Math.PI / 4, 135); boss.fire = 1.25; } }

function draw() {
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#090a20'); sky.addColorStop(1, '#151233'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const nebula = ctx.createRadialGradient(W * .72, H * .2, 8, W * .72, H * .2, 340); nebula.addColorStop(0, '#7c3b9855'); nebula.addColorStop(1, '#1b1b4a00'); ctx.fillStyle = nebula; ctx.fillRect(0, 0, W, H);
  stars.forEach(star => { ctx.globalAlpha = .3 + star.z / 2.5; ctx.fillStyle = star.z > 1.4 ? '#fff' : '#8bb7ff'; ctx.fillRect(star.x, star.y, star.size * star.z, star.size * star.z); }); ctx.globalAlpha = 1;
  bullets.forEach(bullet => { ctx.shadowBlur = 16; ctx.shadowColor = bullet.color; ctx.fillStyle = bullet.color; ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 15); });
  enemyBullets.forEach(bullet => { ctx.shadowBlur = 14; ctx.shadowColor = bullet.color; ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2); ctx.fill(); }); ctx.shadowBlur = 0;
  enemies.forEach(enemy => drawEnemy(enemy)); if (boss) drawBoss(); powerups.forEach(item => { ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(elapsed * 2); ctx.strokeStyle = '#7df7ff'; ctx.shadowBlur = 18; ctx.shadowColor = '#7df7ff'; ctx.lineWidth = 3; ctx.strokeRect(-11, -11, 22, 22); ctx.restore(); });
  particles.forEach(particle => { ctx.globalAlpha = Math.max(0, particle.life / particle.max); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1; drawPlayer();
  if (state === 'paused') { ctx.fillStyle = '#08091b99'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '700 32px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PAUSA TÁCTICA', W / 2, H / 2); ctx.textAlign = 'start'; }
}
function drawPlayer() { if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return; ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.tilt); ctx.shadowBlur = 22; ctx.shadowColor = '#7df7ff'; const body = ctx.createLinearGradient(0, -24, 0, 22); body.addColorStop(0, '#fff'); body.addColorStop(.45, '#7df7ff'); body.addColorStop(1, '#3855d9'); ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(17, 18); ctx.lineTo(6, 14); ctx.lineTo(0, 24); ctx.lineTo(-6, 14); ctx.lineTo(-17, 18); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#171b52'; ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff76bd'; ctx.fillRect(-3, 16, 6, 8); if (shield > 0) { ctx.strokeStyle = `rgba(125,247,255,${.12 + shield / 300})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); }
function drawEnemy(enemy) { ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(Math.sin(enemy.t * 2) * .2); ctx.shadowBlur = 14; ctx.shadowColor = enemy.type === 'tank' ? '#ffd67b' : '#ff76bd'; const color = enemy.type === 'tank' ? '#ffd67b' : enemy.type === 'shooter' ? '#ff9a7a' : '#ff76bd'; ctx.fillStyle = color; ctx.beginPath(); if (enemy.type === 'tank') { ctx.roundRect(-enemy.r, -enemy.r, enemy.r * 2, enemy.r * 2, 8); } else { ctx.moveTo(0, enemy.r); ctx.lineTo(enemy.r, -enemy.r); ctx.lineTo(0, -enemy.r * .45); ctx.lineTo(-enemy.r, -enemy.r); ctx.closePath(); } ctx.fill(); ctx.fillStyle = '#251331'; ctx.fillRect(-4, -3, 8, 6); ctx.fillStyle = '#fff4'; ctx.fillRect(-enemy.r, -enemy.r - 8, enemy.r * 2 * (enemy.hp / enemy.max), 3); ctx.restore(); }
function drawBoss() { ctx.save(); ctx.translate(boss.x, boss.y); ctx.rotate(boss.angle * .2); ctx.shadowBlur = 28; ctx.shadowColor = '#ff76bd'; const gradient = ctx.createRadialGradient(0, 0, 8, 0, 0, boss.r); gradient.addColorStop(0, '#fff'); gradient.addColorStop(.18, '#ffb2d9'); gradient.addColorStop(.6, '#c23b98'); gradient.addColorStop(1, '#3b1b68'); ctx.fillStyle = gradient; ctx.beginPath(); for (let i = 0; i < 12; i += 1) { const angle = i * Math.PI / 6; const radius = i % 2 ? boss.r * .75 : boss.r; ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#120f39'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7df7ff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.fillStyle = '#252952'; ctx.fillRect(W / 2 - 180, 22, 360, 8); ctx.fillStyle = '#ff76bd'; ctx.fillRect(W / 2 - 180, 22, 360 * Math.max(0, boss.hp / boss.max), 8); }
function loop(now) { if (state !== 'running') { draw(); return; } const dt = Math.min(.033, (now - last) / 1000 || .016); last = now; update(dt); draw(); requestAnimationFrame(loop); }

window.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Space'].includes(event.key)) event.preventDefault(); keys.add(event.key); if (event.key === 'Escape') togglePause(); });
window.addEventListener('keyup', event => keys.delete(event.key));
canvas.addEventListener('pointerdown', event => { pointer.active = true; canvas.setPointerCapture(event.pointerId); movePointer(event); });
canvas.addEventListener('pointermove', movePointer); canvas.addEventListener('pointerup', () => { pointer.active = false; });
function movePointer(event) { if (!pointer.active) return; const rect = canvas.getBoundingClientRect(); pointer.x = (event.clientX - rect.left) * W / rect.width; pointer.y = Math.max(H * .45, (event.clientY - rect.top) * H / rect.height); }
document.querySelectorAll('[data-key]').forEach(button => { const key = button.dataset.key; button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(key); }); button.addEventListener('pointerup', () => keys.delete(key)); button.addEventListener('pointerleave', () => keys.delete(key)); });
$('fire').addEventListener('pointerdown', () => { keys.add(' '); }); $('fire').addEventListener('pointerup', () => keys.delete(' ')); $('fire').addEventListener('pointerleave', () => keys.delete(' '));
$('start').addEventListener('click', start); $('pause').addEventListener('click', togglePause);
reset(); draw();
