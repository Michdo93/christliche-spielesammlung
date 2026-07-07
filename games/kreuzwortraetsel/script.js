const app = document.getElementById("app");
const WORDS_PER_ROUND = 12;
const OFFSET = 60; // virtueller Ursprung, um negative Indizes zu vermeiden

let wordPool = [];
let placedWords = [];  // { word, clue, row, col, dir, number }
let cellMap = {};       // "r,c" -> letter
let bounds = null;
let userGrid = {};      // "r,c" -> eingegebener Buchstabe

function renderStart() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">${wordPool.length} Begriffe im Pool</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">Neues Rätsel erzeugen</h2>
      <p>Aus bis zu ${Math.min(WORDS_PER_ROUND, wordPool.length)} zufälligen Begriffen wird ein
      Kreuzworträtsel zusammengebaut.</p>
      <button class="btn primary" id="startBtn">Rätsel erzeugen</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = buildPuzzle;
}

function buildPuzzle() {
  const chosen = pickRandom(wordPool, Math.min(WORDS_PER_ROUND, wordPool.length));
  const result = generateCrossword(chosen);
  placedWords = result.placed;
  cellMap = result.cellMap;
  bounds = result.bounds;
  assignNumbers();
  userGrid = {};
  renderPuzzle();
}

/* ---------------- Generator ---------------- */

function generateCrossword(words) {
  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);
  const cellMap = {};
  const placed = [];

  function canPlace(word, row, col, dir) {
    for (let i = 0; i < word.length; i++) {
      const r = dir === "H" ? row : row + i;
      const c = dir === "H" ? col + i : col;
      const key = r + "," + c;
      const existing = cellMap[key];
      if (existing !== undefined && existing !== word[i]) return false;

      // Nachbarzellen senkrecht zur Wortrichtung müssen an Nicht-Überlapp-Stellen frei sein
      if (existing === undefined) {
        if (dir === "H") {
          if (cellMap[(r - 1) + "," + c] !== undefined) return false;
          if (cellMap[(r + 1) + "," + c] !== undefined) return false;
        } else {
          if (cellMap[r + "," + (c - 1)] !== undefined) return false;
          if (cellMap[r + "," + (c + 1)] !== undefined) return false;
        }
      }
    }
    // Zellen direkt vor und nach dem Wort müssen frei sein (kein Verschmelzen mit anderen Wörtern)
    const beforeR = dir === "H" ? row : row - 1;
    const beforeC = dir === "H" ? col - 1 : col;
    const afterR = dir === "H" ? row : row + word.length;
    const afterC = dir === "H" ? col + word.length : col;
    if (cellMap[beforeR + "," + beforeC] !== undefined) return false;
    if (cellMap[afterR + "," + afterC] !== undefined) return false;
    return true;
  }

  function place(entry, row, col, dir) {
    for (let i = 0; i < entry.word.length; i++) {
      const r = dir === "H" ? row : row + i;
      const c = dir === "H" ? col + i : col;
      cellMap[r + "," + c] = entry.word[i];
    }
    placed.push({ word: entry.word, clue: entry.clue, row, col, dir });
  }

  // Erstes Wort in die Mitte setzen
  const first = sorted[0];
  place(first, OFFSET, OFFSET, "H");

  const unplaced = [];

  for (let idx = 1; idx < sorted.length; idx++) {
    const entry = sorted[idx];
    let bestCandidate = null;
    const candidates = [];

    for (const p of placed) {
      for (let i = 0; i < entry.word.length; i++) {
        for (let j = 0; j < p.word.length; j++) {
          if (entry.word[i] !== p.word[j]) continue;
          const newDir = p.dir === "H" ? "V" : "H";
          let row, col;
          if (p.dir === "H") {
            row = p.row - i;
            col = p.col + j;
          } else {
            row = p.row + j;
            col = p.col - i;
          }
          if (canPlace(entry.word, row, col, newDir)) {
            candidates.push({ row, col, dir: newDir });
          }
        }
      }
    }

    if (candidates.length > 0) {
      bestCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      place(entry, bestCandidate.row, bestCandidate.col, bestCandidate.dir);
    } else {
      unplaced.push(entry);
    }
  }

  // Fallback: nicht platzierbare Wörter untereinander anhängen
  if (unplaced.length > 0) {
    let maxRow = Math.max(...placed.map(p => (p.dir === "H" ? p.row : p.row + p.word.length - 1)));
    unplaced.forEach((entry, i) => {
      const row = maxRow + 2 + i * 2;
      place(entry, row, OFFSET, "H");
    });
  }

  // Bounding Box berechnen
  let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
  Object.keys(cellMap).forEach(key => {
    const [r, c] = key.split(",").map(Number);
    minRow = Math.min(minRow, r);
    maxRow = Math.max(maxRow, r);
    minCol = Math.min(minCol, c);
    maxCol = Math.max(maxCol, c);
  });

  return { placed, cellMap, bounds: { minRow, maxRow, minCol, maxCol } };
}

function assignNumbers() {
  let counter = 1;
  const startMap = {}; // "r,c" -> number
  const sortedByPosition = [...placedWords].sort((a, b) => (a.row - b.row) || (a.col - b.col));

  sortedByPosition.forEach(p => {
    const key = p.row + "," + p.col;
    if (!(key in startMap)) {
      startMap[key] = counter++;
    }
    p.number = startMap[key];
  });
}

/* ---------------- Rendering ---------------- */

function renderPuzzle() {
  const { minRow, maxRow, minCol, maxCol } = bounds;
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;

  const across = placedWords.filter(p => p.dir === "H").sort((a, b) => a.number - b.number);
  const down = placedWords.filter(p => p.dir === "V").sort((a, b) => a.number - b.number);

  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">${placedWords.length} Begriffe</span>
      <button class="btn secondary" id="newBtn">Neues Rätsel</button>
      <button class="btn primary" id="checkBtn">Prüfen</button>
    </div>
    <div style="overflow-x:auto; margin-bottom:20px;">
      <div id="cwGrid" style="display:inline-grid; grid-template-columns: repeat(${cols}, 32px); gap:1px; background:var(--gold-dim); padding:1px; border-radius:6px;"></div>
    </div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
      <div>
        <h3 style="font-family:var(--font-display); margin-top:0;">Waagerecht →</h3>
        <ol style="padding-left:20px;">
          ${across.map(p => `<li value="${p.number}">${p.clue}</li>`).join("")}
        </ol>
      </div>
      <div>
        <h3 style="font-family:var(--font-display); margin-top:0;">Senkrecht ↓</h3>
        <ol style="padding-left:20px;">
          ${down.map(p => `<li value="${p.number}">${p.clue}</li>`).join("")}
        </ol>
      </div>
    </div>
    <div class="feedback" id="feedback" style="text-align:center; margin-top:12px;"></div>
  `;
  document.getElementById("newBtn").onclick = buildPuzzle;
  document.getElementById("checkBtn").onclick = checkPuzzle;
  drawGrid(rows, cols, minRow, minCol);
}

function drawGrid(rows, cols, minRow, minCol) {
  const gridEl = document.getElementById("cwGrid");
  gridEl.innerHTML = "";

  const numberAt = {};
  placedWords.forEach(p => { numberAt[p.row + "," + p.col] = p.number; });

  for (let r = minRow; r < minRow + rows; r++) {
    for (let c = minCol; c < minCol + cols; c++) {
      const key = r + "," + c;
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "32px";
      wrapper.style.height = "32px";

      if (cellMap[key] === undefined) {
        wrapper.style.background = "var(--night)";
      } else {
        wrapper.style.background = "#fffdf8";
        const num = numberAt[key];
        if (num) {
          const label = document.createElement("span");
          label.textContent = num;
          label.style.position = "absolute";
          label.style.top = "1px";
          label.style.left = "2px";
          label.style.fontSize = "9px";
          label.style.color = "#8a6f3d";
          wrapper.appendChild(label);
        }
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.value = userGrid[key] || "";
        input.style.width = "100%";
        input.style.height = "100%";
        input.style.border = "none";
        input.style.textAlign = "center";
        input.style.fontSize = "16px";
        input.style.fontWeight = "700";
        input.style.textTransform = "uppercase";
        input.style.background = "transparent";
        input.style.padding = "0";
        input.oninput = (e) => {
          const val = e.target.value.toUpperCase().slice(-1);
          e.target.value = val;
          userGrid[key] = val;
        };
        wrapper.appendChild(input);
      }
      gridEl.appendChild(wrapper);
    }
  }
}

function checkPuzzle() {
  const feedback = document.getElementById("feedback");
  const inputs = document.querySelectorAll("#cwGrid input");
  let correct = 0, filled = 0, total = 0;

  Object.keys(cellMap).forEach(() => total++);

  const numberAtKeys = Object.keys(cellMap);
  let allCorrect = true;
  document.querySelectorAll("#cwGrid > div").forEach((wrapper, idx) => {
    const input = wrapper.querySelector("input");
    if (!input) return;
  });

  // Direkter Abgleich über cellMap
  let anyWrong = false;
  const rowsColsInputs = document.querySelectorAll("#cwGrid input");
  // Wir gehen erneut über das Grid, um Position -> Eingabe zuzuordnen
  const { minRow, minCol, maxRow, maxCol } = bounds;
  let inputIndex = 0;
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = r + "," + c;
      if (cellMap[key] === undefined) continue;
      const input = rowsColsInputs[inputIndex];
      inputIndex++;
      const val = (input.value || "").toUpperCase();
      if (val === cellMap[key]) {
        input.style.background = "rgba(127,179,122,0.3)";
        correct++;
      } else if (val) {
        input.style.background = "rgba(209,125,110,0.3)";
        anyWrong = true;
      } else {
        anyWrong = true;
      }
      if (val) filled++;
    }
  }

  if (correct === total) {
    feedback.textContent = "Alle Felder richtig gelöst! 🎉";
    feedback.className = "feedback good";
  } else {
    feedback.textContent = `${correct} / ${total} Felder korrekt – weiter versuchen!`;
    feedback.className = "feedback bad";
  }
}

loadData("data.json").then(data => {
  wordPool = data.map(d => ({ word: d.word.toUpperCase(), clue: d.clue }));
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
