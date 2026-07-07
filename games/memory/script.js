const DIFFICULTIES = [
  { key: "klein", label: "Klein (6 Paare)", pairs: 6 },
  { key: "mittel", label: "Mittel (8 Paare)", pairs: 8 },
  { key: "gross", label: "Groß (alle Paare)", pairs: 99 }
];

const app = document.getElementById("app");
let symbols = [];
let cards = [];
let flipped = [];
let matchedCount = 0;
let moves = 0;
let lockBoard = false;
let startTime = null;
let timerId = null;
let currentDifficulty = null;

function renderDifficultyPicker() {
  clearInterval(timerId);
  app.innerHTML = `
    <div class="game-toolbar"><span class="pill">Schwierigkeit wählen</span></div>
    <div class="grid">
      ${DIFFICULTIES.map(d => `
        <button class="window-card" style="cursor:pointer; border:1.5px solid #ddd3ba;" data-key="${d.key}">
          <div class="icon">🧠</div>
          <h3>${d.label}</h3>
          <p>${Math.min(d.pairs, symbols.length)} Paare · ${Math.min(d.pairs, symbols.length) * 2} Karten</p>
        </button>
      `).join("")}
    </div>
  `;
  DIFFICULTIES.forEach(d => {
    app.querySelector(`[data-key="${d.key}"]`).onclick = () => startGame(d);
  });
}

function startGame(diff) {
  currentDifficulty = diff;
  const pairCount = Math.min(diff.pairs, symbols.length);
  const chosen = pickRandom(symbols, pairCount);
  const deck = shuffle([...chosen, ...chosen].map((s, i) => ({ ...s, uid: i + "-" + s.symbol })));
  cards = deck;
  flipped = [];
  matchedCount = 0;
  moves = 0;
  lockBoard = false;
  startTime = Date.now();
  renderBoard();
  clearInterval(timerId);
  timerId = setInterval(updateTimerDisplay, 1000);
}

function elapsedSeconds() {
  return Math.floor((Date.now() - startTime) / 1000);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderBoard() {
  const pairCount = cards.length / 2;
  const cols = pairCount <= 6 ? 4 : pairCount <= 8 ? 4 : 6;
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">✔ ${matchedCount} / ${pairCount} Paare</span>
      <span class="pill">🔁 ${moves} Züge</span>
      <span class="pill" id="timerPill">⏱️ 00:00</span>
      <button class="btn secondary" id="switchBtn">Schwierigkeit wechseln</button>
    </div>
    ${progressBarHTML(matchedCount, pairCount)}
    <div id="memGrid" style="display:grid; grid-template-columns: repeat(${cols}, 1fr); gap:10px;"></div>
  `;
  document.getElementById("switchBtn").onclick = renderDifficultyPicker;
  const grid = document.getElementById("memGrid");
  cards.forEach(card => {
    const el = document.createElement("div");
    el.className = "memory-card";
    el.dataset.uid = card.uid;
    el.innerHTML = `
      <div class="memory-card-inner">
        <div class="memory-face memory-back">?</div>
        <div class="memory-face memory-front">${card.symbol}</div>
      </div>
    `;
    el.onclick = () => flipCard(card, el);
    grid.appendChild(el);
  });
}

function updateTimerDisplay() {
  const pill = document.getElementById("timerPill");
  if (pill) pill.textContent = "⏱️ " + formatTime(elapsedSeconds());
}

function flipCard(card, el) {
  if (lockBoard || el.classList.contains("flipped") || el.classList.contains("matched")) return;
  el.classList.add("flipped");
  flipped.push({ card, el });

  if (flipped.length === 2) {
    moves++;
    lockBoard = true;
    const [a, b] = flipped;
    if (a.card.symbol === b.card.symbol) {
      setTimeout(() => {
        a.el.classList.add("matched");
        b.el.classList.add("matched");
        matchedCount++;
        flipped = [];
        lockBoard = false;
        document.querySelectorAll(".pill")[0].textContent = `✔ ${matchedCount} / ${cards.length / 2} Paare`;
        document.querySelectorAll(".pill")[1].textContent = `🔁 ${moves} Züge`;
        document.querySelector(".progress-fill").style.width = Math.round((matchedCount / (cards.length / 2)) * 100) + "%";
        if (matchedCount === cards.length / 2) {
          clearInterval(timerId);
          setTimeout(renderResult, 500);
        }
      }, 500);
    } else {
      setTimeout(() => {
        a.el.classList.remove("flipped");
        b.el.classList.remove("flipped");
        flipped = [];
        lockBoard = false;
        document.querySelectorAll(".pill")[1].textContent = `🔁 ${moves} Züge`;
      }, 900);
    }
  }
}

function renderResult() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">Geschafft! 🎉</p>
      <div class="score">${moves} Züge</div>
      <p>Zeit: ${formatTime(elapsedSeconds())}</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn primary" id="againBtn">Neue Runde</button>
        <button class="btn secondary" id="switchBtn">Schwierigkeit wechseln</button>
      </div>
    </div>
  `;
  document.getElementById("againBtn").onclick = () => startGame(currentDifficulty);
  document.getElementById("switchBtn").onclick = renderDifficultyPicker;
}

loadData("data.json").then(data => {
  symbols = data;
  renderDifficultyPicker();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
