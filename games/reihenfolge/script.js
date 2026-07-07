const app = document.getElementById("app");

let all = [];
let current = null;
let sourceItems = [];   // noch nicht platzierte Items (durcheinander)
let placedItems = [];   // in der vom Nutzer gewählten Reihenfolge
let solved = 0;
let tries = 0;

function renderStart() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">${all.length} Rätsel im Pool</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">Bereit für ein Buchstabenrätsel?</h2>
      <p>Klicke die Ereignisse in der richtigen Reihenfolge an – jeder Anfangsbuchstabe ergibt
      am Ende ein Lösungswort.</p>
      <button class="btn primary" id="startBtn">Los geht's</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = nextPuzzle;
}

function nextPuzzle() {
  current = pickRandom(all, 1)[0];
  sourceItems = shuffle(current.items.map((it, i) => ({ ...it, origIndex: i })));
  placedItems = [];
  renderPuzzle();
}

function renderPuzzle() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">🔤 ${current.items.length} Ereignisse</span>
      <span class="pill">✔ ${solved} gelöst</span>
    </div>
    <p style="opacity:.8; margin-top:0;">Klicke die Ereignisse in der richtigen zeitlichen Reihenfolge an.</p>
    <div id="placedList" style="display:flex; flex-direction:column; gap:8px; margin-bottom:18px;"></div>
    <div id="sourceList" class="options"></div>
    <div class="feedback" id="feedback"></div>
    <div style="display:flex; gap:12px; margin-top:16px;">
      <button class="btn secondary" id="undoBtn">Letzten zurücknehmen</button>
      <button class="btn primary" id="checkBtn" ${placedItems.length === current.items.length ? "" : "disabled"}>Prüfen</button>
    </div>
  `;
  document.getElementById("undoBtn").onclick = undoLast;
  document.getElementById("checkBtn").onclick = checkOrder;
  renderLists();
}

function renderLists() {
  const placedEl = document.getElementById("placedList");
  placedEl.innerHTML = placedItems.map((it, i) =>
    `<div class="match-item matched">${i + 1}. ${it.letter} — ${it.text}</div>`
  ).join("") || `<p style="opacity:.5;">Noch nichts ausgewählt…</p>`;

  const sourceEl = document.getElementById("sourceList");
  sourceEl.innerHTML = "";
  sourceItems.forEach(it => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = it.text;
    btn.onclick = () => placeItem(it);
    sourceEl.appendChild(btn);
  });
  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) checkBtn.disabled = sourceItems.length !== 0;
}

function placeItem(item) {
  placedItems.push(item);
  sourceItems = sourceItems.filter(it => it !== item);
  renderLists();
}

function undoLast() {
  if (!placedItems.length) return;
  const last = placedItems.pop();
  sourceItems.push(last);
  renderLists();
}

function checkOrder() {
  tries++;
  const correctOrder = placedItems.map(it => it.origIndex);
  const isCorrect = correctOrder.every((v, i) => v === i);
  const guessedWord = placedItems.map(it => it.letter).join("");
  const feedback = document.getElementById("feedback");

  if (isCorrect) {
    solved++;
    feedback.textContent = `Richtig! Lösungswort: ${current.solutionWord} 🎉`;
    feedback.className = "feedback good";
  } else {
    feedback.textContent = `Noch nicht ganz richtig (dein Wort: ${guessedWord}). Die Lösung ist: ${current.solutionWord}.`;
    feedback.className = "feedback bad";
  }

  document.querySelectorAll("#sourceList button, #checkBtn, #undoBtn").forEach(b => (b.disabled = true));

  const cont = document.createElement("div");
  cont.style.marginTop = "16px";
  cont.innerHTML = `<button class="btn primary" id="nextBtn">Nächstes Rätsel</button>`;
  app.appendChild(cont);
  document.getElementById("nextBtn").onclick = nextPuzzle;
}

loadData("data.json").then(data => {
  all = data;
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
