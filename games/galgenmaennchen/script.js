const MAX_WRONG = 6;
const KEYBOARD_ROWS = [
  "QWERTZUIOP",
  "ASDFGHJKL",
  "YXCVBNM",
  "ÄÖÜ"
];

const app = document.getElementById("app");

let all = [];
let current = null;
let guessed = new Set();
let wrongCount = 0;
let solved = 0;
let lost = 0;

function renderStart() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">${all.length} Begriffe im Pool</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">Bereit für eine Runde?</h2>
      <p>Errate den Begriff Buchstabe für Buchstabe. Bei 6 falschen Versuchen ist die Zeichnung komplett.</p>
      <button class="btn primary" id="startBtn">Spiel starten</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = () => { solved = 0; lost = 0; nextWord(); };
}

function nextWord() {
  current = pickRandom(all, 1)[0];
  guessed = new Set();
  wrongCount = 0;
  renderGame();
}

function renderGame() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">✔ ${solved} gelöst</span>
      <span class="pill">✖ ${lost} verloren</span>
      <span class="pill">Fehler: ${wrongCount} / ${MAX_WRONG}</span>
    </div>
    <div style="display:flex; justify-content:center; margin-bottom:10px;">${gallowsSVG()}</div>
    <p style="text-align:center; opacity:.75; margin-top:-4px;">💡 ${current.hint}</p>
    <p class="question-text" style="text-align:center; letter-spacing:.3em; font-size:28px;">${maskedWord()}</p>
    <div id="keyboard" style="display:flex; flex-direction:column; gap:8px; align-items:center;"></div>
    <div class="feedback" id="feedback" style="text-align:center;"></div>
  `;
  renderKeyboard();
  updateFeedback();
}

function maskedWord() {
  return current.word.split("").map(ch => (guessed.has(ch) ? ch : "_")).join(" ");
}

function renderKeyboard() {
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  const gameOver = wrongCount >= MAX_WRONG || isWon();
  KEYBOARD_ROWS.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.style.display = "flex";
    rowDiv.style.gap = "6px";
    row.split("").forEach(letter => {
      const btn = document.createElement("button");
      btn.className = "btn secondary";
      btn.style.minWidth = "38px";
      btn.style.padding = "8px 0";
      btn.textContent = letter;
      const used = guessed.has(letter);
      btn.disabled = used || gameOver;
      if (used) btn.style.opacity = "0.35";
      btn.onclick = () => guessLetter(letter);
      rowDiv.appendChild(btn);
    });
    kb.appendChild(rowDiv);
  });
}

function isWon() {
  return current.word.split("").every(ch => guessed.has(ch));
}

function guessLetter(letter) {
  if (guessed.has(letter)) return;
  guessed.add(letter);
  if (!current.word.includes(letter)) {
    wrongCount++;
  }
  if (isWon()) {
    solved++;
    endRound(true);
  } else if (wrongCount >= MAX_WRONG) {
    lost++;
    endRound(false);
  } else {
    renderGame();
  }
}

function endRound(won) {
  app.innerHTML = `
    <div style="display:flex; justify-content:center; margin-bottom:10px;">${gallowsSVG()}</div>
    <div class="result">
      <p class="pill">${won ? "Gewonnen! 🎉" : "Game Over 💀"}</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">${current.word}</h2>
      <p>${current.hint}</p>
      <p class="pill">Bilanz: ${solved} gelöst · ${lost} verloren</p>
      <button class="btn primary" id="nextBtn">Nächster Begriff</button>
    </div>
  `;
  document.getElementById("nextBtn").onclick = nextWord;
}

function updateFeedback() {
  const feedback = document.getElementById("feedback");
  if (!feedback) return;
  if (wrongCount === MAX_WRONG - 1) {
    feedback.textContent = "Letzter Versuch – pass auf!";
    feedback.className = "feedback bad";
  } else {
    feedback.textContent = "";
  }
}

function gallowsSVG() {
  const parts = ["head", "body", "armL", "armR", "legL", "legR"];
  const visible = new Set(parts.slice(0, wrongCount));
  const show = id => (visible.has(id) ? "1" : "0");
  return `
  <svg width="180" height="200" viewBox="0 0 180 200" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="190" x2="110" y2="190" stroke="#5a5236" stroke-width="6" stroke-linecap="round"/>
    <line x1="40" y1="190" x2="40" y2="15" stroke="#5a5236" stroke-width="6" stroke-linecap="round"/>
    <line x1="40" y1="15" x2="120" y2="15" stroke="#5a5236" stroke-width="6" stroke-linecap="round"/>
    <line x1="120" y1="15" x2="120" y2="40" stroke="#5a5236" stroke-width="4"/>
    <circle cx="120" cy="55" r="15" fill="none" stroke="#211d33" stroke-width="4" opacity="${show("head")}"/>
    <line x1="120" y1="70" x2="120" y2="115" stroke="#211d33" stroke-width="4" opacity="${show("body")}"/>
    <line x1="120" y1="80" x2="100" y2="100" stroke="#211d33" stroke-width="4" opacity="${show("armL")}"/>
    <line x1="120" y1="80" x2="140" y2="100" stroke="#211d33" stroke-width="4" opacity="${show("armR")}"/>
    <line x1="120" y1="115" x2="102" y2="150" stroke="#211d33" stroke-width="4" opacity="${show("legL")}"/>
    <line x1="120" y1="115" x2="138" y2="150" stroke="#211d33" stroke-width="4" opacity="${show("legR")}"/>
  </svg>`;
}

loadData("data.json").then(data => {
  all = data;
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
