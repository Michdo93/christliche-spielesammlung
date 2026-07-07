const MODES = [
  { key: "luecken", label: "Lückentext", icon: "✏️", file: "data/luecken.json", desc: "Fülle die Lücken im Satz aus." },
  { key: "zahlen", label: "Bibel-Zahlen", icon: "🔢", file: "data/zahlen.json", desc: "Wie viele...? Tippe die Zahl oder Antwort." },
  { key: "verse", label: "Vers ergänzen", icon: "📜", file: "data/verse.json", desc: "Führe den Bibelvers zu Ende." }
];

const ROUND_SIZE = 10;
const app = document.getElementById("app");

let mode = null;
let all = [];
let round = [];
let index = 0;
let correctCount = 0;

function renderModePicker() {
  app.innerHTML = `
    <div class="game-toolbar"><span class="pill">Modus wählen</span></div>
    <div class="grid">
      ${MODES.map(m => `
        <button class="window-card" style="cursor:pointer; border:1.5px solid #ddd3ba;" data-key="${m.key}">
          <div class="icon">${m.icon}</div>
          <h3>${m.label}</h3>
          <p>${m.desc}</p>
        </button>
      `).join("")}
    </div>
  `;
  MODES.forEach(m => {
    app.querySelector(`[data-key="${m.key}"]`).onclick = () => selectMode(m);
  });
}

async function selectMode(m) {
  mode = m;
  app.innerHTML = `<p>Lade ${m.label}…</p>`;
  try {
    all = await loadData(m.file);
    startRound();
  } catch (err) {
    app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
  }
}

function startRound() {
  const size = Math.min(ROUND_SIZE, all.length);
  round = pickRandom(all, size);
  index = 0;
  correctCount = 0;
  renderQuestion();
}

function renderQuestion() {
  const q = round[index];
  let bodyHTML = "";
  if (mode.key === "luecken") {
    const parts = q.text.split("___");
    bodyHTML = `<p class="question-text" style="font-size:19px;">` + parts
      .map((part, i) => {
        if (i === parts.length - 1) return escapeHTML(part);
        return escapeHTML(part) + `<input type="text" class="blank-input" data-i="${i}" style="width:130px; display:inline-block; margin:0 4px;">`;
      })
      .join("") + `</p>`;
  } else if (mode.key === "zahlen") {
    bodyHTML = `<p class="question-text">${escapeHTML(q.question)}</p>
      <input type="text" id="singleInput" placeholder="Deine Antwort…" autocomplete="off">`;
  } else if (mode.key === "verse") {
    bodyHTML = `<p class="question-text">„${escapeHTML(q.start)}“</p>
      <p style="opacity:.7; margin-top:-10px;">Wie geht der Vers weiter?</p>
      <input type="text" id="singleInput" placeholder="…dass er seinen…" autocomplete="off">`;
  }

  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">${mode.icon} ${mode.label}</span>
      <span class="pill">Frage ${index + 1} / ${round.length}</span>
      <span class="pill">✔ ${correctCount} richtig</span>
      <button class="btn secondary" id="switchBtn">Modus wechseln</button>
    </div>
    ${progressBarHTML(index, round.length)}
    <form id="answerForm">
      ${bodyHTML}
      <button type="submit" class="btn primary" style="margin-top:16px;">Prüfen</button>
    </form>
    <div class="feedback" id="feedback"></div>
  `;
  document.getElementById("switchBtn").onclick = renderModePicker;
  document.getElementById("answerForm").onsubmit = (e) => {
    e.preventDefault();
    checkAnswer();
  };
  const firstInput = app.querySelector("input");
  if (firstInput) firstInput.focus();
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function checkAnswer() {
  const q = round[index];
  let isCorrect = false;

  if (mode.key === "luecken") {
    const inputs = Array.from(document.querySelectorAll(".blank-input"));
    isCorrect = inputs.every((inp, i) => answerMatches(inp.value, q.blanks[i]));
  } else {
    const val = document.getElementById("singleInput").value;
    isCorrect = answerMatches(val, q.answer, q.altAnswers);
  }

  const feedback = document.getElementById("feedback");
  document.querySelectorAll("input").forEach(i => (i.disabled = true));

  if (isCorrect) {
    feedback.textContent = "Richtig! 🙌";
    feedback.className = "feedback good";
    correctCount++;
  } else {
    let solutionText;
    if (mode.key === "luecken") solutionText = q.blanks.join(", ");
    else if (mode.key === "verse") solutionText = `${q.answer} (${q.reference})`;
    else solutionText = q.answer;
    feedback.textContent = `Nicht ganz. Richtige Antwort: ${solutionText}`;
    feedback.className = "feedback bad";
  }

  const btn = document.querySelector("#answerForm button[type=submit]");
  if (btn) btn.disabled = true;

  setTimeout(() => {
    index++;
    if (index < round.length) {
      renderQuestion();
    } else {
      renderResult();
    }
  }, 1800);
}

function renderResult() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">Ergebnis – ${mode.label}</p>
      <div class="score">${correctCount} / ${round.length}</div>
      <p>${scoreMessage(correctCount, round.length)}</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn primary" id="againBtn">Neue Runde</button>
        <button class="btn secondary" id="switchBtn">Modus wechseln</button>
      </div>
    </div>
  `;
  document.getElementById("againBtn").onclick = startRound;
  document.getElementById("switchBtn").onclick = renderModePicker;
}

renderModePicker();
