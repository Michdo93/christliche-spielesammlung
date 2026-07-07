const ROUND_SIZE = 8;
const app = document.getElementById("app");

let all = [];
let round = [];
let index = 0;
let correctCount = 0;
let current = null;
let pool = [];      // { word, uid, used }
let placed = [];    // Liste von Referenzen auf Objekte aus pool

function renderStart() {
  const size = Math.min(ROUND_SIZE, all.length);
  app.innerHTML = `
    <div class="result">
      <p class="pill">${all.length} Verse im Pool</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">${size} Verse warten auf dich</h2>
      <p>Klicke die Wörter in der richtigen Reihenfolge an, um den Vers zusammenzusetzen.
      Ein Klick auf ein bereits gesetztes Wort nimmt es zurück in den Vorrat.</p>
      <button class="btn primary" id="startBtn">Runde starten</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = startRound;
}

function startRound() {
  const size = Math.min(ROUND_SIZE, all.length);
  round = pickRandom(all, size);
  index = 0;
  correctCount = 0;
  renderVerse();
}

function renderVerse() {
  current = round[index];
  const words = current.text.split(" ");
  pool = shuffle(words.map((w, i) => ({ word: w, uid: i + "-" + w, used: false })));
  placed = [];
  renderUI();
}

function renderUI() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">Vers ${index + 1} / ${round.length}</span>
      <span class="pill">✔ ${correctCount} richtig</span>
    </div>
    ${progressBarHTML(index, round.length)}
    <p style="opacity:.7; margin-bottom:4px;">${current.reference}</p>
    <div id="sentenceArea" style="min-height:70px; display:flex; flex-wrap:wrap; gap:8px; align-items:flex-start; background:#fffdf8; border:1.5px dashed #ddd3ba; border-radius:12px; padding:12px; margin-bottom:16px;"></div>
    <div id="poolArea" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
    <div class="feedback" id="feedback"></div>
    <div style="display:flex; gap:12px; margin-top:16px;">
      <button class="btn secondary" id="resetBtn">Zurücksetzen</button>
      <button class="btn primary" id="checkBtn">Prüfen</button>
    </div>
  `;
  document.getElementById("resetBtn").onclick = renderVerse;
  document.getElementById("checkBtn").onclick = checkVerse;
  renderChips();
}

function renderChips() {
  const sentenceArea = document.getElementById("sentenceArea");
  const poolArea = document.getElementById("poolArea");
  sentenceArea.innerHTML = "";
  poolArea.innerHTML = "";

  if (placed.length === 0) {
    sentenceArea.innerHTML = `<span style="opacity:.45;">Hier entsteht dein Satz…</span>`;
  }
  placed.forEach(item => {
    const chip = document.createElement("span");
    chip.className = "pill";
    chip.style.cursor = "pointer";
    chip.style.background = "rgba(216,171,92,0.25)";
    chip.textContent = item.word;
    chip.onclick = () => removeFromSentence(item);
    sentenceArea.appendChild(chip);
  });

  pool.filter(p => !p.used).forEach(item => {
    const chip = document.createElement("span");
    chip.className = "pill";
    chip.style.cursor = "pointer";
    chip.textContent = item.word;
    chip.onclick = () => addToSentence(item);
    poolArea.appendChild(chip);
  });
}

function addToSentence(item) {
  item.used = true;
  placed.push(item);
  renderChips();
}

function removeFromSentence(item) {
  item.used = false;
  placed = placed.filter(p => p !== item);
  renderChips();
}

function checkVerse() {
  const guess = placed.map(p => p.word).join(" ");
  const feedback = document.getElementById("feedback");
  document.getElementById("checkBtn").disabled = true;
  document.getElementById("resetBtn").disabled = true;
  document.querySelectorAll("#poolArea span, #sentenceArea span").forEach(s => (s.onclick = null));

  if (guess === current.text) {
    correctCount++;
    feedback.textContent = "Richtig! 🙌";
    feedback.className = "feedback good";
  } else {
    feedback.innerHTML = `Nicht ganz. Der richtige Vers lautet:<br><strong>${current.text}</strong>`;
    feedback.className = "feedback bad";
  }

  const cont = document.createElement("div");
  cont.style.marginTop = "16px";
  cont.innerHTML = `<button class="btn primary" id="nextBtn">${index + 1 < round.length ? "Nächster Vers" : "Ergebnis anzeigen"}</button>`;
  app.appendChild(cont);
  document.getElementById("nextBtn").onclick = () => {
    index++;
    if (index < round.length) renderVerse();
    else renderResult();
  };
}

function renderResult() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">Ergebnis</p>
      <div class="score">${correctCount} / ${round.length}</div>
      <p>${scoreMessage(correctCount, round.length)}</p>
      <button class="btn primary" id="againBtn">Neue Runde</button>
    </div>
  `;
  document.getElementById("againBtn").onclick = renderStart;
}

loadData("data.json").then(data => {
  all = data;
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
