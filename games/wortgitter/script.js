const app = document.getElementById("app");
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

let wordList = [];
let size = 0;
let grid = [];
let placements = []; // {word, cells:[[r,c],...]}
let foundWords = new Set();
let selecting = null; // {r,c} des ersten Klicks

function renderStart() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">${wordList.length} Begriffe im Wortschatz</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">Neues Wortgitter erzeugen</h2>
      <p>Aus dem Wortschatz werden alle Begriffe in ein frisches Raster eingebaut.</p>
      <button class="btn primary" id="startBtn">Raster erzeugen</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = startPuzzle;
}

function startPuzzle() {
  const built = buildGrid(wordList);
  size = built.size;
  grid = built.grid;
  placements = built.placements;
  foundWords = new Set();
  selecting = null;
  renderPuzzle();
}

function buildGrid(words) {
  const longest = Math.max(...words.map(w => w.length));
  let attemptSize = Math.max(longest + 2, Math.ceil(Math.sqrt(words.join("").length * 2.2)));

  for (let sizeAttempt = 0; sizeAttempt < 6; sizeAttempt++) {
    const s = attemptSize + sizeAttempt * 2;
    const result = tryBuildGrid(words, s);
    if (result) return result;
  }
  // Fallback: großzügiges Raster, notfalls ohne Kollisionsprüfung strikt
  return tryBuildGrid(words, attemptSize + 14, true);
}

function tryBuildGrid(words, s, force) {
  const g = Array.from({ length: s }, () => Array(s).fill(null));
  const placements = [];
  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    let placed = false;
    const maxTries = force ? 400 : 200;
    for (let t = 0; t < maxTries && !placed; t++) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const row = Math.floor(Math.random() * s);
      const col = Math.floor(Math.random() * s);
      const endRow = row + dir[0] * (word.length - 1);
      const endCol = col + dir[1] * (word.length - 1);
      if (endRow < 0 || endRow >= s || endCol < 0 || endCol >= s) continue;

      let ok = true;
      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        const existing = g[r][c];
        if (existing !== null && existing !== word[i]) { ok = false; break; }
        cells.push([r, c]);
      }
      if (!ok) continue;

      cells.forEach(([r, c], i) => (g[r][c] = word[i]));
      placements.push({ word, cells });
      placed = true;
    }
    if (!placed && !force) return null;
  }

  // Restliche Zellen mit Zufallsbuchstaben füllen
  for (let r = 0; r < s; r++) {
    for (let c = 0; c < s; c++) {
      if (!g[r][c]) g[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }
  return { size: s, grid: g, placements };
}

function renderPuzzle() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">✔ ${foundWords.size} / ${placements.length} gefunden</span>
      <button class="btn secondary" id="newBtn">Neues Raster</button>
    </div>
    ${progressBarHTML(foundWords.size, placements.length)}
    <div class="wordsearch-grid" id="grid" style="grid-template-columns: repeat(${size}, 28px);"></div>
    <div class="word-bank" id="wordBank"></div>
  `;
  document.getElementById("newBtn").onclick = startPuzzle;
  renderGrid();
  renderWordBank();
}

function renderGrid() {
  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = grid[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;
      if (isFound(r, c)) cell.classList.add("found");
      cell.onclick = () => handleCellClick(r, c, cell);
      gridEl.appendChild(cell);
    }
  }
}

function isFound(r, c) {
  return placements.some(p => foundWords.has(p.word) && p.cells.some(([pr, pc]) => pr === r && pc === c));
}

function renderWordBank() {
  const bank = document.getElementById("wordBank");
  bank.innerHTML = placements.map(p => `
    <span class="chip ${foundWords.has(p.word) ? "found" : ""}">${p.word}</span>
  `).join("");
}

function handleCellClick(r, c, cellEl) {
  if (!selecting) {
    selecting = { r, c, el: cellEl };
    cellEl.classList.add("selected");
    return;
  }
  const start = selecting;
  selecting = null;
  start.el.classList.remove("selected");

  if (start.r === r && start.c === c) return; // gleiche Zelle -> abbrechen

  const path = getLinePath(start.r, start.c, r, c);
  if (!path) return;

  const forward = path.map(([pr, pc]) => grid[pr][pc]).join("");
  const backward = forward.split("").reverse().join("");

  const match = placements.find(p =>
    !foundWords.has(p.word) &&
    (p.word === forward || p.word === backward) &&
    samePath(p.cells, path)
  );

  if (match) {
    foundWords.add(match.word);
    renderPuzzle();
    if (foundWords.size === placements.length) {
      setTimeout(renderDone, 400);
    }
  }
}

function getLinePath(r1, c1, r2, c2) {
  const dr = r2 - r1, dc = c2 - c1;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return null;
  const stepR = Math.sign(dr), stepC = Math.sign(dc);
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null; // keine gerade Linie
  const path = [];
  for (let i = 0; i <= steps; i++) {
    path.push([r1 + stepR * i, c1 + stepC * i]);
  }
  return path;
}

function samePath(cellsA, cellsB) {
  if (cellsA.length !== cellsB.length) return false;
  const norm = arr => arr.map(p => p.join(",")).sort().join("|");
  return norm(cellsA) === norm(cellsB);
}

function renderDone() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">Alle Wörter gefunden! 🎉</p>
      <div class="score">${placements.length} / ${placements.length}</div>
      <p>Starke Leistung – versuch dich an einem neuen Raster.</p>
      <button class="btn primary" id="againBtn">Neues Raster</button>
    </div>
  `;
  document.getElementById("againBtn").onclick = startPuzzle;
}

loadData("data.json").then(data => {
  wordList = data.words.map(w => w.toUpperCase());
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
