const ROUND_SIZE = 15; // wie viele Fragen pro Runde (aus N möglichen)

let allQuestions = [];
let round = [];
let index = 0;
let correctCount = 0;

const app = document.getElementById("app");

function renderStart() {
  const total = allQuestions.length;
  const size = Math.min(ROUND_SIZE, total);
  app.innerHTML = `
    <div class="result">
      <p class="pill">${total} Fragen im Pool</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">Bereit für ${size} Fragen?</h2>
      <p>Jede Runde wählt zufällig ${size} von aktuell ${total} Fragen aus. Füge einfach weitere
      Fragen zu <code>data.json</code> hinzu, um den Pool zu vergrößern.</p>
      <button class="btn primary" id="startBtn">Quiz starten</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = startRound;
}

function startRound() {
  const size = Math.min(ROUND_SIZE, allQuestions.length);
  round = pickRandom(allQuestions, size).map(q => {
    // Antwortoptionen mischen, damit die richtige Antwort nicht immer an gleicher Stelle steht
    const correctText = q.options[q.answer];
    const shuffledOptions = shuffle(q.options);
    return {
      question: q.question,
      options: shuffledOptions,
      answerIndex: shuffledOptions.indexOf(correctText)
    };
  });
  index = 0;
  correctCount = 0;
  renderQuestion();
}

function renderQuestion() {
  const q = round[index];
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">Frage ${index + 1} / ${round.length}</span>
      <span class="pill">✔ ${correctCount} richtig</span>
    </div>
    ${progressBarHTML(index, round.length)}
    <h2 class="question-text">${q.question}</h2>
    <div class="options" id="options"></div>
    <div class="feedback" id="feedback"></div>
  `;
  const optsEl = document.getElementById("options");
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(i);
    optsEl.appendChild(btn);
  });
}

function selectAnswer(i) {
  const q = round[index];
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach(b => (b.disabled = true));
  const feedback = document.getElementById("feedback");
  if (i === q.answerIndex) {
    buttons[i].classList.add("correct");
    feedback.textContent = "Richtig! 🙌";
    feedback.className = "feedback good";
    correctCount++;
  } else {
    buttons[i].classList.add("wrong");
    buttons[q.answerIndex].classList.add("correct");
    feedback.textContent = "Leider falsch – die richtige Antwort ist markiert.";
    feedback.className = "feedback bad";
  }
  setTimeout(() => {
    index++;
    if (index < round.length) {
      renderQuestion();
    } else {
      renderResult();
    }
  }, 1300);
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
  allQuestions = data;
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden der Fragen: ${err.message}</p>`;
});
