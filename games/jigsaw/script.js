/* ============================================================
   Echtes Puzzle mit ineinandergreifenden Puzzleteilen.
   Jedes Teil ist ein <div> mit clip-path: path(...) und einem
   Hintergrundbildausschnitt. Kanten werden einmal pro Innenkante
   kanonisch erzeugt und für die jeweils andere Seite exakt
   umgekehrt gezeichnet, damit die Teile lückenlos ineinandergreifen.
   ============================================================ */

const DISPLAY_SIZE = 360; // Kantenlänge des fertigen Bildes in Pixeln
const SIZES = [
  { key: "3", n: 3, label: "Leicht (3×3 – 9 Teile)" },
  { key: "4", n: 4, label: "Mittel (4×4 – 16 Teile)" },
  { key: "5", n: 5, label: "Schwer (5×5 – 25 Teile)" }
];
const SNAP_DISTANCE = 18;

const app = document.getElementById("app");

let images = [];
let currentImage = null;
let n = 3;
let pieceSize = 0;
let margin = 0;      // Überstand für Tabs rund um jedes Teil
let piecePaths = {}; // "r,c" -> lokaler Pfad-String (Element-relative Koordinaten)
let lockedCount = 0;
let totalPieces = 0;
let moves = 0;
let startTime = null;
let timerId = null;

/* ---------------- Kurven-Geometrie ---------------- */

function edgeCurveWorld(p0, p1, sign, perp, Hfrac = 0.22) {
  const [x0, y0] = p0, [x1, y1] = p1;
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / L, uy = dy / L;
  const [px, py] = perp;
  const H = Hfrac * L * sign;

  const pt = (tAlong, tPerp) => [x0 + ux * tAlong + px * tPerp, y0 + uy * tAlong + py * tPerp];

  const a = 0.35 * L, b = 0.65 * L, mid = 0.5 * L;
  const pA = pt(a, 0);
  const c1 = pt(a, H), c2 = pt(a + 0.07 * L, H), pMid = pt(mid, H);
  const c3 = pt(b - 0.07 * L, H), c4 = pt(b, H), pB = pt(b, 0);
  const pEnd = pt(L, 0);

  const fmt = (p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  const path =
    `L ${fmt(pA)} ` +
    `C ${fmt(c1)} ${fmt(c2)} ${fmt(pMid)} ` +
    `C ${fmt(c3)} ${fmt(c4)} ${fmt(pB)} ` +
    `L ${fmt(pEnd)}`;
  return path;
}

function parseSegments(pathStr) {
  const tokens = pathStr.trim().split(/\s+/);
  const segs = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === "L") {
      segs.push({ type: "L", pt: [parseFloat(tokens[i + 1]), parseFloat(tokens[i + 2])] });
      i += 3;
    } else if (tokens[i] === "C") {
      segs.push({
        type: "C",
        c1: [parseFloat(tokens[i + 1]), parseFloat(tokens[i + 2])],
        c2: [parseFloat(tokens[i + 3]), parseFloat(tokens[i + 4])],
        pt: [parseFloat(tokens[i + 5]), parseFloat(tokens[i + 6])]
      });
      i += 7;
    } else {
      i++; // unerwartetes Token überspringen
    }
  }
  return segs;
}

function reversePath(pathStr, startPoint) {
  const segs = parseSegments(pathStr);
  const points = [startPoint, ...segs.map(s => s.pt)];
  const out = [];
  for (let i = segs.length - 1; i >= 0; i--) {
    const endpoint = points[i];
    const seg = segs[i];
    const fmt = (p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
    if (seg.type === "L") {
      out.push(`L ${fmt(endpoint)}`);
    } else {
      out.push(`C ${fmt(seg.c2)} ${fmt(seg.c1)} ${fmt(endpoint)}`);
    }
  }
  return out.join(" ");
}

function shiftPathString(pathStr, dx, dy) {
  // Ersetzt alle "x y"-Zahlenpaare durch verschobene Werte, Befehlsbuchstaben bleiben stehen.
  const tokens = pathStr.trim().split(/\s+/);
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "M" || t === "L" || t === "C" || t === "Z") {
      out.push(t);
      i++;
    } else {
      const x = parseFloat(tokens[i]);
      const y = parseFloat(tokens[i + 1]);
      out.push((x + dx).toFixed(2), (y + dy).toFixed(2));
      i += 2;
    }
  }
  return out.join(" ");
}

/* ---------------- Gitter aus Teile-Pfaden bauen ---------------- */

function buildGridPaths(rows, cols, pw, ph) {
  const hSign = Array.from({ length: rows + 1 }, () => Array.from({ length: cols }, () => (Math.random() < 0.5 ? 1 : -1)));
  const vSign = Array.from({ length: rows }, () => Array.from({ length: cols + 1 }, () => (Math.random() < 0.5 ? 1 : -1)));

  const hCurve = {}; // Schlüssel "r,c" für innere Kanten r=1..rows-1
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p0 = [c * pw, r * ph], p1 = [(c + 1) * pw, r * ph];
      hCurve[r + "," + c] = { curve: edgeCurveWorld(p0, p1, hSign[r][c], [0, 1]), p0, p1 };
    }
  }
  const vCurve = {}; // Schlüssel "r,c" für innere Kanten c=1..cols-1
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      const p0 = [c * pw, r * ph], p1 = [c * pw, (r + 1) * ph];
      vCurve[r + "," + c] = { curve: edgeCurveWorld(p0, p1, vSign[r][c], [1, 0]), p0, p1 };
    }
  }

  const paths = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * pw, y0 = r * ph, x1 = x0 + pw, y1 = y0 + ph;
      let d = `M ${x0} ${y0} `;

      // TOP: links -> rechts
      if (r === 0) d += `L ${x1} ${y0} `;
      else d += hCurve[r + "," + c].curve + " ";

      // RIGHT: oben -> unten
      if (c === cols - 1) d += `L ${x1} ${y1} `;
      else d += vCurve[r + "," + (c + 1)].curve + " ";

      // BOTTOM: rechts -> links (Umkehrung der links->rechts gespeicherten Kurve)
      if (r === rows - 1) d += `L ${x0} ${y1} `;
      else {
        const entry = hCurve[(r + 1) + "," + c];
        d += reversePath(entry.curve, entry.p0) + " ";
      }

      // LEFT: unten -> oben (Umkehrung der oben->unten gespeicherten Kurve)
      if (c === 0) d += `L ${x0} ${y0} `;
      else {
        const entry = vCurve[r + "," + c];
        d += reversePath(entry.curve, entry.p0) + " ";
      }

      d += "Z";
      paths[r + "," + c] = d;
    }
  }
  return paths;
}

/* ---------------- UI: Auswahl ---------------- */

function renderPicker() {
  clearInterval(timerId);
  app.innerHTML = `
    <div class="game-toolbar"><span class="pill">Motiv &amp; Größe wählen</span></div>
    <h3 style="font-family:var(--font-display);">Motiv</h3>
    <div class="grid" id="imageGrid" style="margin-bottom:24px;"></div>
    <h3 style="font-family:var(--font-display);">Schwierigkeit</h3>
    <div class="options" id="sizeOptions"></div>
  `;
  const imageGrid = document.getElementById("imageGrid");
  images.forEach(img => {
    const btn = document.createElement("button");
    btn.className = "window-card";
    btn.style.cursor = "pointer";
    btn.style.border = "1.5px solid #ddd3ba";
    btn.style.padding = "0";
    btn.style.overflow = "hidden";
    btn.innerHTML = `
      <img src="${img.file}" alt="${img.label}" style="width:100%; height:140px; object-fit:cover; border-radius:14px 14px 0 0;">
      <div style="padding:14px 16px;"><h3 style="margin:0;">${img.label}</h3></div>
    `;
    btn.onclick = () => { currentImage = img; highlightSelection(imageGrid, btn); };
    imageGrid.appendChild(btn);
  });
  currentImage = images[0];
  highlightSelection(imageGrid, imageGrid.firstChild);

  const sizeOptions = document.getElementById("sizeOptions");
  SIZES.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = s.label;
    btn.onclick = () => { n = s.n; startPuzzle(); };
    sizeOptions.appendChild(btn);
  });
}

function highlightSelection(container, selectedEl) {
  Array.from(container.children).forEach(c => (c.style.outline = "none"));
  selectedEl.style.outline = `3px solid var(--gold)`;
}

/* ---------------- Spielaufbau ---------------- */

function startPuzzle() {
  pieceSize = DISPLAY_SIZE / n;
  margin = pieceSize * 0.32;
  piecePaths = buildGridPaths(n, n, pieceSize, pieceSize);
  lockedCount = 0;
  totalPieces = n * n;
  moves = 0;
  startTime = Date.now();
  renderBoard();
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function updateTimer() {
  const pill = document.getElementById("timePill");
  if (pill) pill.textContent = "⏱️ " + formatTime(Math.floor((Date.now() - startTime) / 1000));
}

function renderBoard() {
  const workspaceW = Math.max(DISPLAY_SIZE + 40, DISPLAY_SIZE * 1.9);
  const workspaceH = DISPLAY_SIZE + 40 + pieceSize * 1.6;

  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">🖼️ ${currentImage.label}</span>
      <span class="pill">✔ ${lockedCount} / ${totalPieces} Teile</span>
      <span class="pill" id="timePill">⏱️ 00:00</span>
      <button class="btn secondary" id="switchBtn">Motiv/Größe wechseln</button>
    </div>
    ${progressBarHTML(lockedCount, totalPieces)}
    <p style="text-align:center; opacity:.7; margin:0 0 10px;">Ziehe die Teile an ihren Platz im gestrichelten Rahmen.</p>
    <div id="workspace" style="position:relative; width:100%; max-width:${workspaceW}px; height:${workspaceH}px;
        margin:0 auto; overflow:auto; background:rgba(255,255,255,0.04); border-radius:14px; border:1px dashed rgba(216,171,92,0.3);">
      <div id="targetFrame" style="position:absolute; left:20px; top:20px; width:${DISPLAY_SIZE}px; height:${DISPLAY_SIZE}px;
          border:2px dashed var(--gold-dim); border-radius:6px; background-image:url('${currentImage.file}');
          background-size:${DISPLAY_SIZE}px ${DISPLAY_SIZE}px; opacity:1;">
        <div style="position:absolute; inset:0; background:rgba(18,23,42,0.72);"></div>
      </div>
    </div>
  `;
  document.getElementById("switchBtn").onclick = renderPicker;

  const workspace = document.getElementById("workspace");
  const targetLeft = 20, targetTop = 20;
  const scatterTop = targetTop + DISPLAY_SIZE + 20;
  const scatterHeight = pieceSize * 1.4;

  const order = shuffle(Array.from({ length: n * n }, (_, i) => i));
  order.forEach((idx, shuffleIdx) => {
    const r = Math.floor(idx / n), c = idx % n;
    createPieceEl(r, c, targetLeft, targetTop, workspace, shuffleIdx, scatterTop, scatterHeight, workspaceW);
  });
}

function createPieceEl(r, c, targetLeft, targetTop, workspace, shuffleIdx, scatterTop, scatterHeight, workspaceW) {
  const key = r + "," + c;
  const localPath = shiftPathString(piecePaths[key], margin, margin);
  const boxSize = pieceSize + margin * 2;

  const correctX = targetLeft + c * pieceSize - margin;
  const correctY = targetTop + r * pieceSize - margin;

  const el = document.createElement("div");
  el.className = "puzzle-piece";
  el.style.position = "absolute";
  el.style.width = boxSize + "px";
  el.style.height = boxSize + "px";
  el.style.clipPath = `path('${localPath}')`;
  el.style.backgroundImage = `url('${currentImage.file}')`;
  el.style.backgroundSize = `${DISPLAY_SIZE}px ${DISPLAY_SIZE}px`;
  el.style.backgroundPosition = `${-(c * pieceSize - margin)}px ${-(r * pieceSize - margin)}px`;
  el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.45))";
  el.style.cursor = "grab";
  el.style.touchAction = "none";
  el.dataset.correctX = correctX;
  el.dataset.correctY = correctY;
  el.dataset.locked = "0";

  // Zufällige Startposition im "Vorrat"-Bereich unterhalb des Zielrahmens
  const maxX = Math.max(10, workspaceW - boxSize - 10);
  const startX = 10 + Math.random() * maxX;
  const startY = scatterTop + Math.random() * Math.max(10, scatterHeight - boxSize);
  el.style.left = startX + "px";
  el.style.top = startY + "px";
  el.style.zIndex = 1 + shuffleIdx;

  attachDragHandlers(el, workspace);
  workspace.appendChild(el);
}

/* ---------------- Drag & Drop (Pointer Events) ---------------- */

function attachDragHandlers(el, workspace) {
  let dragging = false;
  let offsetX = 0, offsetY = 0;
  let zCounter = 500;

  el.addEventListener("pointerdown", (e) => {
    if (el.dataset.locked === "1") return;
    dragging = true;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    el.style.cursor = "grabbing";
    el.style.zIndex = ++zCounter;
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const wsRect = workspace.getBoundingClientRect();
    const newLeft = e.clientX - wsRect.left - offsetX + workspace.scrollLeft;
    const newTop = e.clientY - wsRect.top - offsetY + workspace.scrollTop;
    el.style.left = newLeft + "px";
    el.style.top = newTop + "px";
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = "grab";
    moves++;

    const curLeft = parseFloat(el.style.left);
    const curTop = parseFloat(el.style.top);
    const correctX = parseFloat(el.dataset.correctX);
    const correctY = parseFloat(el.dataset.correctY);
    const dist = Math.hypot(curLeft - correctX, curTop - correctY);

    if (dist <= SNAP_DISTANCE) {
      el.style.left = correctX + "px";
      el.style.top = correctY + "px";
      el.dataset.locked = "1";
      el.style.cursor = "default";
      el.style.filter = "none";
      el.style.zIndex = 10;
      lockedCount++;
      updateProgress();
      if (lockedCount === totalPieces) {
        clearInterval(timerId);
        setTimeout(renderWin, 400);
      }
    }
  }

  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
}

function updateProgress() {
  const pill = document.querySelectorAll(".pill")[1];
  if (pill) pill.textContent = `✔ ${lockedCount} / ${totalPieces} Teile`;
  const fill = document.querySelector(".progress-fill");
  if (fill) fill.style.width = Math.round((lockedCount / totalPieces) * 100) + "%";
}

function renderWin() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">Zusammengesetzt! 🎉</p>
      <div class="score">${formatTime(Math.floor((Date.now() - startTime) / 1000))}</div>
      <p>${currentImage.label} – ${totalPieces} Teile, ${moves} Züge</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn primary" id="againBtn">Neu mischen</button>
        <button class="btn secondary" id="switchBtn">Motiv/Größe wechseln</button>
      </div>
    </div>
  `;
  document.getElementById("againBtn").onclick = startPuzzle;
  document.getElementById("switchBtn").onclick = renderPicker;
}

loadData("data.json").then(data => {
  images = data;
  renderPicker();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
