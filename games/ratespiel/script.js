const CATEGORIES = [
  { key: "personen", label: "Personen", icon: "🧑", file: "data/personen.json", desc: "Biblische Persönlichkeiten anhand von drei Hinweisen erraten." },
  { key: "orte", label: "Orte", icon: "🏞️", file: "data/orte.json", desc: "Bedeutende biblische Orte erraten." },
  { key: "symbole", label: "Symbole (Gleichnisse)", icon: "✨", file: "data/symbole.json", desc: "Welches Gleichnis steckt hinter den Symbolen?" },
  { key: "emoji", label: "Emoji-Geschichten", icon: "📖", file: "data/emoji-geschichten.json", desc: "Welche Bibelgeschichte zeigen die Emojis?" }
];

const SECONDS_PER_CLUE = 10; // alle X Sekunden ein neuer Tipp
const GRACE_SECONDS = 10;    // zusätzliche Zeit nach dem letzten Tipp

const app = document.getElementById("app");

let currentCategory = null;
let pool = [];
let sessionCorrect = 0;
let sessionRounds = 0;

let timerId = null;
let remaining = 0;
let totalTime = 0;
let revealedCount = 0;
let currentItem = null;

function renderCategoryPicker() {
  clearInterval(timerId);
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">Kategorie wählen</span>
    </div>
    <div class="grid">
      ${CATEGORIES.map(c => `
        <button class="window-card" style="cursor:pointer; border:1.5px solid #ddd3ba;" data-key="${c.key}">
          <div class="icon">${c.icon}</div>
          <h3>${c.label}</h3>
          <p>${c.desc}</p>
        </button>
      `).join("")}
    </div>
  `;
  CATEGORIES.forEach(c => {
    app.querySelector(`[data-key="${c.key}"]`).onclick = () => selectCategory(c);
  });
}

async function selectCategory(cat) {
  currentCategory = cat;
  sessionCorrect = 0;
  sessionRounds = 0;
  app.innerHTML = `<p>Lade ${cat.label}…</p>`;
  try {
    pool = await loadData(cat.file);
    startRound();
  } catch (err) {
    app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
  }
}

function startRound() {
  clearInterval(timerId);
  currentItem = pickRandom(pool, 1)[0];
  revealedCount = 1; // erster Tipp ist sofort sichtbar
  totalTime = currentItem.clues.length * SECONDS_PER_CLUE + GRACE_SECONDS;
  remaining = totalTime;
  renderRound();
  timerId = setInterval(tick, 1000);
}

function tick() {
  remaining--;
  const newRevealCount = Math.min(
    currentItem.clues.length,
    1 + Math.floor((totalTime - remaining) / SECONDS_PER_CLUE)
  );
  if (newRevealCount > revealedCount) {
    revealedCount = newRevealCount;
    renderClues();
  }
  updateTimerBar();
  if (remaining <= 0) {
    clearInterval(timerId);
    endRound(false);
  }
}

function renderRound() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">${currentCategory.icon} ${currentCategory.label}</span>
      <span class="pill">✔ ${sessionCorrect} / ${sessionRounds} Runden</span>
      <button class="btn secondary" id="switchBtn">Kategorie wechseln</button>
    </div>
    <div class="timer-bar"><div class="timer-fill" id="timerFill" style="width:100%"></div></div>
    <ul class="clue-list" id="clueList"></ul>
    <form id="guessForm" style="display:flex; gap:10px;">
      <input type="text" id="guessInput" placeholder="Deine Antwort…" autocomplete="off">
      <button type="submit" class="btn primary">Raten</button>
    </form>
    <div class="feedback" id="feedback"></div>
  `;
  document.getElementById("switchBtn").onclick = renderCategoryPicker;
  document.getElementById("guessForm").onsubmit = (e) => {
    e.preventDefault();
    submitGuess();
  };
  renderClues();
}

function renderClues() {
  const list = document.getElementById("clueList");
  if (!list) return;
  list.innerHTML = currentItem.clues
    .slice(0, revealedCount)
    .map((c, i) => `<li>Tipp ${i + 1}: ${c}</li>`)
    .join("");
}

function updateTimerBar() {
  const fill = document.getElementById("timerFill");
  if (!fill) return;
  const pct = Math.max(0, Math.round((remaining / totalTime) * 100));
  fill.style.width = pct + "%";
}

function submitGuess() {
  const input = document.getElementById("guessInput");
  const val = input.value;
  if (!val.trim()) return;
  if (answerMatches(val, currentItem.answer, currentItem.altAnswers)) {
    clearInterval(timerId);
    endRound(true);
  } else {
    const feedback = document.getElementById("feedback");
    feedback.textContent = "Noch nicht richtig – versuch's weiter!";
    feedback.className = "feedback bad";
    input.value = "";
    input.focus();
  }
}

function endRound(won) {
  sessionRounds++;
  if (won) sessionCorrect++;
  app.innerHTML = `
    <div class="result">
      <p class="pill">${won ? "Gewonnen! 🎉" : "Game Over ⏱️"}</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">
        Die Antwort war: ${currentItem.answer}
      </h2>
      <p>${won ? "Sehr gut erraten!" : "Die Zeit ist abgelaufen – aber du hast es fast geschafft."}</p>
      <p class="pill">Bilanz: ${sessionCorrect} / ${sessionRounds} Runden richtig</p>
      <div style="display:flex; gap:12px; justify-content:center; margin-top:18px; flex-wrap:wrap;">
        <button class="btn primary" id="nextBtn">Nächste Runde</button>
        <button class="btn secondary" id="switchBtn">Kategorie wechseln</button>
      </div>
    </div>
  `;
  document.getElementById("nextBtn").onclick = startRound;
  document.getElementById("switchBtn").onclick = renderCategoryPicker;
}

renderCategoryPicker();
