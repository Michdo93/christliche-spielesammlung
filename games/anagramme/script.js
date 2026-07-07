const ROUND_SIZE = 10;
const app = document.getElementById("app");

let all = [];
let round = [];
let index = 0;
let correctCount = 0;
let hintUsed = false;

function renderStart() {
  const size = Math.min(ROUND_SIZE, all.length);
  app.innerHTML = `
    <div class="result">
      <p class="pill">${all.length} Begriffe im Pool</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">${size} Anagramme warten auf dich</h2>
      <p>Ordne die Buchstaben in Gedanken neu an und tippe das gesuchte Wort.</p>
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
  renderQuestion();
}

function renderQuestion() {
  const q = round[index];
  hintUsed = false;
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">Begriff ${index + 1} / ${round.length}</span>
      <span class="pill">✔ ${correctCount} richtig</span>
    </div>
    ${progressBarHTML(index, round.length)}
    <h2 class="question-text" style="letter-spacing:.12em; text-align:center;">${q.scrambled}</h2>
    <form id="answerForm" style="display:flex; gap:10px;">
      <input type="text" id="guessInput" placeholder="Deine Lösung…" autocomplete="off">
      <button type="submit" class="btn primary">Prüfen</button>
    </form>
    <div style="margin-top:12px;">
      <button class="btn secondary" id="hintBtn">💡 Tipp: ersten Buchstaben zeigen</button>
    </div>
    <div class="feedback" id="feedback"></div>
  `;
  document.getElementById("answerForm").onsubmit = (e) => {
    e.preventDefault();
    checkAnswer();
  };
  document.getElementById("hintBtn").onclick = showHint;
  document.getElementById("guessInput").focus();
}

function showHint() {
  hintUsed = true;
  const q = round[index];
  const feedback = document.getElementById("feedback");
  feedback.textContent = `Tipp: Das Wort beginnt mit „${q.answer[0]}“ und hat ${q.answer.length} Buchstaben.`;
  feedback.className = "feedback";
}

function checkAnswer() {
  const q = round[index];
  const val = document.getElementById("guessInput").value;
  const isCorrect = answerMatches(val, q.answer);
  const feedback = document.getElementById("feedback");
  document.getElementById("guessInput").disabled = true;
  document.querySelector("#answerForm button[type=submit]").disabled = true;
  document.getElementById("hintBtn").disabled = true;

  if (isCorrect) {
    feedback.textContent = `Richtig! ${q.answer} ✨` + (hintUsed ? " (mit Tipp)" : "");
    feedback.className = "feedback good";
    if (!hintUsed) correctCount++;
  } else {
    feedback.textContent = `Nicht ganz. Die Lösung ist: ${q.answer}`;
    feedback.className = "feedback bad";
  }

  setTimeout(() => {
    index++;
    if (index < round.length) {
      renderQuestion();
    } else {
      renderResult();
    }
  }, 1600);
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
