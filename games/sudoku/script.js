const app = document.getElementById("app");

let configs = {};
let n, boxRows, boxCols, symbols, cluesToKeep;
let solution = [];
let puzzleGrid = []; // { value: 1..n | null, given: bool }
let selected = null;

function renderSizePicker() {
  app.innerHTML = `
    <div class="game-toolbar"><span class="pill">Größe wählen</span></div>
    <div class="grid">
      <button class="window-card" style="cursor:pointer; border:1.5px solid #ddd3ba;" data-size="4">
        <div class="icon">🔢</div>
        <h3>4×4 – Leicht</h3>
        <p>4 Symbole, 2×2-Blöcke.</p>
      </button>
      <button class="window-card" style="cursor:pointer; border:1.5px solid #ddd3ba;" data-size="6">
        <div class="icon">🔢</div>
        <h3>6×6 – Mittel</h3>
        <p>6 Symbole, 2×3-Blöcke.</p>
      </button>
    </div>
  `;
  app.querySelector('[data-size="4"]').onclick = () => startPuzzle("4");
  app.querySelector('[data-size="6"]').onclick = () => startPuzzle("6");
}

function startPuzzle(sizeKey) {
  const cfg = configs[sizeKey];
  n = Number(sizeKey);
  boxRows = cfg.boxRows;
  boxCols = cfg.boxCols;
  symbols = cfg.symbols;
  cluesToKeep = cfg.clues;

  solution = generateSolvedGrid(n, boxRows, boxCols);
  const positions = shuffle(Array.from({ length: n * n }, (_, i) => i));
  const keep = new Set(positions.slice(0, cluesToKeep));
  puzzleGrid = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    if (keep.has(i)) puzzleGrid.push({ value: solution[r][c], given: true });
    else puzzleGrid.push({ value: null, given: false });
  }
  selected = null;
  renderBoard();
}

function generateSolvedGrid(n, boxRows, boxCols) {
  const grid = Array.from({ length: n }, () => Array(n).fill(0));

  function isValid(r, c, v) {
    for (let i = 0; i < n; i++) {
      if (grid[r][i] === v) return false;
      if (grid[i][c] === v) return false;
    }
    const br = Math.floor(r / boxRows) * boxRows;
    const bc = Math.floor(c / boxCols) * boxCols;
    for (let rr = br; rr < br + boxRows; rr++) {
      for (let cc = bc; cc < bc + boxCols; cc++) {
        if (grid[rr][cc] === v) return false;
      }
    }
    return true;
  }

  function backtrack(pos) {
    if (pos === n * n) return true;
    const r = Math.floor(pos / n), c = pos % n;
    const candidates = shuffle(Array.from({ length: n }, (_, i) => i + 1));
    for (const v of candidates) {
      if (isValid(r, c, v)) {
        grid[r][c] = v;
        if (backtrack(pos + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  backtrack(0);
  return grid;
}

function renderBoard() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">${n}×${n} Sudoku</span>
      <button class="btn secondary" id="switchBtn">Größe wechseln</button>
      <button class="btn secondary" id="newBtn">Neues Rätsel</button>
    </div>
    <div id="sudokuGrid" style="display:grid; grid-template-columns: repeat(${n}, 1fr); max-width:${n * 60}px; margin:0 auto 18px; gap:2px; background:var(--gold-dim); padding:2px; border-radius:10px;"></div>
    <div id="palette" style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:14px;"></div>
    <div class="feedback" id="feedback" style="text-align:center;"></div>
  `;
  document.getElementById("switchBtn").onclick = renderSizePicker;
  document.getElementById("newBtn").onclick = () => startPuzzle(String(n));
  drawGrid();
  drawPalette();
}

function drawGrid() {
  const gridEl = document.getElementById("sudokuGrid");
  gridEl.innerHTML = "";
  const conflicts = computeConflicts();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const cell = puzzleGrid[i];
      const div = document.createElement("div");
      div.style.aspectRatio = "1";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.fontSize = "22px";
      div.style.background = cell.given ? "#ece3cd" : "#fffdf8";
      div.style.cursor = cell.given ? "default" : "pointer";
      div.style.borderRight = (c + 1) % boxCols === 0 && c !== n - 1 ? "3px solid var(--gold-dim)" : "1px solid #ddd3ba";
      div.style.borderBottom = (r + 1) % boxRows === 0 && r !== n - 1 ? "3px solid var(--gold-dim)" : "1px solid #ddd3ba";
      if (selected === i) div.style.outline = "3px solid var(--gold)";
      if (conflicts.has(i)) div.style.background = "rgba(209,125,110,0.25)";
      div.textContent = cell.value ? symbols[cell.value - 1] : "";
      if (!cell.given) div.onclick = () => { selected = i; renderBoard(); };
      gridEl.appendChild(div);
    }
  }
}

function drawPalette() {
  const palette = document.getElementById("palette");
  palette.innerHTML = "";
  symbols.forEach((sym, i) => {
    const btn = document.createElement("button");
    btn.className = "btn secondary";
    btn.style.fontSize = "20px";
    btn.textContent = sym;
    btn.onclick = () => placeSymbol(i + 1);
    palette.appendChild(btn);
  });
  const clearBtn = document.createElement("button");
  clearBtn.className = "btn secondary";
  clearBtn.textContent = "✖ Leeren";
  clearBtn.onclick = () => placeSymbol(null);
  palette.appendChild(clearBtn);
}

function placeSymbol(value) {
  if (selected === null) return;
  if (puzzleGrid[selected].given) return;
  puzzleGrid[selected].value = value;
  renderBoard();
  checkComplete();
}

function computeConflicts() {
  const conflicts = new Set();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const v = puzzleGrid[i].value;
      if (!v) continue;
      for (let cc = 0; cc < n; cc++) {
        if (cc !== c && puzzleGrid[r * n + cc].value === v) conflicts.add(i);
      }
      for (let rr = 0; rr < n; rr++) {
        if (rr !== r && puzzleGrid[rr * n + c].value === v) conflicts.add(i);
      }
      const br = Math.floor(r / boxRows) * boxRows;
      const bc = Math.floor(c / boxCols) * boxCols;
      for (let rr = br; rr < br + boxRows; rr++) {
        for (let cc = bc; cc < bc + boxCols; cc++) {
          const j = rr * n + cc;
          if (j !== i && puzzleGrid[j].value === v) conflicts.add(i);
        }
      }
    }
  }
  return conflicts;
}

function checkComplete() {
  const feedback = document.getElementById("feedback");
  const allFilled = puzzleGrid.every(cell => cell.value !== null);
  if (!allFilled) { feedback.textContent = ""; return; }
  const conflicts = computeConflicts();
  if (conflicts.size === 0) {
    feedback.textContent = "Gelöst! Wunderbar gemacht 🎉";
    feedback.className = "feedback good";
  } else {
    feedback.textContent = "Fast fertig – es gibt noch Konflikte (rot markiert).";
    feedback.className = "feedback bad";
  }
}

loadData("data.json").then(data => {
  configs = data;
  renderSizePicker();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
