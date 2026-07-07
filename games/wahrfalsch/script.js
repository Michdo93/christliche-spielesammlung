const ROUND_SIZE = 10;

let all = [];
let round = [];
let index = 0;
let correctCount = 0;

const app = document.getElementById("app");

function renderStart() {
  const size = Math.min(ROUND_SIZE, all.length);
  app.innerHTML = `
    <div class="result">
      <p class="pill">${all.length} Aussagen im Pool</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">${size} Aussagen warten auf dich</h2>
      <p>Stimmt die Aussage oder nicht? Entscheide schnell und intuitiv.</p>
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
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">Aussage ${index + 1} / ${round.length}</span>
      <span class="pill">✔ ${correctCount} richtig</span>
    </div>
    ${progressBarHTML(index, round.length)}
    <h2 class="question-text">${q.statement}</h2>
    <div class="options">
      <button class="option-btn" id="trueBtn">✅ Wahr</button>
      <button class="option-btn" id="falseBtn">❌ Falsch</button>
    </div>
    <div class="feedback" id="feedback"></div>
  `;
  document.getElementById("trueBtn").onclick = () => answer(true);
  document.getElementById("falseBtn").onclick = () => answer(false);
}

function answer(choice) {
  const q = round[index];
  const trueBtn = document.getElementById("trueBtn");
  const falseBtn = document.getElementById("falseBtn");
  trueBtn.disabled = true;
  falseBtn.disabled = true;
  const feedback = document.getElementById("feedback");
  const rightBtn = q.answer ? trueBtn : falseBtn;
  const chosenBtn = choice ? trueBtn : falseBtn;

  if (choice === q.answer) {
    chosenBtn.classList.add("correct");
    feedback.textContent = "Richtig! 🙌";
    feedback.className = "feedback good";
    correctCount++;
  } else {
    chosenBtn.classList.add("wrong");
    rightBtn.classList.add("correct");
    feedback.textContent = "Leider falsch.";
    feedback.className = "feedback bad";
  }

  setTimeout(() => {
    index++;
    if (index < round.length) {
      renderQuestion();
    } else {
      renderResult();
    }
  }, 1100);
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
