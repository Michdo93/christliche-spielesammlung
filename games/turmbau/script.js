/* ============================================================
   Turmbau zu Babel – ein Stapel-Geschicklichkeitsspiel.
   Fester, sehr hoher virtueller Turm-Container (WORLD_HEIGHT),
   damit bereits platzierte Bausteine nie neu positioniert werden
   müssen – nur der sichtbare Ausschnitt (Kamera/scrollTop) wandert
   nach oben mit, während der Turm wächst.
   ============================================================ */

const CONTAINER_WIDTH = 300;
const BLOCK_HEIGHT = 28;
const INITIAL_WIDTH = 150;
const VIEWPORT_HEIGHT = 420;
const TOP_HEADROOM = 70;      // Platz oberhalb des aktuellen Turms für den beweglichen Baustein
const WORLD_HEIGHT = 24000;   // großzügig fixer virtueller Gesamtraum
const BASE_SPEED = 1.6;       // px pro Frame
const SPEED_INCREMENT = 0.045;
const MAX_SPEED = 4.6;
const MISS_TOLERANCE = 2;     // px, unterhalb dessen ein minimaler Überlapp noch zählt

const COLORS = ["#c98f43", "#d8ab5c", "#b07a3e", "#8a6f3d", "#a97c4f", "#caa25c"];

const app = document.getElementById("app");

let narrative = null;
let blocks = [];       // { x, width, colorIndex }
let moving = null;      // { x, width, dir, speed }
let animId = null;
let shownMilestones = new Set();
let highScore = 0;

function loadHighScore() {
  try {
    return Number(localStorage.getItem("babel-tower-highscore") || "0");
  } catch (e) { return 0; }
}
function saveHighScore(v) {
  try { localStorage.setItem("babel-tower-highscore", String(v)); } catch (e) { /* ignore */ }
}

function renderStart() {
  cancelAnimationFrame(animId);
  app.innerHTML = `
    <div class="result">
      <p class="pill">🏆 Bestwert: ${highScore} Bausteine</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">Bereit, den Turm zu bauen?</h2>
      <p style="max-width:480px; margin:0 auto 18px;">${narrative.intro}</p>
      <p style="opacity:.7; font-size:14px;">Tippe / klicke / Leertaste, um den beweglichen Baustein exakt auf dem Turm abzulegen.</p>
      <button class="btn primary" id="startBtn">Turmbau beginnen</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = startGame;
}

function startGame() {
  blocks = [{ x: (CONTAINER_WIDTH - INITIAL_WIDTH) / 2, width: INITIAL_WIDTH, colorIndex: 0 }];
  shownMilestones = new Set();
  spawnMoving();
  renderGame();
  startLoop();
}

function spawnMoving() {
  const topWidth = blocks[blocks.length - 1].width;
  const fromLeft = blocks.length % 2 === 0;
  const speed = Math.min(MAX_SPEED, BASE_SPEED + blocks.length * SPEED_INCREMENT);
  moving = {
    x: fromLeft ? 0 : CONTAINER_WIDTH - topWidth,
    width: topWidth,
    dir: fromLeft ? 1 : -1,
    speed
  };
}

function renderGame() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">🗼 Höhe: ${blocks.length - 1}</span>
      <span class="pill">🏆 Bestwert: ${highScore}</span>
    </div>
    <div id="babelViewport" style="
        position:relative; width:100%; max-width:${CONTAINER_WIDTH}px; height:${VIEWPORT_HEIGHT}px;
        margin:0 auto; overflow:hidden; border-radius:14px; border:2px solid var(--gold-dim);
        background:linear-gradient(180deg,#1c2340 0%,#3c4a6b 55%,#c98f43 100%); cursor:pointer;">
      <div id="milestoneBanner" style="
          position:absolute; left:0; right:0; top:0; padding:10px 14px; font-size:13px; text-align:center;
          background:rgba(18,23,42,0.82); color:var(--gold-light); z-index:50; transform:translateY(-110%);
          transition: transform .5s ease;"></div>
      <div id="stackWorld" style="position:absolute; left:0; top:0; width:100%; height:${WORLD_HEIGHT}px;"></div>
    </div>
    <p style="text-align:center; opacity:.65; margin-top:10px;">Tippen / Klicken / Leertaste zum Ablegen</p>
  `;
  const viewport = document.getElementById("babelViewport");
  viewport.addEventListener("click", drop);
  drawAll();
}

function worldTop(index) {
  return WORLD_HEIGHT - (index + 1) * BLOCK_HEIGHT;
}

function drawAll() {
  const stackWorld = document.getElementById("stackWorld");
  if (!stackWorld) return;
  stackWorld.innerHTML = "";
  blocks.forEach((b, i) => {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.left = b.x + "px";
    el.style.top = worldTop(i) + "px";
    el.style.width = b.width + "px";
    el.style.height = BLOCK_HEIGHT + "px";
    el.style.background = COLORS[b.colorIndex % COLORS.length];
    el.style.borderTop = "2px solid rgba(255,255,255,0.25)";
    el.style.borderBottom = "2px solid rgba(0,0,0,0.25)";
    el.style.boxSizing = "border-box";
    stackWorld.appendChild(el);
  });

  if (moving) {
    const el = document.createElement("div");
    el.id = "movingBlock";
    el.style.position = "absolute";
    el.style.left = moving.x + "px";
    el.style.top = worldTop(blocks.length) + "px";
    el.style.width = moving.width + "px";
    el.style.height = BLOCK_HEIGHT + "px";
    el.style.background = COLORS[blocks.length % COLORS.length];
    el.style.borderTop = "2px solid rgba(255,255,255,0.35)";
    el.style.borderBottom = "2px solid rgba(0,0,0,0.25)";
    el.style.boxSizing = "border-box";
    stackWorld.appendChild(el);
  }

  updateCamera();
}

function updateCamera(smooth) {
  const viewport = document.getElementById("babelViewport");
  if (!viewport) return;
  const topIndex = blocks.length; // Index des beweglichen Bausteins (aktuell höchster Punkt)
  const topAbs = worldTop(topIndex);
  const targetScrollTop = topAbs - TOP_HEADROOM;
  viewport.style.scrollBehavior = smooth ? "smooth" : "auto";
  viewport.scrollTop = Math.max(0, targetScrollTop);
}

/* ---------------- Bewegung & Ablegen ---------------- */

function startLoop() {
  cancelAnimationFrame(animId);
  function frame() {
    if (moving) {
      moving.x += moving.dir * moving.speed;
      const maxX = CONTAINER_WIDTH - moving.width;
      if (moving.x <= 0) { moving.x = 0; moving.dir = 1; }
      if (moving.x >= maxX) { moving.x = maxX; moving.dir = -1; }
      const el = document.getElementById("movingBlock");
      if (el) el.style.left = moving.x + "px";
    }
    animId = requestAnimationFrame(frame);
  }
  animId = requestAnimationFrame(frame);
}

function drop() {
  if (!moving) return;
  const top = blocks[blocks.length - 1];
  const overlapStart = Math.max(moving.x, top.x);
  const overlapEnd = Math.min(moving.x + moving.width, top.x + top.width);
  const overlapWidth = overlapEnd - overlapStart;

  if (overlapWidth <= MISS_TOLERANCE) {
    triggerCollapse();
    return;
  }

  const trimmedLeft = overlapStart > moving.x;
  const trimmedRight = (moving.x + moving.width) > overlapEnd;
  if (trimmedLeft) spawnFallingPiece(moving.x, overlapStart - moving.x, blocks.length);
  if (trimmedRight) spawnFallingPiece(overlapEnd, (moving.x + moving.width) - overlapEnd, blocks.length);

  blocks.push({ x: overlapStart, width: overlapWidth, colorIndex: blocks.length });
  checkMilestone();

  if (blocks.length - 1 > highScore) {
    highScore = blocks.length - 1;
    saveHighScore(highScore);
  }

  spawnMoving();
  drawAll();
  document.querySelectorAll(".pill")[0].textContent = `🗼 Höhe: ${blocks.length - 1}`;
  document.querySelectorAll(".pill")[1].textContent = `🏆 Bestwert: ${highScore}`;
}

function spawnFallingPiece(x, width, index) {
  if (width <= 0.5) return;
  const stackWorld = document.getElementById("stackWorld");
  if (!stackWorld) return;
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.left = x + "px";
  el.style.top = worldTop(index) + "px";
  el.style.width = width + "px";
  el.style.height = BLOCK_HEIGHT + "px";
  el.style.background = COLORS[index % COLORS.length];
  el.style.transition = "transform 0.7s ease-in, opacity 0.7s ease-in";
  stackWorld.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = "translateY(200px) rotate(12deg)";
    el.style.opacity = "0";
  });
  setTimeout(() => el.remove(), 750);
}

function checkMilestone() {
  const score = blocks.length - 1;
  const milestone = narrative.milestones.find(m => m.score === score && !shownMilestones.has(m.score));
  if (milestone) {
    shownMilestones.add(milestone.score);
    showBanner(milestone.text, 4200);
  }
}

function showBanner(text, duration) {
  const banner = document.getElementById("milestoneBanner");
  if (!banner) return;
  banner.textContent = text;
  banner.style.transform = "translateY(0)";
  setTimeout(() => {
    if (banner) banner.style.transform = "translateY(-110%)";
  }, duration);
}

function triggerCollapse() {
  cancelAnimationFrame(animId);
  const finalScore = blocks.length - 1;
  const el = document.getElementById("movingBlock");
  if (el) {
    el.style.transition = "transform 0.9s ease-in, opacity 0.9s ease-in";
    el.style.transform = "translateY(250px) rotate(20deg)";
    el.style.opacity = "0";
  }
  moving = null;
  setTimeout(() => renderGameOver(finalScore), 500);
}

function renderGameOver(finalScore) {
  const isNewHighScore = finalScore >= highScore && finalScore > 0;
  app.innerHTML = `
    <div class="result">
      <p class="pill">Turmbau gestoppt 🌀</p>
      <div class="score">${finalScore}</div>
      <p style="max-width:480px; margin:0 auto 14px;">${narrative.collapseText}</p>
      ${isNewHighScore ? `<p class="pill">🏆 Neuer Bestwert!</p>` : `<p class="pill">🏆 Bestwert: ${highScore}</p>`}
      <button class="btn primary" id="againBtn">Neu bauen</button>
    </div>
  `;
  document.getElementById("againBtn").onclick = startGame;
}

/* ---------------- Tastatursteuerung ---------------- */
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    if (moving) drop();
  }
});

loadData("data.json").then(data => {
  narrative = data;
  highScore = loadHighScore();
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
