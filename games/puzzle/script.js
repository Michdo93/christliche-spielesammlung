const BOARD_PX = 360; // Kantenlänge des Spielfelds in Pixeln
const SIZES = [
  { key: "3", n: 3, label: "Leicht (3×3)" },
  { key: "4", n: 4, label: "Mittel (4×4)" }
];

const app = document.getElementById("app");

let images = [];
let currentImage = null;
let n = 3;
let tiles = []; // tiles[position] = originalValue (0..n*n-1), letzter Wert = Blank
let moves = 0;
let startTime = null;
let timerId = null;

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
  images.forEach((img, i) => {
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

function startPuzzle() {
  const total = n * n;
  tiles = Array.from({ length: total }, (_, i) => i);
  shuffleSolvable();
  moves = 0;
  startTime = Date.now();
  renderBoard();
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
}

function shuffleSolvable() {
  const total = n * n;
  let blankPos = total - 1;
  const shuffleMoves = n * n * 40;
  for (let i = 0; i < shuffleMoves; i++) {
    const neighbors = getNeighborPositions(blankPos);
    const swapWith = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blankPos], tiles[swapWith]] = [tiles[swapWith], tiles[blankPos]];
    blankPos = swapWith;
  }
}

function getNeighborPositions(pos) {
  const row = Math.floor(pos / n), col = pos % n;
  const result = [];
  if (row > 0) result.push(pos - n);
  if (row < n - 1) result.push(pos + n);
  if (col > 0) result.push(pos - 1);
  if (col < n - 1) result.push(pos + 1);
  return result;
}

function updateTimer() {
  const pill = document.getElementById("timePill");
  if (pill) pill.textContent = "⏱️ " + formatTime(Math.floor((Date.now() - startTime) / 1000));
}
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderBoard() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">🖼️ ${currentImage.label}</span>
      <span class="pill">🔁 ${moves} Züge</span>
      <span class="pill" id="timePill">⏱️ 00:00</span>
      <button class="btn secondary" id="switchBtn">Motiv wechseln</button>
    </div>
    <div class="puzzle-board" id="board" style="width:${BOARD_PX}px; height:${BOARD_PX}px;"></div>
    <p style="text-align:center; opacity:.7;">Klicke eine Kachel neben dem leeren Feld an, um sie zu verschieben.</p>
  `;
  document.getElementById("switchBtn").onclick = renderPicker;
  drawTiles();
}

function drawTiles() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  const tileSize = BOARD_PX / n;
  const blankValue = n * n - 1;

  tiles.forEach((value, pos) => {
    const row = Math.floor(pos / n), col = pos % n;
    const el = document.createElement("div");
    el.className = "puzzle-tile" + (value === blankValue ? " blank" : "");
    el.style.width = tileSize + "px";
    el.style.height = tileSize + "px";
    el.style.top = row * tileSize + "px";
    el.style.left = col * tileSize + "px";

    if (value !== blankValue) {
      const origRow = Math.floor(value / n), origCol = value % n;
      el.style.backgroundImage = `url('${currentImage.file}')`;
      el.style.backgroundSize = `${n * 100}% ${n * 100}%`;
      el.style.backgroundPosition = `${(origCol / (n - 1)) * 100}% ${(origRow / (n - 1)) * 100}%`;
      el.onclick = () => handleTileClick(pos);
    }
    board.appendChild(el);
  });
}

function handleTileClick(pos) {
  const blankValue = n * n - 1;
  const blankPos = tiles.indexOf(blankValue);
  const neighbors = getNeighborPositions(blankPos);
  if (!neighbors.includes(pos)) return;

  [tiles[blankPos], tiles[pos]] = [tiles[pos], tiles[blankPos]];
  moves++;
  drawTiles();
  document.querySelectorAll(".pill")[1].textContent = `🔁 ${moves} Züge`;

  if (isSolved()) {
    clearInterval(timerId);
    setTimeout(renderWin, 400);
  }
}

function isSolved() {
  return tiles.every((v, i) => v === i);
}

function renderWin() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">Gelöst! 🎉</p>
      <div class="score">${moves} Züge</div>
      <p>Zeit: ${formatTime(Math.floor((Date.now() - startTime) / 1000))}</p>
      <p>${currentImage.label}</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn primary" id="againBtn">Neu mischen</button>
        <button class="btn secondary" id="switchBtn">Motiv wechseln</button>
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
